import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../state/auth";

export function useSupabaseAuth() {
  const { setUser } = useAuth();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setUser(sess?.user ?? null));
    return () => { sub.subscription.unsubscribe(); };
  }, [setUser]);
}
