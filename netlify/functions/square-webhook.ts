import type { Handler } from "@netlify/functions";
import crypto from "crypto";

const SIG_HEADER = "x-square-hmacsha256-signature";

function timingSafeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function enc(v: string) {
  return encodeURIComponent(v);
}

type Json = any;

async function readBody(event: any): Promise<string> {
  if (event.isBase64Encoded && event.body) {
    return Buffer.from(event.body, "base64").toString("utf8");
  }
  return event.body || "";
}

async function safeJsonParse(s: string): Promise<Json> {
  try { return s ? JSON.parse(s) : {}; } catch { return {}; }
}

async function fetchJson(url: string, init: RequestInit): Promise<{ ok: boolean; status: number; json: any; text: string; }> {
  const res = await fetch(url, init);
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { ok: res.ok, status: res.status, json, text };
}

export const handler: Handler = async (event) => {
  const requestId = crypto.randomUUID?.() || String(Date.now());
  const body = await readBody(event);

  // 1) Verify Square signature (do NOT disable in production)
  const headers = Object.fromEntries(Object.entries(event.headers || {}).map(([k, v]) => [String(k).toLowerCase(), v]));
  const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "";
  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL || "";
  const theirSig = (headers[SIG_HEADER] as string) || "";

  // message = notificationUrl + raw body (Square requirement)
  const msg = notificationUrl + body;

  if (secret && notificationUrl && theirSig) {
    const ours = crypto.createHmac("sha256", secret).update(msg).digest("base64");
    if (!timingSafeEq(ours, theirSig)) {
      console.log("[square-webhook] BAD_SIGNATURE", { requestId });
      return { statusCode: 401, body: JSON.stringify({ ok: false, step: "signature", requestId }) };
    }
  } else {
    // If any of these are missing, we cannot verify; log loudly.
    console.log("[square-webhook] SIGNATURE_VERIFY_SKIPPED", {
      requestId,
      hasSecret: !!secret,
      hasNotificationUrl: !!notificationUrl,
      hasSignatureHeader: !!theirSig,
    });
  }

  const payload = await safeJsonParse(body);
  const eventType = payload?.type || "";
  const eventId = payload?.event_id || "";

  // We only award on payment.updated COMPLETED
  if (eventType !== "payment.updated") {
    console.log("[square-webhook] IGNORE_TYPE", { requestId, eventType, eventId });
    return { statusCode: 200, body: JSON.stringify({ ok: true, ignored: true, reason: "type", eventType, requestId }) };
  }

  const payment = payload?.data?.object?.payment || {};
  const paymentStatus = payment?.status || "";
  const amountCents = Number(payment?.amount_money?.amount || 0);
  const currency = payment?.amount_money?.currency || "";
  const customerId = payment?.customer_id || "";
  const squarePaymentId = payment?.id || "";
  const squareOrderId = payment?.order_id || "";

  if (paymentStatus !== "COMPLETED") {
    console.log("[square-webhook] IGNORE_STATUS", { requestId, eventId, squarePaymentId, paymentStatus });
    return { statusCode: 200, body: JSON.stringify({ ok: true, ignored: true, reason: "status", paymentStatus, requestId }) };
  }

  // points: $1 = 1 point (floor)
  const points = Math.floor(amountCents / 100);

  // Idempotency key
  const ref_id = eventId ? `square:${eventId}` : (squarePaymentId ? `square:payment:${squarePaymentId}` : `square:fallback:${Date.now()}`);

  console.log("[square-webhook] START", {
    requestId, eventId, ref_id, squarePaymentId, squareOrderId, amountCents, currency, points,
    hasCustomerId: !!customerId
  });

  // 2) Supabase config
  const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.log("[square-webhook] MISSING_SUPABASE_ENV", { requestId, hasUrl: !!SUPABASE_URL, hasServiceRole: !!SERVICE_ROLE });
    return { statusCode: 500, body: JSON.stringify({ ok: false, step: "env", requestId }) };
  }

  const sbHeaders: Record<string, string> = {
    apikey: SERVICE_ROLE,
    Authorization: `Bearer ${SERVICE_ROLE}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const steps: any[] = [];
  let userId: string | null = null;
  let email: string | null = null;
  let mapped_by: "square_customer_map" | "email_match" | "none" = "none";

  // 3) If no customer_id, we cannot map (return OK + signal)
  if (!customerId) {
    console.log("[square-webhook] NO_CUSTOMER_ID", { requestId, eventId, squarePaymentId, ref_id });
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        needs_customer_mapping: true,
        reason: "payment.customer_id_missing",
        requestId,
        eventId,
        squarePaymentId,
        ref_id
      }),
    };
  }

  // 4) Try existing square_customer_map
  {
    const url = `${SUPABASE_URL}/rest/v1/square_customer_map?square_customer_id=eq.${enc(customerId)}&select=user_id,email&limit=1`;
    const r = await fetchJson(url, { method: "GET", headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } });
    steps.push({ step: "read_square_customer_map", ok: r.ok, status: r.status });

    if (r.ok && Array.isArray(r.json) && r.json[0]?.user_id) {
      userId = String(r.json[0].user_id);
      email = r.json[0].email ?? null;
      mapped_by = "square_customer_map";
    }
  }

  // 5) If no map, fetch Square customer email (sandbox only unless prod token exists)
  if (!userId) {
    const squareEnv = String(process.env.SQUARE_ENV || "sandbox").toLowerCase();
    const isProd = squareEnv === "production";

    const token = isProd
      ? (process.env.SQUARE_ACCESS_TOKEN || "")  // optional; not in your env list; sandbox is your focus
      : (process.env.SQUARE_SANDBOX_ACCESS_TOKEN || "");

    const base = isProd ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";

    if (!token) {
      console.log("[square-webhook] NO_SQUARE_TOKEN_FOR_EMAIL_LOOKUP", { requestId, squareEnv });
      steps.push({ step: "square_customer_lookup", ok: false, status: 0, reason: "missing_token" });
    } else {
      const url = `${base}/v2/customers/${enc(customerId)}`;
      const c = await fetchJson(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      steps.push({ step: "square_customer_lookup", ok: c.ok, status: c.status });

      if (c.ok) {
        email = c.json?.customer?.email_address || null;
      }
    }

    // 6) If we got email, match users_profile by email, then upsert map
    if (email) {
      const u = await fetchJson(
        `${SUPABASE_URL}/rest/v1/users_profile?email=eq.${enc(email)}&select=user_id,email&limit=1`,
        { method: "GET", headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } }
      );
      steps.push({ step: "read_users_profile_by_email", ok: u.ok, status: u.status });

      if (u.ok && Array.isArray(u.json) && u.json[0]?.user_id) {
        userId = String(u.json[0].user_id);
        mapped_by = "email_match";

        // upsert square_customer_map
        const up = await fetchJson(`${SUPABASE_URL}/rest/v1/square_customer_map`, {
          method: "POST",
          headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify([{ square_customer_id: customerId, user_id: userId, email }]),
        });
        steps.push({ step: "upsert_square_customer_map", ok: up.ok, status: up.status });
      }
    }
  }

  if (!userId) {
    console.log("[square-webhook] NO_USER_MATCH", { requestId, customerId, email, ref_id });
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        needs_user_signup_or_email_match: true,
        requestId,
        customerId,
        email,
        ref_id
      }),
    };
  }

  // 7) Idempotency pre-check (works even if you don't have a unique constraint on ref_id)
  {
    const chk = await fetchJson(
      `${SUPABASE_URL}/rest/v1/loyalty_ledger?ref_id=eq.${enc(ref_id)}&select=ref_id&limit=1`,
      { method: "GET", headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } }
    );
    steps.push({ step: "ledger_refid_precheck", ok: chk.ok, status: chk.status });

    if (chk.ok && Array.isArray(chk.json) && chk.json[0]?.ref_id) {
      console.log("[square-webhook] ALREADY_PROCESSED", { requestId, ref_id, userId });
      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          already_processed: true,
          mapped_by,
          user_id: userId,
          points_awarded: 0,
          ref_id,
          requestId,
          steps
        }),
      };
    }
  }

  // 8) Insert ledger row
  {
    const ins = await fetchJson(`${SUPABASE_URL}/rest/v1/loyalty_ledger`, {
      method: "POST",
      headers: sbHeaders,
      body: JSON.stringify([{ user_id: userId, delta_points: points, reason: "square_payment", ref_id }]),
    });
    steps.push({ step: "ledger_insert", ok: ins.ok, status: ins.status });

    if (!ins.ok) {
      console.log("[square-webhook] LEDGER_INSERT_FAILED", { requestId, status: ins.status });
      return { statusCode: 500, body: JSON.stringify({ ok: false, step: "ledger_insert", status: ins.status, requestId, steps }) };
    }
  }

  // 9) Update balance (GET then UPSERT with merge-duplicates)
  {
    const cur = await fetchJson(
      `${SUPABASE_URL}/rest/v1/loyalty_balances?user_id=eq.${enc(userId)}&select=points&limit=1`,
      { method: "GET", headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` } }
    );
    steps.push({ step: "read_balance", ok: cur.ok, status: cur.status });

    const currentPoints =
      (cur.ok && Array.isArray(cur.json) && cur.json[0]?.points != null) ? Number(cur.json[0].points) : 0;

    const newPoints = currentPoints + points;

    const up = await fetchJson(`${SUPABASE_URL}/rest/v1/loyalty_balances`, {
      method: "POST",
      headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify([{ user_id: userId, points: newPoints }]),
    });
    steps.push({ step: "upsert_balance", ok: up.ok, status: up.status });

    if (!up.ok) {
      console.log("[square-webhook] BALANCE_UPSERT_FAILED", { requestId, status: up.status });
      return { statusCode: 500, body: JSON.stringify({ ok: false, step: "balance", status: up.status, requestId, steps }) };
    }
  }

  // 10) orders_shadow best-effort
  {
    const os = await fetchJson(`${SUPABASE_URL}/rest/v1/orders_shadow`, {
      method: "POST",
      headers: sbHeaders,
      body: JSON.stringify([{
        user_id: userId,
        square_order_id: squareOrderId || null,
        square_payment_id: squarePaymentId || null,
        amount_money_cents: amountCents,
        points_earned: points,
        ref_id
      }]),
    });
    steps.push({ step: "orders_shadow_insert", ok: os.ok, status: os.status });
  }

  console.log("[square-webhook] OK", { requestId, userId, points, ref_id, mapped_by });

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      requestId,
      mapped_by,
      user_id: userId,
      points_awarded: points,
      ref_id,
      squareOrderId,
      squarePaymentId,
      steps
    }),
  };
};
