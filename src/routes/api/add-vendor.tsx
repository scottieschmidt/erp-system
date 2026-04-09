import { createFileRoute } from "@tanstack/react-router";
import { createServerClient } from "@supabase/ssr";
import { env } from "cloudflare:workers";

type AddVendorPayload = {
  vendor_name?: string;
  vendor_address?: string;
};

function getSupabaseConfig() {
  const supabaseUrl = env?.SUPABASE_URL ?? process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const envWithServiceRole = env as unknown as { SUPABASE_SERVICE_ROLE_KEY?: string } | undefined;
  const serviceRoleKey = envWithServiceRole?.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseKey = serviceRoleKey ?? env?.SUPABASE_KEY ?? process.env.SUPABASE_KEY;

  return { supabaseUrl, supabaseKey };
}

function isPublishableKey(key: string) {
  return key.startsWith("sb_publishable_");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function htmlPage(message?: string, error?: string) {
  const messageBlock = message
    ? `<p style="padding:10px;border-radius:8px;background:#e6ffed;color:#135c2b;border:1px solid #8fe3b0;">${escapeHtml(message)}</p>`
    : "";
  const errorBlock = error
    ? `<p style="padding:10px;border-radius:8px;background:#ffecec;color:#7d1f1f;border:1px solid #ffadad;">${escapeHtml(error)}</p>`
    : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Add Vendor</title>
  </head>
  <body style="font-family:Arial,sans-serif;max-width:600px;margin:40px auto;padding:0 16px;">
    <h1>Add Vendor (Server Side)</h1>
    <p>This form posts directly to <code>/api/add-vendor</code> and inserts on the server.</p>
    ${messageBlock}
    ${errorBlock}
    <form method="post" action="/api/add-vendor" style="display:grid;gap:12px;">
      <label>
        Vendor Name<br />
        <input name="vendor_name" required style="width:100%;padding:8px;" />
      </label>
      <label>
        Vendor Address<br />
        <textarea name="vendor_address" rows="3" required style="width:100%;padding:8px;"></textarea>
      </label>
      <button type="submit" style="padding:10px 14px;cursor:pointer;">Create Vendor</button>
    </form>
  </body>
</html>`;
}

function htmlResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function getFormString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export const Route = createFileRoute("/api/add-vendor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const contentType = request.headers.get("content-type") ?? "";
        const isJsonRequest = contentType.includes("application/json");
        let body: AddVendorPayload = {};

        try {
          if (isJsonRequest) {
            body = (await request.json()) as AddVendorPayload;
          } else {
            const form = await request.formData();
            body = {
              vendor_name: getFormString(form, "vendor_name"),
              vendor_address: getFormString(form, "vendor_address"),
            };
          }
        } catch {
          if (isJsonRequest) {
            return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
          }
          return htmlResponse(htmlPage(undefined, "Invalid form body"), 400);
        }

        const vendor_name = body.vendor_name?.trim();
        const vendor_address = body.vendor_address?.trim();

        if (!vendor_name || !vendor_address) {
          if (isJsonRequest) {
            return Response.json(
              { ok: false, error: "vendor_name and vendor_address are required" },
              { status: 400 },
            );
          }
          return htmlResponse(htmlPage(undefined, "vendor_name and vendor_address are required"), 400);
        }

        const { supabaseUrl, supabaseKey } = getSupabaseConfig();

        if (!supabaseUrl || !supabaseKey) {
          if (isJsonRequest) {
            return Response.json(
              { ok: false, error: "Missing SUPABASE_URL or SUPABASE_KEY environment variables" },
              { status: 500 },
            );
          }
          return htmlResponse(
            htmlPage(undefined, "Missing SUPABASE_URL or SUPABASE_KEY environment variables"),
            500,
          );
        }

        if (isPublishableKey(supabaseKey)) {
          const configError =
            "SUPABASE_KEY is a publishable key. Use the Supabase service role/secret key for server inserts.";
          if (isJsonRequest) {
            return Response.json({ ok: false, error: configError }, { status: 500 });
          }
          return htmlResponse(htmlPage(undefined, configError), 500);
        }

        const supabase = createServerClient(supabaseUrl, supabaseKey, {
          cookies: {
            getAll: () => [],
            setAll: () => {},
          },
        });

        const { data, error } = await supabase
          .from("vendor")
          .insert([{ vendor_name, vendor_address }])
          .select("*")
          .single();

        if (error) {
          const isRlsError = error.code === "42501";
          const errorMessage = isRlsError
            ? "Insert blocked by RLS. If this is a server route, set SUPABASE_KEY to a service role/secret key; otherwise add a vendor INSERT policy."
            : error.message;
          if (isJsonRequest) {
            return Response.json({ ok: false, error: errorMessage }, { status: 500 });
          }
          return htmlResponse(htmlPage(undefined, errorMessage), 500);
        }

        if (!isJsonRequest) {
          return htmlResponse(htmlPage(`Vendor created: ${data.vendor_name}`));
        }

        return Response.json({ ok: true, vendor: data }, { status: 201 });
      },
      GET: async () => {
        return htmlResponse(htmlPage());
      },
    },
  },
});
