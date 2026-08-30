import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { reviewSubmission } from "@/lib/actions";
import { getSession } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin" };

const statusLabels = { pending: "VÄNTAR", verified: "VERIFIERAD", rejected: "AVSLAGEN" } as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string; reviewed?: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") return <div className="page-shell access-denied"><span className="eyebrow">ADMIN / 403</span><h1>Inte ditt<br/>labb.</h1><p>Den här sidan är begränsad till administratörer för Playground.</p><Link href="/">TILL STARTSIDAN →</Link></div>;
  const [{ submissions, challenges }, query] = await Promise.all([getAdminDashboard(), searchParams]);
  const pendingCount = submissions.filter((submission) => submission.status === "pending").length;
  return <div className="admin page-shell">
    <header className="page-intro"><div><span className="eyebrow">ADMIN / RESULTAT</span><h1>Kontroll<br/>rummet.</h1></div><p>Editorutmaningar rättas automatiskt och publiceras direkt. {pendingCount ? `${pendingCount} äldre eller externa bidrag kräver fortfarande beslut.` : "Inga bidrag väntar på manuell hantering."}</p></header>
    {query.reviewed && <p className="form-success" role="status">BIDRAGET HAR UPPDATERATS.</p>}
    {query.error && <p className="auth-error" role="alert">GRANSKNINGEN KUNDE INTE SPARAS. KONTROLLERA POÄNGEN OCH FÖRSÖK IGEN.</p>}
    <section className="admin-section">
      <header className="section-heading"><div><span className="section-number">01</span><span className="eyebrow">BIDRAG / {String(submissions.length).padStart(2,"0")}</span></div><span className="eyebrow">{pendingCount} VÄNTAR</span></header>
      <div className="review-list">{submissions.map((submission) => <article className={`review-card review-${submission.status}`} key={submission.id}>
        <header><div><span className="review-status">{statusLabels[submission.status]}</span><span>{submission.challengeId}</span></div><time>{submission.createdAt.toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" })}</time></header>
        <div className="review-main"><div><Link href={submission.playgroundName ? `/u/${submission.playgroundName}` : "#"} className="review-user">{submission.displayName}</Link><Link href={`/challenges/${submission.challengeSlug}`} className="review-challenge">{submission.challengeTitle} ↗</Link></div><div className="review-links">{submission.githubUrl && <a href={submission.githubUrl} target="_blank" rel="noreferrer">GITHUB ↗</a>}{submission.demoUrl && <a href={submission.demoUrl} target="_blank" rel="noreferrer">DEMO ↗</a>}{!submission.githubUrl && !submission.demoUrl && <span>INGA EXTERNA LÄNKAR</span>}</div></div>
        {submission.content && <p className="review-content">{submission.content}</p>}
        {submission.status === "pending" ? <form className="review-form" action={reviewSubmission}><input type="hidden" name="submissionId" value={submission.id}/><label htmlFor={`score-${submission.id}`}>VERIFIERAD POÄNG</label><input id={`score-${submission.id}`} name="score" type="number" min="0" max="1000000" defaultValue={submission.score ?? submission.claimedScore ?? ""} placeholder="0"/><button className="button button-accent" type="submit" name="intent" value="verified">GODKÄNN <span>✓</span></button><button className="button button-muted" type="submit" name="intent" value="rejected">AVSLÅ <span>×</span></button></form> : <p className="review-auto-result">{submission.reviewedBy ? "JUSTERAT AV ADMIN" : "AUTOMATISKT RÄTTAT"} · {submission.score ?? 0} POÄNG</p>}
      </article>)}{submissions.length === 0 && <p className="empty-state">Inga bidrag har skickats in ännu.</p>}</div>
    </section>
    <section className="admin-section"><header className="section-heading"><div><span className="section-number">02</span><span className="eyebrow">UTMANINGAR / {String(challenges.length).padStart(2,"0")}</span></div></header><div className="admin-head"><span>ID</span><span>Utmaning</span><span>Status</span><span>Typ</span><span>Öppna</span></div>{challenges.map((challenge) => <div className="admin-row" key={challenge.id}><span>{challenge.publicId}</span><strong>{challenge.title}</strong><span>{challenge.status}</span><span>{challenge.submissionType}</span><Link href={`/challenges/${challenge.slug}`}>VISA ↗</Link></div>)}</section>
  </div>;
}
