import Link from "next/link";
import type { Challenge } from "@/lib/data";

export function ChallengeRow({ challenge, index }: { challenge: Challenge; index?: number }) {
  const longTitle = challenge.title.length > 17;

  return <article className="challenge-row">
    <div className="challenge-index">{String(index ?? Number(challenge.publicId.slice(-3))).padStart(2, "0")}</div>
    <div className="challenge-main"><div className="challenge-kicker"><span>{challenge.publicId}</span><span>{challenge.category}</span></div><h3 className={longTitle ? "challenge-title-long" : undefined}><Link href={`/challenges/${challenge.slug}`}>{challenge.title}</Link></h3><p>{challenge.description}</p></div>
    <div className="challenge-meta"><span>{challenge.difficulty}</span><span>{challenge.status}</span><span>{challenge.submissions} bidrag</span><span>{challenge.scoringLabel}</span></div>
    <Link className="row-arrow" href={`/challenges/${challenge.slug}`} aria-label={`Öppna ${challenge.title}`}><span aria-hidden="true" /></Link>
  </article>;
}
