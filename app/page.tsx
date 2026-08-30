import Link from "next/link";
import { ChallengeRow } from "@/components/challenge-row";
import { getHomeData } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { activity, challenges, stats } = await getHomeData();
  const featuredChallenges = challenges.filter((challenge) => challenge.status !== "Kommer snart").slice(0, 5);
  return <>
    <section className="hero section-pad">
      <div className="hero-top"><span className="eyebrow">OPSV / PLAYGROUND</span><span className="hero-count">001—∞</span></div>
      <h1><span>Bygg.</span><span>Testa.</span><span><em>Lär</em></span></h1>
      <div className="hero-foot"><p>En öppen lekplats för AI, kod och experiment från den svenska OPSV-gemenskapen.</p><div className="hero-actions"><Link className="button button-accent" href="/challenges">Utforska utmaningar <span>→</span></Link><a className="text-link" href="#how">Så fungerar det ↓</a></div></div>
      <div className="ticker" aria-hidden="true"><span>ÖPPEN KÄLLKOD</span><i/> <span>LÅG TRÖSKEL</span><i/> <span>HÖG NYFIKENHET</span><i/> <span>GJORD FÖR ATT BRYTAS</span></div>
    </section>

    <section className="featured section-pad">
      <header className="section-heading"><div><span className="section-number">01</span><span className="eyebrow">AKTIVA / UTVALDA UTMANINGAR</span></div><Link href="/challenges">Visa alla {challenges.length} <span>↗</span></Link></header>
      <div className="challenge-list">{featuredChallenges.map((challenge, index) => <ChallengeRow challenge={challenge} index={index + 1} key={challenge.slug}/>)}</div>
    </section>

    <section className="manifesto section-pad" id="how">
      <div className="manifesto-label"><span className="section-number">02</span><span className="eyebrow">SÅ FUNGERAR DET</span></div>
      <p className="manifesto-copy">Välj ett problem.<br/>Använd vilka verktyg du vill.<br/><strong>Visa resultatet.</strong></p>
      <ol className="steps"><li><span>01</span><div><h3>Välj en utmaning</h3><p>Tio minuter eller tio dagar. Hitta något på din nivå.</p></div></li><li><span>02</span><div><h3>Bygg på ditt sätt</h3><p>Kod, promptar, agenter eller pixlar. Du väljer verktygen.</p></div></li><li><span>03</span><div><h3>Skicka in och jämför</h3><p>Dela arbetet, lär av andra och klättra på topplistan.</p></div></li></ol>
    </section>

    <section className="activity-stats section-pad" id="experiments">
      <div className="activity-panel"><header className="section-heading"><div><span className="section-number">03</span><span className="eyebrow">SENASTE AKTIVITETEN</span></div><span className="live-label"><i/> DIREKT</span></header>{activity.length ? activity.map((item) => <div className="activity-row" key={`${item.playgroundName}-${item.target}-${item.time}`}><Link href={`/u/${item.playgroundName}`}>{item.user}</Link><span>{item.action}</span><strong>{item.target}</strong><time>{item.time}</time></div>) : <p className="empty-state">Det första bidraget blir början på aktivitetsflödet.</p>}</div>
      <div className="stats-panel"><span className="eyebrow">GEMENSKAPEN / JUST NU</span><div className="stats-grid"><div><strong>{String(stats.activeChallenges).padStart(2,"0")}</strong><span>Aktiva<br/>utmaningar</span></div><div><strong>{stats.totalSubmissions}</strong><span>Totalt antal<br/>bidrag</span></div><div><strong>{stats.activeBuilders}</strong><span>Aktiva<br/>byggare</span></div><div><strong>{String(stats.experiments).padStart(2,"0")}</strong><span>Öppna<br/>experiment</span></div></div></div>
    </section>
  </>;
}
