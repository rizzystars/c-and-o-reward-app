import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../state/auth";

type ProfileRow = { user_id: string; first_name: string | null; email: string | null };

export default function Profile(){
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!user) return;
        // load current profile (we’ll enable a read policy below)
        const { data, error } = await supabase
          .from("users_profile")
          .select("first_name,email")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (!cancelled) {
          setFirstName(data?.first_name ?? "");
          setEmail(data?.email ?? user.email ?? "");
          setLoading(false);
        }
      } catch (e:any) {
        if (!cancelled) {
          setMsg(e.message || "Failed to load profile");
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  async function save(){
    if (!user) return;
    setSaving(true); setMsg("");
    try {
      // update first_name via serverless function (service role upsert)
      const sess = (await supabase.auth.getSession()).data.session;
      if (!sess?.access_token) throw new Error("Not signed in");
      const r1 = await fetch("/.netlify/functions/profile-upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + sess.access_token },
        body: JSON.stringify({ first_name: firstName.trim() })
      });
      if (!r1.ok) throw new Error(await r1.text());

      // update email via Supabase auth (this will send a confirmation)
      if (email && email !== user.email) {
        const { error } = await supabase.auth.updateUser({ email });
        if (error) throw error;
        setMsg("Saved. Check your inbox to confirm the new email.");
      } else {
        setMsg("Saved.");
      }
    } catch (e:any) {
      setMsg(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return <div className="p-6">Please sign in.</div>;
  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-md space-y-4">
      <div className="text-sm opacity-80">User ID: {user.id}</div>
      <label className="block">
        <div className="text-sm mb-1">First name</div>
        <input className="bg-white/10 px-3 py-2 rounded w-full"
               value={firstName} onChange={e=>setFirstName(e.target.value)} />
      </label>
      <label className="block">
        <div className="text-sm mb-1">Email</div>
        <input className="bg-white/10 px-3 py-2 rounded w-full"
               value={email} onChange={e=>setEmail(e.target.value)} />
      </label>
      <button className="bg-white/10 px-4 py-2 rounded disabled:opacity-50"
              disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save"}
      </button>
      {msg && <div className="text-sm opacity-80">{msg}</div>}
    </div>
  );
}
