import { useEffect } from "react";
import { supabase } from "../lib/supabase";
export default function SignOut(){
  useEffect(()=>{ supabase.auth.signOut().finally(()=>location.hash = "/"); }, []);
  return <div>Signing out�</div>;
}
