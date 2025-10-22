import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function SignUp() {
  const [first, setFirst] = useState("");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");

  async function sendLink() {
    if (!first || !email) { setNotice("First name and email required."); return; }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/#/" }
    });
    if (error) setNotice(error.message);
    else setNotice("Check your email to verify and sign in.");
    localStorage.setItem("pending_first_name", first);
  }

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange(async (_e, sess) => {
      if (sess && sess.access_token) {
        const fn = localStorage.getItem("pending_first_name");
        if (fn) {
          await fetch("/.netlify/functions/profile-upsert", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + sess.access_token
            },
            body: JSON.stringify({ first_name: fn })
          });
          localStorage.removeItem("pending_first_name");
        }
      }
    });
    return () => { sub.data.subscription.unsubscribe(); };
  }, []);

  return (
    <div className="max-w-md space-y-3">
      <input className="bg-white/10 px-3 py-2 rounded w-full" placeholder="First name"
        value={first} onChange={(e) => setFirst(e.target.value)} />
      <input className="bg-white/10 px-3 py-2 rounded w-full" placeholder="Email"
        value={email} onChange={(e) => setEmail(e.target.value)} />
      <button className="bg-white/10 px-4 py-2 rounded" onClick={sendLink}>Sign up</button>
      {notice && <div className="text-sm opacity-80">{notice}</div>}
    </div>
  );
}
