import type { Handler } from "@netlify/functions";

/**
 * profile-upsert
 * Validates the caller's Supabase access token, then upserts into public.users_profile
 * using the Netlify Service Role key (server-side).
 *
 * Env (set in .env on dev and in Netlify env in prod):
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Adjust for your dev/preview origin(s) as needed.
// You can lock this down later; "*" is simplest for local.
const CORS_ORIGIN = "*";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function getUserFromSupabase(accessToken: string) {
  // IMPORTANT: Include `apikey` header or Supabase Auth returns 401 "No API key found"
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: SERVICE_ROLE, // anon key also works, but we already have service role server-side
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`auth failed: ${res.status} ${text}`);
  }
  return res.json(); // { id, email, ... }
}

export const handler: Handler = async (event) => {
  try {
    // CORS preflight
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: CORS_HEADERS, body: "" };
    }

    if (event.httpMethod !== "POST") {
      return { statusCode: 405, headers: CORS_HEADERS, body: "Method not allowed" };
    }

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return { statusCode: 500, headers: CORS_HEADERS, body: "Missing server env" };
    }

    const authz = event.headers.authorization || event.headers.Authorization;
    if (!authz || !authz.toLowerCase().startsWith("bearer ")) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "missing bearer token" }),
      };
    }
    const accessToken = authz.split(" ")[1];

    // Verify token with Supabase Auth (now with apikey header)
    const user = await getUserFromSupabase(accessToken);
    const user_id = user.id as string;

    // Parse incoming profile fields (extendable)
    const body = event.body ? JSON.parse(event.body) : {};
    const patch: Record<string, unknown> = {};

    // Whitelist the fields you allow from the client:
    if (typeof body.first_name === "string") patch.first_name = body.first_name;
    if (typeof body.last_name === "string") patch.last_name = body.last_name;
    if (typeof body.email === "string") patch.email = body.email;

    // Nothing to update?
    if (Object.keys(patch).length === 0) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "no fields to update" }),
      };
    }

    // Upsert via PostgREST using service role (server-side only)
    // Prefer merge semantics so we don't blow away other columns
    const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/users_profile`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify([{ user_id, ...patch }]),
    });

    if (!upsertRes.ok) {
      const text = await upsertRes.text();
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: `upsert failed: ${upsertRes.status} ${text}` }),
      };
    }

    // Return the merged row (select = exact user)
    const selectRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users_profile?user_id=eq.${user_id}&select=*`,
      {
        headers: {
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
          Accept: "application/json",
        },
      }
    );

    const data = selectRes.ok ? await selectRes.json() : [];
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, profile: data?.[0] ?? null }),
    };
  } catch (err: any) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: String(err?.message || err) }),
    };
  }
};
