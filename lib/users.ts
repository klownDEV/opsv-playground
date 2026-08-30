import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { normalizePlaygroundName } from "./identity";

export type DiscordProfile = { id: string; username: string; global_name?: string | null; avatar?: string | null };
export { normalizePlaygroundName } from "./identity";

export async function upsertDiscordUser(profile: DiscordProfile) {
  const avatarUrl = profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png?size=256` : null;
  const [user] = await getDb().insert(users).values({ discordId: profile.id, discordUsername: profile.username, discordDisplayName: profile.global_name, avatarUrl }).onConflictDoUpdate({ target: users.discordId, set: { discordUsername: profile.username, discordDisplayName: profile.global_name, avatarUrl, updatedAt: new Date() } }).returning();
  return user;
}
export async function getUserById(id: string) { return (await getDb().select().from(users).where(eq(users.id, id)).limit(1))[0] ?? null; }
export async function getUserByPlaygroundName(name: string) { return (await getDb().select().from(users).where(eq(users.playgroundNameNormalized, normalizePlaygroundName(name))).limit(1))[0] ?? null; }
export async function savePlaygroundName(id: string, rawName: string) { const normalized = normalizePlaygroundName(rawName); const [user] = await getDb().update(users).set({ playgroundName: normalized, playgroundNameNormalized: normalized, updatedAt: new Date() }).where(eq(users.id, id)).returning(); return user; }
