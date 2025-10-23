import type { Handler } from "@netlify/functions";

/**
 * profile-upsert
 * Validates the caller's Supabase access token, then upserts into public.profiles
 * using the Netlify Service Role key (server-side).
 *
 * Required Netlify env vars:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUserFromSupabase(accessToken: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`auth failed: ${res.status} ${text}`);
  }
  return res.json();
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method not allowed" };
    }
    const authz = (event.headers.authorization || (event.headers.Authorization as string | undefined)) as string | undefined;
    if (!authz || !authz.toLowerCase().startsWith("bearer ")) {
      return { statusCode: 401, body: "Missing bearer token" };
    }
    const accessToken = authz.split(" ")[1];

    const me = await getUserFromSupabase(accessToken);
    const uid: string = me?.id;
    if (!uid) return { statusCode: 401, body: "No user" };

    const body = JSON.parse(event.body || "{}");
    const first_name = (body.first_name || "").toString().slice(0, 100).trim();

    const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        "apikey": SERVICE_ROLE,
        "Authorization": `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify([{
        id: uid,
        first_name,
        updated_at: new Date().toISOString(),
      }]),
    });

    if (!upsertRes.ok) {
      const t = await upsertRes.text();
      throw new Error(`upsert failed: ${upsertRes.status} ${t}`);
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    return { statusCode: 400, body: e?.message || "error" };
  }
};
