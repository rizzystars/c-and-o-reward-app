import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../state/auth";

/**
 * Profile
 * - Loads name/email from Supabase (public.profiles + auth.user)
 * - Lets user edit first name (saved through Netlify function with service role)
 * - Lets user change email (Supabase sends confirmation to the NEW address)
 * - Clean, mobile-first card layout
 */
export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [notice, setNotice] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Derive a friendly greeting from metadata or email prefix
  const fallbackName = useMemo(() => {
    const metaName = (user?.user_metadata?.full_name || user?.user_metadata?.name || "").trim();
    if (metaName) return metaName.split(" ")[0];
    const mail = (user?.email || "").trim();
    return mail ? mail.split("@")[0] : "Friend";
  }, [user]);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!user) return;
      setLoading(true);
      setError("");
      setNotice("");

      try {
        const { data: prof, error: pErr } = await supabase
          .from("profiles")
          .select("first_name")
          .eq("id", user.id)
          .maybeSingle();

        if (pErr) throw pErr;
        setFirstName((prof?.first_name as string) || fallbackName || "");
        setEmail(user.email || "");
      } catch (e: any) {
        setError(e?.message || "Failed to load profile.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [user, fallbackName]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const res = await fetch("/.netlify/functions/profile-upsert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token,
        },
        body: JSON.stringify({ first_name: firstName }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Save failed");
      }
      setNotice("Saved!");
    } catch (e: any) {
      setError(e?.message || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function changeEmail() {
    if (!user) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const { data, error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) throw error;
      if (data?.user?.email !== email.trim()) {
        setNotice("Confirmation sent. Check your NEW email to confirm the change.");
      } else {
        setNotice("Email updated.");
      }
    } catch (e: any) {
      setError(e?.message || "Email update failed.");
    } finally {
      setSaving(false);
    }
  }

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
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-lg font-semibold">
          { (firstName || fallbackName).slice(0,1).toUpperCase() }
        </div>
        <div>
          <div className="text-sm opacity-80">Welcome</div>
          <div className="text-xl font-semibold">{firstName || fallbackName}</div>
        </div>
      </header>

      {(notice || error) && (
        <div className={`rounded-lg border p-3 text-sm ${error ? "border-red-500/40 bg-red-500/10" : "border-emerald-500/40 bg-emerald-500/10"}`}>
          {error || notice}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
        <div className="text-base font-semibold">Your Info</div>
        <label className="block text-sm opacity-80">First Name</label>
        <input
          className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name"
        />
        <button
          className="w-full rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15 transition disabled:opacity-50"
          disabled={saving || loading || !firstName.trim()}
          onClick={saveProfile}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="text-base font-semibold">Email</div>
        <div className="text-sm opacity-80">Change your sign-in email. Supabase will send a confirmation to the new address.</div>
        <input
          type="email"
          className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
        />
        <button
          className="w-full rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15 transition disabled:opacity-50"
          disabled={saving || loading || !email.trim()}
          onClick={changeEmail}
        >
          {saving ? "Working..." : "Update Email"}
        </button>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <QuickCard title="Points" desc="See balance & activity" to="/points" />
        <QuickCard title="Sign out" desc="Switch accounts" to="/signout" />
      </div>
    </div>
  );
}

function QuickCard({ title, desc, to }: { title: string; desc: string; to: string }) {
  return (
    <a
      href={`#${to}`}
      className="rounded-2xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition"
    >
      <div className="text-base font-semibold">{title}</div>
      <div className="text-sm opacity-80">{desc}</div>
    </a>
  );
}
