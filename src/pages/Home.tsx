import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../state/auth";

type Balance = { points: number; updated_at: string | null } | null;

export default function Home() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<Balance>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!user) {
        setBalance(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("loyalty_balances")
          .select("points,updated_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        if (alive) {
          setBalance(
            data
              ? {
                  points: Number(data.points),
                  updated_at: data.updated_at as string | null,
                }
              : { points: 0, updated_at: null }
          );
        }
      } catch (e) {
        console.error(e);
        if (alive) {
          setBalance({ points: 0, updated_at: null });
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [user]);

  const pts = balance?.points ?? 0;

  return (
    <div className="pb-20">
      <section className="mt-2 mb-6">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-amber-500/30 via-red-500/20 to-black p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.16em] opacity-80">
                C&amp;O Coffee Collective
              </div>
              <div className="text-xl font-bold mt-1">
                Rewards
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-75">Points</div>
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {loading ? "—" : pts}
              </div>
            </div>
          </div>

          {user ? (
            <div className="flex items-center justify-between text-xs opacity-80">
              <div>
                Signed in as{" "}
                <span className="font-semibold">
                  {user.email || "member"}
                </span>
              </div>
              {balance?.updated_at && (
                <div>Updated {new Date(balance.updated_at).toLocaleString()}</div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mt-2">
              <Link
                to="/signup"
                className="px-3 py-1.5 rounded-full bg-white text-black text-xs font-semibold"
              >
                Join for free
              </Link>
              <Link
                to="/signin"
                className="px-3 py-1.5 rounded-full border border-white/40 text-xs"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickTile to="/menu" label="Order" note="Pickup &amp; to-go" />
          <QuickTile to="/points" label="Rewards" note="Redeem points" />
          <QuickTile to="/my-rewards" label="My Codes" note="Saved rewards" />
          <QuickTile to={user ? "/profile" : "/signin"} label="Account" note="Profile &amp; settings" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
          How it works
        </h2>
        <div className="space-y-2 text-sm opacity-85">
          <p>1. Sign up and use the same email at checkout (online or in the shop).</p>
          <p>2. Earn points on every purchase. Your points show up here automatically.</p>
          <p>3. Redeem points for drinks, discounts, and merch — and get a code you can scan or show at the register.</p>
        </div>
      </section>
    </div>
  );
}

function QuickTile({
  to,
  label,
  note,
}: {
  to: string;
  label: string;
  note: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 flex flex-col justify-between hover:bg-white/[0.06] transition"
    >
      <div className="text-sm font-semibold mb-1">{label}</div>
      <div className="text-xs opacity-70">{note}</div>
    </Link>
  );
}
