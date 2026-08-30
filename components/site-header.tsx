import Link from "next/link";
import { getSession } from "@/lib/auth";
import { resolveDiscordDisplayName } from "@/lib/identity";

export async function SiteHeader() {
  const session = await getSession();
  const displayName = session ? resolveDiscordDisplayName(session.discordDisplayName, session.discordUsername) : null;
  return <header className="site-header">
    <Link className="wordmark" href="/" aria-label="OPSV Playgrounds startsida">
      <span className="mark">O</span>
      <span className="wordmark-copy"><strong>OPSV</strong><small>PLAYGROUND</small></span>
    </Link>
    <nav className="desktop-nav" aria-label="Huvudnavigation">
      <Link href="/">Playground</Link><Link href="/challenges">Utmaningar</Link><Link href="/leaderboard">Topplista</Link><Link href="/#experiments">Experiment</Link><Link href="/#about">Om</Link>
    </nav>
    <div className="header-tools"><Link href="/challenges" aria-label="Sök bland utmaningar">Sök <span>⌕</span></Link>{session?.playgroundName ? <><Link className="login-link" href={`/u/${session.playgroundName}`}>{displayName} <span>↗</span></Link>{session.role === "admin" && <Link href="/admin">Admin</Link>}<form action="/api/auth/logout" method="post"><button type="submit">Logga ut</button></form></> : <Link className="login-link" href="/login">Logga in med Discord <span>↗</span></Link>}</div>
    <details className="mobile-menu"><summary>MENY</summary><nav><Link href="/">Playground</Link><Link href="/challenges">Utmaningar</Link><Link href="/leaderboard">Topplista</Link>{session?.playgroundName ? <><Link href={`/u/${session.playgroundName}`}>Min profil</Link>{session.role === "admin" && <Link href="/admin">Admin</Link>}<form action="/api/auth/logout" method="post"><button type="submit">Logga ut</button></form></> : <Link href="/login">Logga in med Discord</Link>}</nav></details>
  </header>;
}
