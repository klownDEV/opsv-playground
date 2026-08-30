import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmissionForm } from "@/components/submission-form";
import { CodeChallengeWorkspace } from "@/components/code-challenge-workspace";
import { PromptChallengeWorkspace } from "@/components/prompt-challenge-workspace";
import { RequirementsShiftWorkspace } from "@/components/requirements-shift-workspace";
import { McpGuardWorkspace } from "@/components/mcp-guard-workspace";
import { TokenChallengeWorkspace } from "@/components/token-challenge-workspace";
import { UiChallengeWorkspace } from "@/components/ui-challenge-workspace";
import { challenges, getChallenge } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { getPublicChallenge } from "@/lib/queries";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return challenges.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = getChallenge((await params).slug);
  return item ? { title: item.title, description: item.description } : {};
}

export default async function ChallengePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ submitted?: string; error?: string; score?: string }>;
}) {
  const challenge = await getPublicChallenge((await params).slug);
  if (!challenge) notFound();
  const [session, query] = await Promise.all([getSession(), searchParams]);
  const isComingSoon = challenge.status === "Kommer snart";
  const hasCodeWorkspace = challenge.slug === "broken-api";
  const hasPromptWorkspace = challenge.slug === "prompt-compression";
  const hasRequirementsWorkspace = challenge.slug === "requirements-shift";
  const hasMcpGuardWorkspace = challenge.slug === "mcp-guard";
  const hasTokenWorkspace = challenge.slug === "token-miser";
  const hasUiWorkspace = challenge.slug === "ui-rescue";
  const hasWorkspace = hasCodeWorkspace || hasPromptWorkspace || hasRequirementsWorkspace || hasMcpGuardWorkspace || hasTokenWorkspace || hasUiWorkspace;
  const isLongUnbrokenTitle = !/[\s-]/.test(challenge.title) && challenge.title.length > 11;
  const titleClass = challenge.title.length > 14 ? "title-extra-long" : challenge.title.length > 13 || isLongUnbrokenTitle ? "title-long" : undefined;
  const workspace = hasCodeWorkspace ? <CodeChallengeWorkspace challengeId={challenge.publicId} challengeSlug={challenge.slug} canSubmit={Boolean(session)} />
    : hasPromptWorkspace ? <PromptChallengeWorkspace challengeId={challenge.publicId} challengeSlug={challenge.slug} canSubmit={Boolean(session)} />
    : hasRequirementsWorkspace ? <RequirementsShiftWorkspace challengeId={challenge.publicId} challengeSlug={challenge.slug} canSubmit={Boolean(session)} />
    : hasMcpGuardWorkspace ? <McpGuardWorkspace challengeId={challenge.publicId} challengeSlug={challenge.slug} canSubmit={Boolean(session)} />
    : hasTokenWorkspace ? <TokenChallengeWorkspace challengeId={challenge.publicId} challengeSlug={challenge.slug} canSubmit={Boolean(session)} />
    : hasUiWorkspace ? <UiChallengeWorkspace challengeId={challenge.publicId} challengeSlug={challenge.slug} canSubmit={Boolean(session)} />
    : null;

  return <div className="challenge-detail">
    <header className="challenge-hero section-pad">
      <div className="detail-kicker"><span>{challenge.publicId}</span><span>{challenge.category}</span><span>{challenge.difficulty}</span><span>{challenge.status}</span></div>
      <h1 className={titleClass}>{challenge.title}</h1>
      <div className="detail-summary">
        <p>{challenge.description}</p>
        <div className="detail-stats">
          <span>{challenge.submissions}<small>BIDRAG</small></span>
          <span>{challenge.participants}<small>BYGGARE</small></span>
          <a className="detail-start" href={isComingSoon ? "#objective" : hasWorkspace ? "#workspace" : "#resources"}>{isComingSoon ? "Läs mer" : hasWorkspace ? "Öppna editor" : "Öppna underlag"}<b>↓</b></a>
        </div>
      </div>
    </header>

    {workspace ? <section id="workspace" className="workspace-shell section-pad">
      {query.submitted === "1" ? <p className="workspace-confirmation workspace-route-status" role="status">AUTOMATISKT GODKÄNT{/^\d+$/.test(query.score ?? "") ? ` · ${query.score} POÄNG` : ""}. RESULTATET FINNS NU PÅ TOPPLISTAN.</p> : null}
      {query.error === "invalid-submission" ? <p className="auth-error workspace-route-status" role="alert">BIDRAGET KUNDE INTE SPARAS. DIN LÖSNING FINNS KVAR LOKALT – KONTROLLERA RESULTATET OCH FÖRSÖK IGEN.</p> : null}
      {query.error === "automatic-grading" ? <p className="auth-error workspace-route-status" role="alert">DEN AUTOMATISKA RÄTTNINGEN GODKÄNDE INTE RESULTATET. DIN LÖSNING FINNS KVAR LOKALT – KÖR TESTERNA IGEN OCH SKICKA IN PÅ NYTT.</p> : null}
      {workspace}
    </section> : null}

    <div className="detail-body section-pad">
      <aside><nav aria-label="Utmaningens innehåll">{hasWorkspace ? <a href="#workspace">00 / Arbetsyta</a> : null}<a href="#introduction">01 / Introduktion</a><a href="#objective">02 / Mål</a><a href="#resources">03 / Underlag</a><a href="#rules">04 / Regler</a><a href="#input">05 / Indata och resultat</a><a href="#scoring">06 / Poäng</a>{!hasWorkspace ? <a href="#submission">07 / Bidrag</a> : null}</nav></aside>
      <div className="detail-content">
        <section id="introduction"><span className="content-number">01</span><div><span className="eyebrow">INTRODUKTION</span><h2>Vad löser vi?</h2><p>{challenge.description} Utmaningen är utformad för att vara reproducerbar, begriplig och enkel att jämföra mellan olika verktyg.</p></div></section>
        <section id="objective"><span className="content-number">02</span><div><span className="eyebrow">MÅL</span><h2>Målet</h2><p>{challenge.objective}</p></div></section>
        <section id="resources"><span className="content-number">03</span><div><span className="eyebrow">UNDERLAG</span><h2>Börja här</h2>{hasWorkspace ? <><p>All kod, instruktioner och testresultat finns direkt i arbetsytan. Du behöver inte ladda ner eller installera någonting.</p><div className="resource-links"><a href="#workspace">ÖPPNA ARBETSYTAN<span>↑</span></a></div></> : <div className="resource-links">{challenge.resources.length ? challenge.resources.map((resource) => <a key={resource.label} href={resource.href}>{resource.label}<span>↗</span></a>) : <p>Underlaget publiceras när utmaningen öppnar.</p>}</div>}</div></section>
        <section id="rules"><span className="content-number">04</span><div><span className="eyebrow">REGLER</span><h2>Håll det rättvist</h2><ol className="rules-list">{challenge.rules.map((rule, index) => <li key={rule}><span>{String(index + 1).padStart(2, "0")}</span>{rule}</li>)}</ol></div></section>
        <section id="input"><span className="content-number">05</span><div><span className="eyebrow">INDATA / FÖRVÄNTAT RESULTAT</span><div className="io-grid"><div><h3>Du får</h3><p>{challenge.input}</p></div><div><h3>Du skapar</h3><p>{challenge.output}</p></div></div></div></section>
        <section id="scoring"><span className="content-number">06</span><div><span className="eyebrow">POÄNGSÄTTNING</span><h2>Testat och rättat direkt.</h2><div className="score-formula">{challenge.scoreFormula}</div><p>Playground kör utmaningens isolerade tester och räknar om poängen automatiskt vid inskickning. Topplistan använder användarens bästa verifierade resultat per utmaning.</p></div></section>
        {!hasWorkspace ? <section id="submission"><span className="content-number">07</span><div><span className="eyebrow">BIDRAG</span><h2>Visa vad du har gjort.</h2>{isComingSoon ? <p>Utmaningen tar inte emot bidrag ännu.</p> : <>{!session && <p className="submission-callout">Varje deltagare loggar in med sitt eget Discord-konto. <Link href="/login?reason=participation">Logga in med Discord →</Link></p>}<SubmissionForm challengeId={challenge.publicId} challengeSlug={challenge.slug} disabled={!session} submitted={query.submitted === "1"} error={query.error === "invalid-submission"}/></>}</div></section> : null}
      </div>
    </div>
  </div>;
}
