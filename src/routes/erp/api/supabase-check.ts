import { createFileRoute } from "@tanstack/react-router";
import { json } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { getAppSession } from "#/lib/server/session";
import { createServerClient } from "@supabase/ssr";

export const Route = createFileRoute("/api/supabase-check")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const session = await getAppSession();

          const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_KEY, {
            auth: { throwOnError: true },
            cookies: {
              getAll: () => session.data.auth ?? [],
              setAll: (cookies) => {
                void session.update((prev) => ({
                  ...prev,
                  auth: cookies.map(({ name, value }) => ({ name, value })),
                }));
              },
            },
          });

          const { data, error } = await supabase.auth.getUser();

          if (error) {
            return json(
              { ok: false, error: error.message },
              { status: 500 },
            );
          }

          return json({
            ok: true,
            serverSide: true,
            userId: data.user?.id ?? null,
          });
        } catch (err) {
          return json(
            {
              ok: false,
              error: err instanceof Error ? err.message : "Unknown error",
            },
            { status: 500 },
          );
        }
      },
    },
  },
});