import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Square env (hook up real API later)
const squareEnv = process.env.SQUARE_ENV || "sandbox";
const squareLocationId = process.env.SQUARE_LOCATION_ID;
const squareSandboxToken = process.env.SQUARE_SANDBOX_ACCESS_TOKEN;

// Match this to REWARDS in Points.tsx
const REWARD_CONFIG: Record<
  string,
  {
    costPoints: number;
    discountType: "amount" | "percent";
    amountCents?: number;
    percent?: number;
  }
> = {
  "free-espresso-shot": {
    costPoints: 50,
    discountType: "amount",
    amountCents: 400,
  },
  "free-latte": {
    costPoints: 100,
    discountType: "amount",
    amountCents: 800,
  },
  "merch-5-off": {
    costPoints: 120,
    discountType: "amount",
    amountCents: 500,
  },
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    const authHeader =
      event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.toString().startsWith("Bearer ")) {
      return { statusCode: 401, body: "Missing or invalid Authorization header" };
    }
    const token = authHeader.toString().slice("Bearer ".length);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("getUser error", userError);
      return { statusCode: 401, body: "Invalid auth token" };
    }

    const user_id = user.id;

    if (!event.body) {
      return { statusCode: 400, body: "Missing body" };
    }
    const { reward_id } = JSON.parse(event.body) as {
      reward_id?: string;
    };

    if (!reward_id) {
      return { statusCode: 400, body: "Missing reward_id" };
    }

    const rewardCfg = REWARD_CONFIG[reward_id];
    if (!rewardCfg) {
      return { statusCode: 400, body: "Unknown reward_id" };
    }

    const { data: balance, error: balError } = await supabase
      .from("loyalty_balances")
      .select("points")
      .eq("user_id", user_id)
      .maybeSingle();

    if (balError) {
      console.error(balError);
      return { statusCode: 500, body: "Could not load balance" };
    }

    const currentPoints = balance ? Number(balance.points) : 0;
    if (currentPoints < rewardCfg.costPoints) {
      return { statusCode: 400, body: "Not enough points" };
    }

    const newPoints = currentPoints - rewardCfg.costPoints;

    const { error: updateError } = await supabase
      .from("loyalty_balances")
      .upsert({
        user_id,
        points: newPoints,
      });

    if (updateError) {
      console.error(updateError);
      return { statusCode: 500, body: "Could not update balance" };
    }

    const { error: ledgerError } = await supabase.from("loyalty_ledger").insert({
      user_id,
      change: -rewardCfg.costPoints,
      source: `redeem:${reward_id}`,
    });

    if (ledgerError) {
      console.error(ledgerError);
    }

    // TODO: Create a real Square discount/coupon here using
    // squareSandboxToken, squareLocationId, and squareEnv.
    const randomSegment = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `CNO-${randomSegment}`;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30);

    const { data: inserted, error: insertError } = await supabase
      .from("reward_coupons")
      .insert({
        user_id,
        reward_id,
        code,
        square_discount_id: null,
        expires_at: expiresAt.toISOString(),
      })
      .select("id,reward_id,code,created_at,expires_at")
      .single();

    if (insertError || !inserted) {
      console.error(insertError);
      return { statusCode: 500, body: "Could not save reward coupon" };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(inserted),
    };
  } catch (e: any) {
    console.error(e);
    return { statusCode: 500, body: "Unexpected error" };
  }
};
