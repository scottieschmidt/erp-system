import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as schema from "./schema";

export type DrizzleClient = PostgresJsDatabase<typeof schema>;

export { schema as t };
