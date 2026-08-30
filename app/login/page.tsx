import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, isDiscordConfigured } from "@/lib/auth";

export const metadata: Metadata = { title: "Discord-inloggning" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; reason?: string }> }) {
  const session = await getSession();
  if (session) redirect(session.playgroundName ? `/u/${session.playgroundName}` : "/onboarding");
  const configured = isDiscordConfigured();
  const query = await searchParams;
  return <div className="auth-page">
    <div className="auth-aside"><span className="eyebrow">IDENTITET / DISCORD</span><p>Ett konto.<br/>Varje poäng.<br/><strong>Ditt namn.</strong></p></div>
    <div className="auth-panel">
      <span className="eyebrow">LOGGA IN / 01</span><h1>Gå med i<br/>Playground.</h1>
      <p>Alla deltar genom sitt eget Discord-konto. Det bekräftar att varje profil, bidrag och poäng tillhör en medlem i gemenskapen.</p>
      {query.reason === "participation" && <div className="participation-note">LOGGA IN MED DITT PERSONLIGA DISCORD-KONTO FÖR ATT DELTA.</div>}
      {query.error && <div className="auth-error">{query.error === "not-configured" ? "Discord-inloggningen väntar på miljövariabler." : "Discord kunde inte slutföra inloggningen. Försök igen."}</div>}
      {configured ? <Link className="discord-button" href="/api/auth/discord"><span className="discord-glyph">◉</span>Logga in med Discord <b>↗</b></Link> : <button className="discord-button" disabled><span className="discord-glyph">◉</span>Discord behöver konfigureras <b>—</b></button>}
      <small>Vi begär bara Discord-behörigheten <code>identify</code>: användar-ID, användarnamn, visningsnamn och avatar. Ingen åtkomst till servrar, e-post eller meddelanden.</small>
      <Link className="back-link" href="/">← TILLBAKA TILL PLAYGROUND</Link>
    </div>
  </div>;
}
