import type { Handler } from "@netlify/functions";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isValidSignature(body: string, signature: string, url: string) {
  const hmac = crypto
    .createHmac("sha256", process.env.SQUARE_WEBHOOK_SIGNATURE_KEY!)
    .update(url + body)
    .digest("base64");
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

export const handler: Handler = async (event) => {
  const sig = event.headers["x-square-hmacsha256-signature"];
  if (!sig) return { statusCode: 401, body: "Missing signature" };

  if (
    !isValidSignature(
      event.body || "",
      sig,
      process.env.SQUARE_WEBHOOK_NOTIFICATION_URL!
    )
  ) {
    return { statusCode: 401, body: "Invalid signature" };
  }

  const payload = JSON.parse(event.body!);

  const payment = payload.data?.object?.payment;
  if (!payment || payment.status !== "COMPLETED") {
    return { statusCode: 200, body: "Ignored" };
  }

  const email = payment.buyer_email_address;
  if (!email) return { statusCode: 200, body: "No email" };

  const { data: user } = await supabase
    .from("users_profile")
    .select("user_id")
    .eq("email", email)
    .single();

  if (!user) return { statusCode: 200, body: "User not found" };

  const cents = payment.amount_money.amount;
  const points = Math.floor(cents / 100);

  await supabase.from("loyalty_ledger").insert({
    user_id: user.user_id,
    delta_points: points,
    reason: "Square purchase",
    ref_id: `square:payment:${payment.id}`,
  });

  return { statusCode: 200, body: "OK" };
};
