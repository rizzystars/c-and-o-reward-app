import { createClient } from "@supabase/supabase-js";

const url  = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

function assertEnv() {
  const errs: string[] = [];
  if (!url) errs.push("VITE_SUPABASE_URL is missing.");
  if (!anon) errs.push("VITE_SUPABASE_ANON_KEY is missing.");
  if (url && !/^https?:\/\//i.test(url)) errs.push("VITE_SUPABASE_URL must start with http:// or https://");
  if (errs.length) {
    const msg = "Supabase env not configured:\n" + errs.join("\n");
    // Throw to be caught by ErrorBoundary (visible on screen)
    throw new Error(msg);
  }
}

assertEnv();

export const supabase = createClient(url, anon);
