import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function SignOut() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.signOut().finally(() => {
      navigate("/signin", { replace: true });
    });
  }, [navigate]);

  return (
    <div className="p-6 text-center text-gray-400">
      Signing out...
    </div>
  );
}
