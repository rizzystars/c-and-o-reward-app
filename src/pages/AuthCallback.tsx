import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToastStore } from "../components/ui/Toast";
import { triggerCoffeeRain } from "../components/effects/CoffeeRain";

export default function AuthCallback() {
  const nav = useNavigate();
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    let alive = true;

    const parseParams = () => {
      // HashRouter produces: "#/auth/callback#access_token=...&type=recovery"
      // We must parse ONLY the part after the second '#'.
      const raw = window.location.hash || "";
      const secondHash = raw.indexOf("#", 1); // look for second '#'
      const paramPart = secondHash >= 0 ? raw.slice(secondHash + 1) : raw.replace(/^#/, "");
      const q = new URLSearchParams(paramPart);

      return {
        type: q.get("type"),
        access_token: q.get("access_token"),
        refresh_token: q.get("refresh_token"),
      };
    };

    (async () => {
      const p = parseParams();

      // FIRST PRIORITY: password reset
      if (p.access_token && p.refresh_token) {
        try {
          await supabase.auth.setSession({
            access_token: p.access_token,
            refresh_token: p.refresh_token,
          });
          if (!alive) return;

          push({ text: "Set a new password to finish.", kind: "success" });
          nav("/reset-password", { replace: true });
          return;
        } catch {
          if (!alive) return;
          push({ text: "Reset link expired. Request a new one.", kind: "error", ttl: 4500 });
          nav("/signin", { replace: true });
          return;
        }
      }

      // Normal sign-in fallback
      const { data: { session } } = await supabase.auth.getSession();
      if (!alive) return;

      if (session) {
        push({ text: "Signed in — welcome!", kind: "success" });
        triggerCoffeeRain({ count: 40, duration: 1500 });
        setTimeout(() => nav("/points", { replace: true }), 300);
      } else {
        push({ text: "Could not complete sign-in.", kind: "error", ttl: 4500 });
        nav("/signin", { replace: true });
      }
    })();

    return () => { alive = false; };
  }, [nav, push]);

  return (
    <div className="min-h-[60vh] grid place-items-center">
      <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5">
        Completing sign-in...
      </div>
    </div>
  );
}
