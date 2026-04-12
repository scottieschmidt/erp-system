import { createFileRoute } from "@tanstack/react-router";

import { getSupabaseServerClient } from "#/lib/server/supabase";

type Vendor = {
  vendor_id: number;
  vendor_name: string;
  vendor_address: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isJsonRequest(request: Request) {
  const accept = request.headers.get("accept") ?? "";
  const url = new URL(request.url);
  return accept.includes("application/json") || url.searchParams.get("format") === "json";
}

function renderDropdownPage(vendors: Vendor[]) {
  const options = vendors
    .map((vendor) => {
      const text = `${vendor.vendor_id} - ${vendor.vendor_name}`;
      return `<option value="${vendor.vendor_id}">${escapeHtml(text)}</option>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Vendor Dropdown</title>
  </head>
  <body style="font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:0 16px;">
    <h1>Vendor Dropdown</h1>
    <p>Select a vendor by <code>vendor_id</code> and <code>vendor_name</code>.</p>
    <label for="vendor-select" style="display:block;margin-bottom:8px;">Vendor</label>
    <select id="vendor-select" name="vendor_id" style="width:100%;padding:10px;">
      <option value="">Select vendor</option>
      ${options}
    </select>
    <p style="margin-top:16px;color:#444;">Loaded ${vendors.length} vendor(s).</p>
    <p><a href="/api/display-vendors1?format=json">View JSON</a></p>
  </body>
</html>`;
}

export const Route = createFileRoute("/api/display-vendors1")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const supabase = getSupabaseServerClient();

          const { data, error } = await supabase
            .from("vendor")
            .select("vendor_id, vendor_name, vendor_address")
            .order("vendor_id", { ascending: false });

          if (error) {
            return Response.json({ ok: false, error: error.message }, { status: 500 });
          }

          const vendors = (data ?? []) as Vendor[];
          if (isJsonRequest(request)) {
            return Response.json({ ok: true, vendors }, { status: 200 });
          }

          return new Response(renderDropdownPage(vendors), {
            status: 200,
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        } catch (err) {
          return Response.json(
            {
              ok: false,
              error: err instanceof Error ? err.message : "Unknown server error",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
