// register route file (or server helper)
import { createServerFn } from "@tanstack/react-start";
import { sql } from "drizzle-orm";
import { database } from "#/lib/database";

export const addUser = createServerFn({ method: "POST" })
  .middleware([database])
  .handler(async ({ data, context }) => {
    const payload = data as {
      full_name: string;
      role_id: number;
      dept_id: number;
    };

    const fullName = payload.full_name?.trim();
    if (!fullName) throw new Error("Full name is required.");
    if (!Number.isInteger(payload.role_id)) throw new Error("Invalid role.");
    if (!Number.isInteger(payload.dept_id)) throw new Error("Invalid department.");

    // user_id is omitted -> DB auto-increments it
    await context.db.execute(sql`
      insert into users (full_name, role_id, dept_id)
      values (${fullName}, ${payload.role_id}, ${payload.dept_id})
    `);
  });