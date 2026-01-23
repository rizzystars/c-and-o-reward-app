import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../state/auth";

type Balance = { points: number; updated_at: string | null } | null;
type LedgerItem = { id: string; change: number; source: string | null; created_at: string };

const REWARDS = [
  { id: "free-espresso-shot", name: "Free 2oz Espresso Shot", cost: 50 },
  { id: "free-latte", name: "Free Latte", cost: 100 },
  { id: "merch-5-off", name: "$5 Off Merch", cost: 120 },
];

export default function Points() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<Balance>(null);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const totalPoints = balance?.points ?? 0;

  async function loadData() {
    if (!user) {
      setBalance(null);
      setLedger([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [{ data: bal, error: balErr }, { data: led, error: ledErr }] =
        await Promise.all([
          supabase
            .from("loyalty_balances")
            .select("points,updated_at")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("loyalty_ledger")
            .select("id,change,source,created_at")
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

      if (balErr) throw balErr;
      if (ledErr) throw ledErr;

      setBalance(
        bal
          ? { points: Number(bal.points), updated_at: bal.updated_at as string | null }
          : { points: 0, updated_at: null }
      );
      setLedger((led || []) as LedgerItem[]);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Could not load your points.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      await loadData();
      if (!alive) return;
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const rows = useMemo(
    () =>
      ledger.map((item) => ({
        id: item.id,
        delta_points: item.change,
        reason: item.source,
        created_at: item.created_at,
      })),
    [ledger]
  );

  async function handleRedeem(rewardId: string, cost: number) {
    setError(null);
    if (!user) {
      setError("Please sign in to redeem rewards.");
      return;
    }
    if (totalPoints < cost) {
      setError("Not enough points for that reward yet.");
      return;
    }

    try {
      setRedeemingId(rewardId);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error("Please sign in again to redeem rewards.");
      }

      const token = sessionData.session.access_token;

      const res = await fetch("/.netlify/functions/create-square-coupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reward_id: rewardId }),
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to redeem reward.");
      }

      const coupon = (await res.json()) as {
        id: string;
        reward_id: string;
        code: string;
        created_at: string;
        expires_at: string | null;
      };

      await loadData();

      nav(`/reward/${coupon.id}`, {
        state: { rewardCoupon: coupon },
      });
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Could not redeem reward.");
    } finally {
      setRedeemingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Points &amp; Rewards</h1>
          <p className="text-sm opacity-80">
            Earn on every purchase. Redeem points for drinks, discounts, and merch.
          </p>
        </div>
        <Link
          to="/my-rewards"
          className="text-xs font-semibold underline underline-offset-4"
        >
          My reward codes
        </Link>
      </div>

      {error && (
        <div className="text-xs text-red-400">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] opacity-70">
            Points balance
          </div>
          <div className="text-3xl font-extrabold tracking-tight mt-1">
            {loading ? "—" : totalPoints}
          </div>
          {balance?.updated_at && (
            <div className="text-[11px] opacity-70 mt-1">
              Updated {new Date(balance.updated_at).toLocaleString()}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
          Redeem rewards
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {REWARDS.map((r) => {
            const canRedeem = totalPoints >= r.cost;
            return (
              <div
                key={r.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 flex flex-col justify-between"
              >
                <div>
                  <div className="text-sm font-semibold">{r.name}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {r.cost} points
                  </div>
                </div>
                <button
                  onClick={() => handleRedeem(r.id, r.cost)}
                  disabled={!canRedeem || redeemingId === r.id || loading}
                  className="mt-3 px-3 py-1.5 rounded-full bg-white text-black text-xs font-semibold disabled:opacity-50"
                >
                  {redeemingId === r.id ? "Processing…" : canRedeem ? "Redeem" : "Not enough points"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
          Activity
        </h2>
        {loading && rows.length === 0 ? (
          <div className="text-sm opacity-80">Loading activity…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm opacity-75">
            No activity yet. Start earning points by ordering with your account.
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2"
              >
                <div>
                  <div className="text-sm">{row.reason || "Activity"}</div>
                  <div className="text-xs opacity-60">
                    {new Date(row.created_at).toLocaleString()}
                  </div>
                </div>
                <div
                  className={
                    "text-base font-semibold " +
                    (row.delta_points >= 0 ? "" : "opacity-80")
                  }
                >
                  {row.delta_points >= 0
                    ? "+" + row.delta_points
                    : String(row.delta_points)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
