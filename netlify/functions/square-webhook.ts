import type { Handler } from "@netlify/functions";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  console.log("HEADERS", event.headers);
  console.log("BODY", event.body);

  return {
    statusCode: 200,
    body: "logged",
  };
};
