import type { Handler } from "@netlify/functions";
import crypto from "crypto";

const sigHeader = "x-square-hmacsha256-signature";

function timingSafeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function enc(v: string) {
  return encodeURIComponent(v);
}

async function sbFetch(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, text, json };
}

export const handler: Handler = async (event) => {
  const body = event.body || "";

  const headers = Object.fromEntries(
    Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v])
  );

  // 1) verify Square signature
  const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "";
  const theirSig = (headers[sigHeader] as string) || "";
  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL || "";
  const msg = notificationUrl + body;

  if (secret && notificationUrl && theirSig) {
    const ours = crypto.createHmac("sha256", secret).update(msg).digest("base64");
    if (!timingSafeEq(ours, theirSig)) {
      console.log("BAD SIGNATURE");
      return { statusCode: 401, body: "bad signature" };
    }
  }

  const payload = body ? JSON.parse(body) : {};
  const type = payload?.type;

  // Award only on payment.updated COMPLETED
  if (type !== "payment.updated") {
    return { statusCode: 200, body: JSON.stringify({ ok: true, ignored: type }) };
  }

  const payment = payload?.data?.object?.payment;
  const status = payment?.status;
  if (status !== "COMPLETED") {
    return { statusCode: 200, body: JSON.stringify({ ok: true, payment_status: status }) };
  }

  const amountCents = Number(payment?.amount_money?.amount ?? 0);
  const points = Math.floor(amountCents / 100);
  const customerId = payment?.customer_id || null;

  const squarePaymentId = payment?.id || null;
  const squareOrderId = payment?.order_id || null;

  const ref_id = `square:${payload?.event_id || squarePaymentId || Date.now()}`;

  const SUPABASE_URL = process.env.SUPABASE_URL || "";
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }) };
  }

  // Need customer attached in POS to map automatically
  if (!customerId) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, needs_customer_attached_in_pos: true, ref_id }) };
  }

  const sbHeaders = {
    apikey: SERVICE_ROLE,
    Authorization: `Bearer ${SERVICE_ROLE}`,
    "Content-Type": "application/json",
  };

  // A) try mapping table first
  let userId: string | null = null;
  let email: string | null = null;

  {
    const url = `${SUPABASE_URL}/rest/v1/square_customer_map?square_customer_id=eq.${enc(customerId)}&select=user_id,email`;
    const r = await sbFetch(url, { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } });
    if (r.ok && Array.isArray(r.json) && r.json[0]) {
      userId = r.json[0].user_id;
      email = r.json[0].email ?? null;
    }
  }

  // B) if no map, fetch Square customer email, then match users_profile by email, then upsert map
  if (!userId) {
    const squareEnv = (process.env.SQUARE_ENV || "sandbox").toLowerCase();
    const squareToken =
      squareEnv === "production"
        ? (process.env.SQUARE_ACCESS_TOKEN || "")
        : (process.env.SQUARE_SANDBOX_ACCESS_TOKEN || "");

    const squareBase =
      squareEnv === "production"
        ? "https://connect.squareup.com"
        : "https://connect.squareupsandbox.com";

    if (squareToken) {
      const apiVersion = process.env.SQUARE_API_VERSION || "2025-08-20";
      const c = await sbFetch(`${squareBase}/v2/customers/${enc(customerId)}`, {
        headers: {
          Authorization: `Bearer ${squareToken}`,
          "Square-Version": apiVersion,
          Accept: "application/json",
        },
      });

      if (c.ok) {
        email = c.json?.customer?.email_address || null;
      }
    }

    if (email) {
      // find user by email
      const u = await sbFetch(
        `${SUPABASE_URL}/rest/v1/users_profile?email=eq.${enc(email)}&select=user_id,email`,
        { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } }
      );

      if (u.ok && Array.isArray(u.json) && u.json[0]) {
        userId = u.json[0].user_id;

        // upsert mapping
        await sbFetch(`${SUPABASE_URL}/rest/v1/square_customer_map`, {
          method: "POST",
          headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify([{ square_customer_id: customerId, user_id: userId, email }]),
        });
      }
    }
  }

  if (!userId) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, needs_user_signup_or_email_match: true, customerId, ref_id }) };
  }

  // C) insert ledger (idempotent via uniq ref_id index)
  {
    const ins = await sbFetch(`${SUPABASE_URL}/rest/v1/loyalty_ledger`, {
      method: "POST",
      headers: sbHeaders,
      body: JSON.stringify([{ user_id: userId, delta_points: points, reason: "square_payment", ref_id }]),
    });

    // 409 = duplicate ref_id (already processed) -> treat as OK
    if (!ins.ok && ins.status !== 409) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, step: "ledger_insert", status: ins.status, body: ins.text }) };
    }
    if (ins.status === 409) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, already_processed: true, ref_id }) };
    }
  }

  // D) update balance (GET then PATCH)
  {
    const cur = await sbFetch(
      `${SUPABASE_URL}/rest/v1/loyalty_balances?user_id=eq.${enc(userId)}&select=points`,
      { headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } }
    );

    const currentPoints = (cur.ok && Array.isArray(cur.json) && cur.json[0]?.points != null)
      ? Number(cur.json[0].points)
      : 0;

    const newPoints = currentPoints + points;

    // ensure row exists (upsert), then set points
    await sbFetch(`${SUPABASE_URL}/rest/v1/loyalty_balances`, {
      method: "POST",
      headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify([{ user_id: userId, points: newPoints }]),
    });
  }

  // E) shadow order record (best-effort)
  {
    await sbFetch(`${SUPABASE_URL}/rest/v1/orders_shadow`, {
      method: "POST",
      headers: sbHeaders,
      body: JSON.stringify([{
        user_id: userId,
        square_order_id: squareOrderId,
        square_payment_id: squarePaymentId,
        amount_money_cents: amountCents,
        points_earned: points
      }]),
    });
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, user_id: userId, points_awarded: points, ref_id, squareOrderId, squarePaymentId }),
  };
};
