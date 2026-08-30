import type { Metadata } from "next";
import { ChallengeCatalog } from "@/components/challenge-catalog";
import { getPublicChallenges } from "@/lib/queries";

export const metadata: Metadata = { title: "Utmaningar", description: "Hitta en OPSV-utmaning att bygga, bryta eller förbättra." };
export const dynamic = "force-dynamic";
export default async function ChallengesPage() { const challenges = await getPublicChallenges(); return <div className="page-shell"><header className="page-intro"><div><span className="eyebrow">INDEX / 001—{String(challenges.length).padStart(3,"0")}</span><h1>Utmaningar</h1></div><p>Små problem. Öppna verktyg. Jämförbara resultat. Välj en utmaning och gör den till din.</p></header><ChallengeCatalog items={challenges}/></div>; }
