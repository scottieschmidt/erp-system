import { createFileRoute } from "@tanstack/react-router";
import { createServerClient } from "@supabase/ssr";
import { env } from "cloudflare:workers";

function getSupabaseConfig() {
  const supabaseUrl = env?.SUPABASE_URL ?? process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    env?.SUPABASE_KEY ??
    process.env.SUPABASE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY;

  return { supabaseUrl, supabaseKey };
}

export const Route = createFileRoute("/api/display-vendors")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseUrl, supabaseKey } = getSupabaseConfig();

        if (!supabaseUrl || !supabaseKey) {
          return Response.json(
            { ok: false, error: "Missing SUPABASE_URL or SUPABASE_KEY environment variables" },
            { status: 500 },
          );
        }

        const supabase = createServerClient(supabaseUrl, supabaseKey, {
          cookies: {
            getAll: () => [],
            setAll: () => {},
          },
        });

        const { data, error } = await supabase
          .from("vendor")
          .select("vendor_id, vendor_name, vendor_address")
          .order("vendor_id", { ascending: false });

        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        return Response.json({ ok: true, vendors: data ?? [] });
      },
    },
  },
});