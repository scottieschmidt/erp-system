import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import * as Icon from "lucide-react";

import { DashboardLayout } from "#/components/layout/dashboard";
import { MustAuthenticate, redirectIfSignedOut } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  loader: () => listSessionFn(),
});

const listSessionFn = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async ({ context }) => {
    return await context.db
      .select()
      .from(t.auth_sessions)
      .where(eq(t.auth_sessions.user_id, context.auth.identity.id));
  });

function SettingsPage() {
  const sessions = Route.useLoaderData();

  console.log(sessions);

  return (
    <DashboardLayout title="Settings">
      <section className="flex flex-col gap-5">
        <div className="rounded-xl border border-gray-700 p-4">
          <h2 className="mb-4 text-xl font-semibold">Sessions</h2>

          <div className="space-y-2">
            {sessions.map((session) => (
              <div className="flex items-center" key={session.id}>
                <Icon.KeyRound className="mr-2" />
                <div className="flex-1 text-sm">
                  <p className="font-medium">{session.ip}</p>
                  <p className="truncate">{session.updated_at}</p>
                </div>
                <button className="ml-2 cursor-pointer text-red-800 hover:text-red-600">
                  <Icon.CircleX />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}
