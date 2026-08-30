import { NextResponse } from "next/server";
import { z } from "zod";
import { consumeOAuthState, createSession, isDiscordConfigured } from "@/lib/auth";
import { getAppOrigin } from "@/lib/app-url";
import { upsertDiscordUser, type DiscordProfile } from "@/lib/users";

const tokenSchema=z.object({ access_token:z.string().min(16).max(4096) });
const profileSchema=z.object({ id:z.string().regex(/^\d{5,30}$/), username:z.string().min(1).max(80), global_name:z.string().max(80).nullable().optional(), avatar:z.string().regex(/^[a-zA-Z0-9_]+$/).max(128).nullable().optional() });

export async function GET(request: Request) {
  const appOrigin=getAppOrigin(request.url); const incoming = new URL(request.url); const code = incoming.searchParams.get("code");
  if (!isDiscordConfigured() || !code || code.length > 4096 || !(await consumeOAuthState(incoming.searchParams.get("state")))) return NextResponse.redirect(new URL("/login?error=oauth", appOrigin));
  const callback = new URL("/api/auth/callback/discord", appOrigin).toString();
  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", { method:"POST", headers:{ "Content-Type":"application/x-www-form-urlencoded" }, body:new URLSearchParams({ client_id:process.env.DISCORD_CLIENT_ID!, client_secret:process.env.DISCORD_CLIENT_SECRET!, grant_type:"authorization_code", code, redirect_uri:callback }), cache:"no-store", signal:AbortSignal.timeout(8_000) });
    if (!tokenResponse.ok) throw new Error("Discord token exchange failed"); const token=tokenSchema.parse(await tokenResponse.json());
    const profileResponse = await fetch("https://discord.com/api/users/@me", { headers:{ Authorization:`Bearer ${token.access_token}` }, cache:"no-store", signal:AbortSignal.timeout(8_000) }); if (!profileResponse.ok) throw new Error("Discord profile request failed");
    const profile=profileSchema.parse(await profileResponse.json()) as DiscordProfile; const user = await upsertDiscordUser(profile); await createSession(user.id);
    return NextResponse.redirect(new URL(user.playgroundName ? `/u/${user.playgroundName}` : "/onboarding", appOrigin));
  } catch { console.error("Discord OAuth callback failed"); return NextResponse.redirect(new URL("/login?error=oauth", appOrigin)); }
}
