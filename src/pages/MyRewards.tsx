import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../state/auth";

type RewardCoupon = {
  id: string;
  reward_id: string;
  code: string;
  created_at: string;
  expires_at: string | null;
  redeemed_at: string | null;
};

const REWARD_LABELS: Record<string, string> = {
  "free-espresso-shot": "Free Espresso Shot",
  "free-latte": "Free Latte",
  "merch-5-off": "$5 Off Merch",
};

export default function MyRewards() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<RewardCoupon[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadRewards() {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("reward_coupons")
          .select("id,reward_id,code,created_at,expires_at,redeemed_at")
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!alive) return;
        setRewards((data || []) as RewardCoupon[]);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        setError(e?.message || "Could not load your rewards.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadRewards();
    return () => {
      alive = false;
    };
  }, [user]);

  if (!user) {
    return (
      <div className="pt-4 space-y-4">
        <h1 className="text-xl font-semibold">My Rewards</h1>
        <p className="text-sm opacity-80">
          Sign in to see your rewards and codes.
        </p>
        <div className="flex gap-3 text-sm">
          <Link
            to="/signin"
            className="px-3 py-2 rounded-lg bg-white text-black font-semibold"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="px-3 py-2 rounded-lg border border-white/40"
          >
            Join now
          </Link>
        </div>
      </div>
    );
  }

  const now = new Date();

  const active = rewards.filter((r) => {
    const expired =
      r.expires_at && new Date(r.expires_at).getTime() < now.getTime();
    return !expired && !r.redeemed_at;
  });

  const past = rewards.filter((r) => !active.includes(r));

  return (
    <div className="pt-4 pb-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">My Rewards</h1>
        <p className="text-sm opacity-80">
          Codes you can use online or in the shop. Tap to view details.
        </p>
      </div>

      {error && (
        <div className="text-xs text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm opacity-80">Loading your rewards…</div>
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                Active
              </h2>
              <span className="text-xs opacity-70">
                {active.length} reward{active.length === 1 ? "" : "s"}
              </span>
            </div>

            {active.length === 0 ? (
              <div className="text-sm opacity-75">
                You don’t have any active rewards yet. Redeem points to unlock
                drinks and discounts.
              </div>
            ) : (
              <div className="space-y-3">
                {active.map((r) => (
                  <RewardRow key={r.id} coupon={r} onClick={() => nav(`/reward/${r.id}`)} />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between mt-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                  Past
                </h2>
                <span className="text-xs opacity-70">
                  {past.length} used / expired
                </span>
              </div>
              <div className="space-y-3 opacity-70">
                {past.map((r) => (
                  <RewardRow key={r.id} coupon={r} disabled onClick={() => nav(`/reward/${r.id}`)} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function RewardRow({
  coupon,
  onClick,
  disabled,
}: {
  coupon: RewardCoupon;
  onClick: () => void;
  disabled?: boolean;
}) {
  const title = REWARD_LABELS[coupon.reward_id] ?? "C&O Reward";
  const created = new Date(coupon.created_at).toLocaleDateString();
  const expires = coupon.expires_at
    ? new Date(coupon.expires_at).toLocaleDateString()
    : null;

  const isExpired =
    coupon.expires_at && new Date(coupon.expires_at) < new Date();
  const isUsed = !!coupon.redeemed_at;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "w-full text-left rounded-2xl border px-3 py-3 flex items-center justify-between gap-3",
        "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition",
        disabled ? "opacity-60 cursor-default hover:bg-white/[0.03]" : "",
      ].join(" ")}
    >
      <div className="flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs opacity-75 mt-0.5">
          Code {coupon.code}
        </div>
        <div className="text-[11px] opacity-70 mt-1">
          Issued {created}
          {expires && ` • Expires ${expires}`}
        </div>
      </div>
      <div className="text-xs uppercase tracking-[0.18em] opacity-70">
        {isUsed ? "Used" : isExpired ? "Expired" : "View"}
      </div>
    </button>
  );
}
