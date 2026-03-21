import { createServerFn } from "@tanstack/react-start";

import { database, t } from "#/lib/database";

type AddUserInput = {
  role_id?: number | null;
  dept_id?: number | null;
};

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("role_id and dept_id must be numbers when provided");
  }

  return value;
}

export const addUser = createServerFn({ method: "POST" })
  .middleware([database])
  .handler(async ({ context, data }) => {
    const payload = (data ?? {}) as AddUserInput;
    const role_id = toNullableNumber(payload.role_id);
    const dept_id = toNullableNumber(payload.dept_id);

    const inserted = await context.db
      .insert(t.users)
      .values({
        role_id,
        dept_id,
      })
      .returning();

    return inserted[0] ?? null;
  });