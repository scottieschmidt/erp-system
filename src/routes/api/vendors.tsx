import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseServerClient } from "#/lib/server/supabase";

export const Route = createFileRoute("/api/vendors")({
  server: {
    handlers: {
      GET: async () => {
        const supabase = await getSupabaseServerClient();

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