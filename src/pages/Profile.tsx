import { useEffect, useMemo, useState } from "react";
import { createClient, Session } from "@supabase/supabase-js";

// Local Supabase client for this page
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

type ProfileRow = {
  first_name: string | null;
  email: string | null;
};

function isValidEmail(e: string) {
  // simple sanity check; Supabase will still enforce + send confirmation
  return /^\S+@\S+\.\S+$/.test(e);
}

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");

  // Keep originals for Cancel / dirty check
  const [origFirst, setOrigFirst] = useState("");
  const [origEmail, setOrigEmail] = useState("");

  const [session, setSession] = useState<Session | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const welcomeName = useMemo(
    () => firstName || (email ? email.split("@")[0] : ""),
    [firstName, email]
  );

  const isDirty = useMemo(
    () => firstName.trim() !== origFirst.trim() || email !== origEmail,
    [firstName, email, origFirst, origEmail]
  );
  const emailLooksOK = useMemo(() => !isEditing || !email || isValidEmail(email), [isEditing, email]);

  // Load session + profile
  useEffect(() => {
    (async () => {
      try {
        const { data: sessData } = await supabase.auth.getSession();
        const s = sessData?.session ?? null;
        setSession(s);

        const uid = s?.user?.id ?? null;
        const authEmail = s?.user?.email ?? "";
        setEmail(authEmail);

        if (!uid) {
          return; // not signed in
        }

        const { data: prof, error } = await supabase
          .from("users_profile")
          .select("first_name,email")
          .eq("user_id", uid)
          .maybeSingle<ProfileRow>();

        if (error) console.error("profile load error:", error);

        const fn = prof?.first_name ?? "";
        // prefer profile.email if present, else auth email
        const em = prof?.email || authEmail;

        setFirstName(fn);
        setEmail(em);

        setOrigFirst(fn);
        setOrigEmail(em);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function onCancel() {
    setIsEditing(false);
    setFirstName(origFirst);
    setEmail(origEmail);
    setMsg(null);
  }

  async function onSave() {
    if (!session) return;
    setSaving(true);
    setMsg(null);
    try {
      const trimmedFirst = firstName.trim();
      const trimmedEmail = email.trim();

      if (!trimmedFirst) throw new Error("First name is required.");
      if (!isValidEmail(trimmedEmail)) throw new Error("Please enter a valid email address.");

      const emailChanged = trimmedEmail.toLowerCase() !== (origEmail || "").toLowerCase();

      // IMPORTANT: If email changed, update Auth FIRST so our server upsert mirrors the new email instantly.
      if (emailChanged) {
        const { error: authErr } = await supabase.auth.updateUser({ email: trimmedEmail });
        if (authErr) throw new Error(`Couldn't update login email: ${authErr.message}`);
      }

      // Upsert first_name + email into public.users_profile via Netlify function
      const r = await fetch("/.netlify/functions/profile-upsert", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ first_name: trimmedFirst, email: trimmedEmail }),
      });

      if (r.status === 409) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || "That email is already used by another profile.");
      }

      const t = await r.text();
      if (!r.ok) {
        throw new Error(`profile-upsert failed ${r.status}: ${t}`);
      }

      // Commit originals and exit edit mode
      setOrigFirst(trimmedFirst);
      setOrigEmail(trimmedEmail);
      setIsEditing(false);
      setMsg(emailChanged ? "Saved. Check your inbox to confirm your new email." : "Saved.");
    } catch (e: any) {
      console.error(e);
      setMsg(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-5 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Profile</h1>
          <p className="text-sm text-zinc-400">Welcome, {welcomeName || "friend"}.</p>
        </div>
        {!isEditing ? (
          <button
            className="px-4 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-900"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-xl bg-white text-black hover:opacity-90 disabled:opacity-50"
              onClick={onSave}
              disabled={!isDirty || !emailLooksOK || saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              className="px-4 py-2 rounded-xl border border-zinc-700 disabled:opacity-50"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        )}
      </header>

      {/* Your Info */}
      <div className="rounded-2xl border border-zinc-800 p-5">
        <div className="text-lg font-semibold mb-3">Your Info</div>
        <label className="block text-sm text-zinc-400 mb-1">First Name</label>
        <input
          type="text"
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={!isEditing}
          autoComplete="given-name"
          autoFocus={isEditing}
          className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 disabled:opacity-60"
        />
      </div>

      {/* Email */}
      <div className="rounded-2xl border border-zinc-800 p-5">
        <div className="text-lg font-semibold mb-3">Email</div>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!isEditing}
          autoComplete="email"
          className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3 disabled:opacity-60"
        />
        <p className="text-xs text-zinc-400 mt-2">
          Changing your email updates your login email. You may receive a confirmation email.
        </p>
        {isEditing && email && !emailLooksOK && (
          <p className="text-xs text-red-400 mt-1">That doesn’t look like a valid email.</p>
        )}
      </div>

      {msg && (
        <div className="text-sm text-zinc-200 bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3">
          {msg}
        </div>
      )}
    </div>
  );
}
