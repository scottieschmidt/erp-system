import { createServerClient } from "@supabase/ssr";
import { env } from "cloudflare:workers";

export function getSupabaseServerClient() {
  const cloudflareEnv = env as
    | (typeof env & {
        SUPABASE_SERVICE_ROLE_KEY?: string;
      })
    | undefined;
  const supabaseUrl = cloudflareEnv?.SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseKey =
    cloudflareEnv?.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    cloudflareEnv?.SUPABASE_KEY ??
    process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY environment variables",
    );
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });
}