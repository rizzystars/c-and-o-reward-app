import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../state/auth";

/**
 * Points
 * - Shows current points balance from public.loyalty_balances (user_id = auth.uid())
 * - Shows recent transactions from public.loyalty_ledger
 * - Wawa/Sheetz-style mobile layout with big balance card + activity
 */
type Balance = { points: number; updated_at: string|null } | null;
type LedgerItem = { id: string; change: number; source: string|null; created_at: string };

const REWARDS = [
  { id: "espresso", name: "Free 2oz Espresso Shot", cost: 50 },
  { id: "latte",    name: "Free Latte",             cost: 100 },
  { id: "merch5",   name: "$5 Off Merch",           cost: 120 },
];

export default function Points(){
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<Balance>(null);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [error, setError] = useState("");

  const pts = balance?.points ?? 0;
  const canRedeem = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const r of REWARDS) map[r.id] = pts >= r.cost;
    return map;
  }, [pts]);

  useEffect(() => {
    let alive = true;
    async function load(){
      if (!user) return;
      setLoading(true);
      setError("");
      try {
        const [{ data: bal, error: bErr }, { data: led, error: lErr }] = await Promise.all([
          supabase.from("loyalty_balances").select("points,updated_at").eq("user_id", user.id).maybeSingle(),
          supabase.from("loyalty_ledger").select("id,change,source,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        ]);
        if (bErr) throw bErr;
        if (lErr) throw lErr;
        if (alive) {
          setBalance(bal ? { points: bal.points as number, updated_at: bal.updated_at as string|null } : { points: 0, updated_at: null });
          setLedger((led || []) as any);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load points.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [user]);

  if (!user) {
    return (
      <div className="p-6 space-y-3">
        <div className="text-xl font-semibold">Please sign in</div>
        <a href="#/signin" className="underline">Go to Sign In</a>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md p-4 sm:p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-sm opacity-80">Rewards</div>
          <div className="text-xl font-semibold">C&O Points</div>
        </div>
        <a href="#/profile" className="text-sm underline opacity-80">Profile</a>
      </header>

      {(error) && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">{error}</div>
      )}

      {/* Balance card */}
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-5 flex items-center justify-between">
        <div>
          <div className="text-sm opacity-80">Available</div>
          <div className="text-5xl font-extrabold tracking-tight">{loading ? "—" : pts}</div>
          <div className="text-xs opacity-60 mt-1">{balance?.updated_at ? new Date(balance.updated_at).toLocaleString() : ""}</div>
        </div>
        <div className="text-right">
          <div className="text-xs opacity-80">Rate</div>
          <div className="text-base font-semibold">1 pt / $1</div>
        </div>
      </section>

      {/* Rewards list */}
      <section className="space-y-3">
        <div className="text-base font-semibold">Redeem</div>
        <ul className="space-y-2">
          {REWARDS.map(r => (
            <li key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{r.name}</div>
                <div className="text-sm opacity-80">{r.cost} points</div>
              </div>
              <button
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40"
                disabled={!canRedeem[r.id]}
                onClick={() => alert(\`Redemption flow TBD for ${r.name}\`)}
              >
                Redeem
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Activity */}
      <section className="space-y-3">
        <div className="text-base font-semibold">Activity</div>
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          {ledger.length === 0 && (
            <div className="p-4 text-sm opacity-80">No activity yet.</div>
          )}
          {ledger.map(row => (
            <div key={row.id} className="px-4 py-3 flex items-center justify-between border-b border-white/10 last:border-b-0">
              <div>
                <div className="text-sm">{row.source || "Activity"}</div>
                <div className="text-xs opacity-60">{new Date(row.created_at).toLocaleString()}</div>
              </div>
              <div className={\`text-base font-semibold \${row.change >= 0 ? "" : "opacity-80"}\`}>
                {row.change >= 0 ? \`+\${row.change}\` : row.change}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
