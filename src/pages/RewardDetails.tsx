import { useEffect, useState } from "react";
import { useParams, useLocation, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../state/auth";

type RewardCoupon = {
  id: string;
  reward_id: string;
  code: string;
  created_at: string;
  expires_at: string | null;
};

type LocationState = {
  rewardCoupon?: RewardCoupon;
};

const REWARD_LABELS: Record<string, string> = {
  "free-espresso-shot": "Free Espresso Shot",
  "free-latte": "Free Latte",
  "merch-5-off": "$5 Off Merch",
};

export default function RewardDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const [coupon, setCoupon] = useState<RewardCoupon | null>(
    state?.rewardCoupon ?? null
  );
  const [loading, setLoading] = useState(!state?.rewardCoupon);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    if (state?.rewardCoupon) return;

    let alive = true;
    async function load() {
      if (!user) {
        setError("Please sign in to view this reward.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("reward_coupons")
          .select("id,reward_id,code,created_at,expires_at")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          if (alive) setError("Reward not found.");
          return;
        }
        if (alive) setCoupon(data as RewardCoupon);
      } catch (e: any) {
        console.error(e);
        if (alive) setError("Could not load this reward.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [id, state?.rewardCoupon, user]);

  if (!id) {
    return (
      <div className="p-6">
        <p>Missing reward id.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <p>Loading reward…</p>
      </div>
    );
  }

  if (error || !coupon) {
    return (
      <div className="p-6 space-y-3">
        <p>{error || "Something went wrong."}</p>
        <button
          onClick={() => nav(-1)}
          className="px-3 py-2 rounded-lg bg-white text-black text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  const title = REWARD_LABELS[coupon.reward_id] ?? "C&O Reward";
  const expiresText = coupon.expires_at
    ? new Date(coupon.expires_at).toLocaleString()
    : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      alert("Code copied to clipboard");
    } catch {
      alert("Could not copy. Please copy manually.");
    }
  };

  return (
    <div className="pt-4 pb-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Show this at checkout
        </h1>
        <p className="text-sm opacity-80">
          The barista can type this code into the register or you can use it
          online at checkout.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-amber-500/30 via-red-500/20 to-black p-6 space-y-4">
        <div className="text-xs uppercase tracking-[0.2em] opacity-80">
          Reward
        </div>
        <div className="text-2xl font-bold tracking-tight">{title}</div>

        <div className="mt-4">
          <div className="text-xs uppercase tracking-[0.18em] opacity-70 mb-2">
            Code
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold tracking-[0.16em]">
            {coupon.code}
          </div>
        </div>

        {expiresText && (
          <div className="text-xs opacity-75">
            Expires {expiresText}
          </div>
        )}

        <button
          onClick={handleCopy}
          className="mt-4 w-full rounded-full bg-white text-black py-2.5 text-sm font-semibold"
        >
          Copy code
        </button>
      </div>

      <div className="space-y-2 text-xs opacity-80">
        <p>• One-time use only. Once it’s applied to an order, it can’t be reused.</p>
        <p>• Valid only at C&amp;O Coffee Collective participating locations.</p>
      </div>

      <div className="flex gap-3 text-sm">
        <Link
          to="/points"
          className="px-3 py-2 rounded-lg border border-white/30"
        >
          Back to rewards
        </Link>
        <Link
          to="/menu"
          className="px-3 py-2 rounded-lg bg-white text-black font-semibold"
        >
          Start order
        </Link>
      </div>
    </div>
  );
}
