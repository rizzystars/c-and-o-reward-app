import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";
import AuthLayout from "./AuthLayout";

export default function SignUp() {
  const [first, setFirst] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { first_name: first.trim() }
        }
      });
      if (error) throw error;

      // If we already have a session (email confirmation off), upsert profile now.
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (token && first.trim()) {
          await fetch("/.netlify/functions/profile-upsert", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + token,
            },
            body: JSON.stringify({ first_name: first.trim() }),
          });
        }
      } catch {}

      if (!data.session) {
        setNotice("Check your email to confirm your account. Then sign in.");
      } else {
        // Signed in immediately
        location.hash = "/points";
      }
    } catch (e:any) {
      setError(e?.message || "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Earn points with every order.">
      {(notice || error) && (
        <div className={"rounded-xl p-3 text-sm " + (error ? "bg-red-500/15 border border-red-500/30" : "bg-emerald-500/10 border border-emerald-500/30")}>
          {error || notice}
        </div>
      )}

      <form onSubmit={handleSignUp} className="space-y-4">
        <label className="block text-sm">
          <span className="opacity-80">First name</span>
          <input
            type="text"
            required
            className="mt-1 w-full rounded-xl bg-black/50 border border-white/10 px-4 py-3 outline-none focus:border-white/25"
            placeholder="Jane"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            autoComplete="given-name"
          />
        </label>

        <label className="block text-sm">
          <span className="opacity-80">Email address</span>
          <input
            type="email"
            required
            className="mt-1 w-full rounded-xl bg-black/50 border border-white/10 px-4 py-3 outline-none focus:border-white/25"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>

        <label className="block text-sm">
          <span className="opacity-80">Password</span>
          <input
            type="password"
            required
            minLength={6}
            className="mt-1 w-full rounded-xl bg-black/50 border border-white/10 px-4 py-3 outline-none focus:border-white/25"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>

        <button
          disabled={busy || !first.trim() || !email.trim() || password.length < 6}
          className="w-full rounded-xl px-4 py-3 font-medium bg-white text-black hover:bg-white/90 disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="text-sm opacity-80 pt-2">
        Already have an account? <Link to="/signin" className="underline">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
