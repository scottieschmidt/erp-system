import { createMiddleware } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export const database = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const db = drizzle({
    client: postgres(env.DATABASE_URL),
    schema: schema,
  });

  return next({
    context: { db },
  });
});

export { schema as t };
