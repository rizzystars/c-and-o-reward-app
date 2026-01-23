import type { Handler } from "@netlify/functions";
import crypto from "crypto";

const sigHeader =
  "x-square-hmacsha256-signature"; // present in your logs

function timingSafeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export const handler: Handler = async (event) => {
  const body = event.body || "";
  const headers = Object.fromEntries(
    Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v])
  );

  // 1) verify signature (recommended)
  const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || "";
  const theirSig = (headers[sigHeader] as string) || "";

  // Square signs: HMAC_SHA256(secret, notification_url + body), base64
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

  // Only award on payment.updated where status is COMPLETED
  if (type !== "payment.updated") {
    return { statusCode: 200, body: JSON.stringify({ ok: true, ignored: type }) };
  }

  const payment = payload?.data?.object?.payment;
  const status = payment?.status;
  if (status !== "COMPLETED") {
    return { statusCode: 200, body: JSON.stringify({ ok: true, payment_status: status }) };
  }

  const amountCents = payment?.amount_money?.amount ?? 0;
  const points = Math.floor(Number(amountCents) / 100); // $1 => 1 point

  // Pull customer email (Square customer might exist OR you’ll map by email)
  const customerId = payment?.customer_id || null;

  // Use event_id as idempotency key in ref_id
  const ref_id = `square:${payload?.event_id || payment?.id || Date.now()}`;

  // Call Supabase RPC or insert ledger directly via REST
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // If you already have an RPC, swap endpoint here.
  // This version inserts into loyalty_ledger via REST (you’ll need user_id mapping in DB).
  // For now we log and stop if no customer_id.
  if (!customerId) {
    console.log("No customer_id on payment; cannot map to users_profile yet.");
    return { statusCode: 200, body: JSON.stringify({ ok: true, needs_customer_mapping: true, ref_id }) };
  }

  // TODO: Replace with your real mapping logic
  console.log("PAYMENT COMPLETED", { amountCents, points, customerId, ref_id });

  return { statusCode: 200, body: JSON.stringify({ ok: true, awarded_points: points, ref_id }) };
};
