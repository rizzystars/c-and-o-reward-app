import type { Handler } from "@netlify/functions";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUserFromSupabase(accessToken: string) {
  const res = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { Authorization: "Bearer " + accessToken },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("auth failed: " + res.status + " " + text);
  }
  return res.json();
}

export const handler: Handler = async (evt) => {
  try {
    if (evt.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method not allowed" };
    }

    const auth = evt.headers["authorization"] || evt.headers["Authorization"];
    if (!auth || !auth.startsWith("Bearer ")) {
      return { statusCode: 401, body: "Missing bearer" };
    }
    const token = auth.slice("Bearer ".length);

    const { first_name } = JSON.parse(evt.body || "{}") as { first_name?: string };
    if (!first_name) return { statusCode: 400, body: "Missing first_name" };

    const user = await getUserFromSupabase(token);
    const { id, email } = user;

    // Upsert into users_profile (requires users_profile.user_id to be primary key or unique)
    const upsertRes = await fetch(SUPABASE_URL + "/rest/v1/users_profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE,
        "Authorization": "Bearer " + SERVICE_ROLE,
        "Prefer": "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify({
        user_id: id,
        first_name,
        email,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!upsertRes.ok) {
      const t = await upsertRes.text();
      throw new Error("upsert failed: " + upsertRes.status + " " + t);
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e: any) {
    return { statusCode: 400, body: e.message || "error" };
  }
};
