import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { completeOnboarding } from "@/lib/actions";
import { getSession } from "@/lib/auth";
import { resolveDiscordDisplayName, suggestPlaygroundName } from "@/lib/identity";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Välj ditt namn" };
export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) { const user = await getSession(); if (!user) redirect("/login"); if (user.playgroundName) redirect(`/u/${user.playgroundName}`); const error = (await searchParams).error; const discordDisplayName = resolveDiscordDisplayName(user.discordDisplayName, user.discordUsername); const suggestedName = suggestPlaygroundName(user.discordDisplayName, user.discordUsername);
  return <div className="onboarding page-shell"><span className="eyebrow">VÄLKOMMEN / BYGGARE</span><div className="onboarding-grid"><div><h1>Välj ditt<br/><em>Playground-</em><br/>namn.</h1><p>Ditt visningsnamn från Discord används på profiler, bidrag och topplistor. Playground-namnet nedan blir din unika profiladress.</p></div><form action={completeOnboarding}><div className="discord-identity"><div className="avatar-placeholder">{discordDisplayName.slice(0,1).toUpperCase()}</div><div><span>ANSLUTEN SOM</span><strong>{discordDisplayName}</strong></div></div>{error && <div className="auth-error">{error}</div>}<label htmlFor="playgroundName">PROFILADRESS</label><div className="name-field"><span>playground.opsv.dev/u/</span><input id="playgroundName" name="playgroundName" defaultValue={suggestedName} pattern="[a-zA-Z0-9-]{3,24}" minLength={3} maxLength={24} required/></div><p>3–24 tecken. Bokstäver, siffror och bindestreck. Unik oavsett stora och små bokstäver.</p><button className="button button-accent" type="submit">VÄLJ ADRESS <span>→</span></button></form></div></div>;
}
