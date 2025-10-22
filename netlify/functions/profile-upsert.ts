import type { Handler } from "@netlify/functions";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUserFromSupabase(accessToken: string) {
  const res = await fetch(\\/auth/v1/user\, {
    headers: { Authorization: \Bearer \\ }
  });
  if (!res.ok) throw new Error("auth failed");
  return res.json();
}

export const handler: Handler = async (evt) => {
  try {
    if (evt.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
    const auth = evt.headers["authorization"] || evt.headers["Authorization"];
    if (!auth?.startsWith("Bearer ")) return { statusCode: 401, body: "Missing bearer" };
    const token = auth.slice("Bearer ".length);

    const { first_name } = JSON.parse(evt.body || "{}") as { first_name?: string };
    if (!first_name) return { statusCode: 400, body: "Missing first_name" };

    const user = await getUserFromSupabase(token);
    const { id, email } = user;

    const res = await fetch(\\/rest/v1/users_profile\, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SERVICE_ROLE,
        "Authorization": \Bearer \\,
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify({
        user_id: id,
        first_name,
        email,
        updated_at: new Date().toISOString()
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(\upsert failed: \\);
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e:any) {
    return { statusCode: 400, body: e.message || "error" };
  }
};
