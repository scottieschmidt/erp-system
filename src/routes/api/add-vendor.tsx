import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseServerClient } from "#/lib/server/supabase";

type AddVendorBody = {
  vendor_name: string;
  vendor_address: string;
};

export const Route = createFileRoute("/api/add-vendor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Partial<AddVendorBody>;

        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
        }

        const vendor_name = body.vendor_name?.trim();
        const vendor_address = body.vendor_address?.trim();

        if (!vendor_name || !vendor_address) {
          return Response.json(
            { ok: false, error: "vendor_name and vendor_address are required." },
            { status: 400 },
          );
        }

        const supabase = await getSupabaseServerClient();

        const { data, error } = await supabase
          .from("vendor")
          .insert([{ vendor_name, vendor_address }])
          .select("vendor_id, vendor_name, vendor_address")
          .single();

        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        return Response.json({ ok: true, vendor: data }, { status: 201 });
      },
      GET: async () => {
        return Response.json(
          {
            ok: true,
            message: "POST vendor_name and vendor_address to create a vendor.",
          },
          { status: 200 },
        );
      },
    },
  },
});