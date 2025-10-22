import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function SignIn(){
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  async function go(){
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options:{ emailRedirectTo: window.location.origin + "/#/" }
    });
    setMsg(error ? error.message : "Check your email.");
  }
  return (
    <div className="max-w-md space-y-3">
      <input className="bg-white/10 px-3 py-2 rounded w-full" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
      <button className="bg-white/10 px-4 py-2 rounded" onClick={go}>Sign in</button>
      {msg && <div className="text-sm opacity-80">{msg}</div>}
    </div>
  );
}
