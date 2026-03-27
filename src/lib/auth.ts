import { useQuery } from "@tanstack/react-query";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/router-core";

import { DatabaseProvider, SupabaseProvider } from "#/lib/provider";
import { getOrInitProfile } from "#/lib/server/auth";
import type { RouterContext } from "#/types";

const Authenticate = createMiddleware({ type: "function" })
  .middleware([DatabaseProvider, SupabaseProvider])
  .server(async ({ context, next }) => {
    const response = await context.supabase.auth.getUser();
    const identity = response.data.user;
    const profile = await getOrInitProfile(context.db, identity);

    return next({
      context: {
        auth: { identity, profile },
      },
    });
  });

const getAuthStatusFn = createServerFn()
  .middleware([Authenticate])
  .handler(({ context }) => context.auth);

const AuthStatusQueryKey = ["#!/auth"] as const;

export function useAuthStatusQuery() {
  return useQuery({
    queryKey: AuthStatusQueryKey,
    queryFn: getAuthStatusFn,
  });
}

export async function redirectIfSignedOut(context: RouterContext) {
  const auth = await context.queryClient.fetchQuery({
    queryKey: AuthStatusQueryKey,
    queryFn: getAuthStatusFn,
  });

  if (!auth.identity) {
    throw redirect({ to: "/auth/login" });
  }
}

export async function redirectIfSignedIn(context: RouterContext) {
  const auth = await context.queryClient.fetchQuery({
    queryKey: AuthStatusQueryKey,
    queryFn: getAuthStatusFn,
  });

  if (auth.identity) {
    throw redirect({ to: "/" });
  }
}
