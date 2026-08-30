import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDatabaseConfigured } from "@/db";
import { getUserById } from "./users";
import { isAppOriginConfigured } from "./app-url";

const SESSION_COOKIE = "opsv_session"; const STATE_COOKIE = "opsv_oauth_state";
type SessionToken = { userId: string; expiresAt: number };
function secret() { const value=process.env.AUTH_SECRET; if (process.env.NODE_ENV === "production" && (!value || value.length < 32)) throw new Error("AUTH_SECRET måste innehålla minst 32 tecken i produktion."); return value ?? "local-development-only-change-me"; }
function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("base64url"); }
function encode(payload: SessionToken) { const body = Buffer.from(JSON.stringify(payload)).toString("base64url"); return `${body}.${sign(body)}`; }
function decode(token?: string): SessionToken | null { if (!token) return null; const [body, signature] = token.split("."); if (!body || !signature) return null; const expected = sign(body); if (expected.length !== signature.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null; try { const value = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionToken; return typeof value.userId === "string" && Number.isSafeInteger(value.expiresAt) && value.expiresAt > Date.now() ? value : null; } catch { return null; } }
const cookieOptions = { httpOnly:true, sameSite:"lax" as const, secure:process.env.NODE_ENV === "production", path:"/", priority:"high" as const };
export function isDiscordConfigured() { return Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET && (process.env.AUTH_SECRET?.length ?? 0) >= 32 && process.env.DATABASE_URL && isAppOriginConfigured()); }
export async function createSession(userId: string) { (await cookies()).set(SESSION_COOKIE, encode({ userId, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30 }), { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 }); }
export const getSession = cache(async function getSession() { if (!isDatabaseConfigured()) return null; const token = decode((await cookies()).get(SESSION_COOKIE)?.value); return token ? getUserById(token.userId) : null; });
export async function requireDiscordParticipant(options: { profileRequired?: boolean } = {}) {
  const user = await getSession();
  if (!user?.discordId) redirect("/login?reason=participation");
  if (options.profileRequired !== false && !user.playgroundName) redirect("/onboarding");
  return user;
}
export async function requireAdmin() {
  const user = await requireDiscordParticipant();
  if (user.role !== "admin") redirect("/");
  return user;
}
export async function clearSession() { (await cookies()).delete(SESSION_COOKIE); }
export async function createOAuthState() { const state = randomBytes(24).toString("base64url"); (await cookies()).set(STATE_COOKIE, state, { ...cookieOptions, maxAge: 600 }); return state; }
export async function consumeOAuthState(received: string | null) { const store = await cookies(); const expected = store.get(STATE_COOKIE)?.value; store.delete(STATE_COOKIE); if (!received || !expected || received.length !== expected.length) return false; return timingSafeEqual(Buffer.from(received), Buffer.from(expected)); }
