import { type User as AuthIdentity } from "@supabase/supabase-js";
import jwt from "@tsndr/cloudflare-worker-jwt";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";

import { t, type DrizzleClient } from "#/lib/server/database";

export async function createPasswordResetToken(authId: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: authId,
    exp: now + 3600,
  };

  return await jwt.sign(payload, env.APP_SECRET, { algorithm: "HS256" });
}

export async function decodePasswordResetToken(token: string) {
  const verified = await jwt.verify(token, env.APP_SECRET);
  if (!verified || !verified.payload.sub) {
    throw new Error("Invalid or expired token");
  }

  return verified.payload.sub;
}

export async function getOrInitProfile(db: DrizzleClient, identity: AuthIdentity | null) {
  if (!identity) {
    return null;
  }

  const profile = await db
    .select()
    .from(t.users)
    .where(eq(t.users.auth_id, identity.id))
    .limit(1)
    .then((rows) => rows[0]);

  if (profile) {
    return profile;
  }

  return await db
    .insert(t.users)
    .values({
      auth_id: identity.id,
      email: identity.email!,
      full_name: identity.email!.split("@")[0],
    })
    .returning()
    .then((rows) => rows[0]);
}
