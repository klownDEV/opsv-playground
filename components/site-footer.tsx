import Link from "next/link";

export function SiteFooter() {
  return <footer className="site-footer" id="about">
    <div><span className="eyebrow">OPSV / PLAYGROUND</span><p className="footer-statement">BYGG NÅGOT.<br/>BRYT NÅGOT.<br/>DELA VAD DU LÄR DIG.</p></div>
    <div className="footer-links"><Link href="/challenges">UTMANINGAR ↗</Link><Link href="/leaderboard">TOPPLISTA ↗</Link><a href="https://github.com/opsv" rel="noreferrer">GITHUB ↗</a><a href="https://discord.com" rel="noreferrer">DISCORD ↗</a></div>
    <div className="footer-bottom"><span>OPENSVERIGE</span><span>© 2026 OPSV-GEMENSKAPEN</span><span>BYGG. TESTA. LÄR.</span></div>
  </footer>;
}
