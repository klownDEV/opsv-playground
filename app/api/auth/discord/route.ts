import { NextResponse } from "next/server";
import { createOAuthState, isDiscordConfigured } from "@/lib/auth";
import { getAppOrigin } from "@/lib/app-url";

export async function GET(request: Request) {
  if (!isDiscordConfigured()) return NextResponse.redirect(new URL("/login?error=not-configured", getAppOrigin(request.url)));
  const appOrigin=getAppOrigin(request.url); const state = await createOAuthState(); const callback = new URL("/api/auth/callback/discord", appOrigin).toString();
  const url = new URL("https://discord.com/oauth2/authorize"); url.searchParams.set("client_id", process.env.DISCORD_CLIENT_ID!); url.searchParams.set("response_type", "code"); url.searchParams.set("redirect_uri", callback); url.searchParams.set("scope", "identify"); url.searchParams.set("state", state); url.searchParams.set("prompt", "consent");
  return NextResponse.redirect(url);
}
