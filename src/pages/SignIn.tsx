import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";
import AuthLayout from "./AuthLayout";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });
      if (error) throw error;
      // Signed in – take them to rewards
      location.hash = "/points";
    } catch (e:any) {
      setError(e?.message || "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to view points, perks, and past orders.">
      {(notice || error) && (
        <div className={"rounded-xl p-3 text-sm " + (error ? "bg-red-500/15 border border-red-500/30" : "bg-emerald-500/10 border border-emerald-500/30")}>
          {error || notice}
        </div>
      )}

      <form onSubmit={handleSignIn} className="space-y-4">
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
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        <button
          disabled={busy || !email.trim() || password.length < 6}
          className="w-full rounded-xl px-4 py-3 font-medium bg-white text-black hover:bg-white/90 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-sm opacity-80 pt-2">
        New here? <Link to="/signup" className="underline">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
