import "server-only";

import { asc, desc, eq, ne } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/db";
import { badges, challenges as challengeTable, submissions, userBadges, users } from "@/db/schema";
import { activity as fallbackActivity, builders as fallbackBuilders, challenges as fallbackChallenges, type Challenge, type ChallengeStatus, type Difficulty } from "./data";
import { resolveDiscordDisplayName } from "./identity";
import { calculateGlobalRanking, selectBestPerChallenge } from "./ranking";
import { getUserByPlaygroundName } from "./users";

const statusLabels: Record<typeof challengeTable.$inferSelect.status, ChallengeStatus> = {
  draft: "Kommer snart",
  open: "Öppen",
  featured: "Utvald",
  new: "Ny",
  coming_soon: "Kommer snart",
  archived: "Kommer snart",
};

const difficultyLabels: Record<string, Difficulty> = { "lätt": "Lätt", medel: "Medel", "svår": "Svår", extrem: "Extrem" };

function toChallenge(row: typeof challengeTable.$inferSelect, counts: { submissions: number; participants: number }): Challenge {
  return {
    publicId: row.publicId,
    slug: row.slug,
    title: row.title,
    description: row.description,
    category: row.category,
    difficulty: difficultyLabels[row.difficulty] ?? "Medel",
    status: statusLabels[row.status],
    challengeType: row.challengeType,
    submissionType: row.submissionType,
    participants: counts.participants,
    submissions: counts.submissions,
    scoringLabel: row.scoringType,
    scoreFormula: row.scoreFormula,
    objective: row.objective,
    rules: row.rules,
    input: row.input,
    output: row.output,
    resources: row.resources,
  };
}

export async function getPublicChallenges(): Promise<Challenge[]> {
  if (!isDatabaseConfigured()) return fallbackChallenges;
  const [challengeRows, submissionRows] = await Promise.all([
    getDb().select().from(challengeTable).where(ne(challengeTable.status, "archived")).orderBy(asc(challengeTable.publicId)),
    getDb().select({ challengeId: submissions.challengeId, userId: submissions.userId }).from(submissions),
  ]);
  const counts = new Map<string, { submissions: number; participants: Set<string> }>();
  for (const row of submissionRows) {
    const current = counts.get(row.challengeId) ?? { submissions: 0, participants: new Set<string>() };
    current.submissions += 1;
    current.participants.add(row.userId);
    counts.set(row.challengeId, current);
  }
  const stored = challengeRows.filter((row) => row.status !== "draft").map((row) => {
    const count = counts.get(row.id);
    return toChallenge(row, { submissions: count?.submissions ?? 0, participants: count?.participants.size ?? 0 });
  });
  const storedIds = new Set(stored.map((challenge) => challenge.publicId));
  return [...stored, ...fallbackChallenges.filter((challenge) => challenge.status !== "Kommer snart" && !storedIds.has(challenge.publicId)).map((challenge) => ({ ...challenge, participants: 0, submissions: 0 }))]
    .sort((a, b) => a.publicId.localeCompare(b.publicId));
}

export async function getPublicChallenge(slug: string) {
  return (await getPublicChallenges()).find((challenge) => challenge.slug === slug) ?? null;
}

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  playgroundName: string;
  name: string;
  avatarUrl: string | null;
  score: number;
  wins: number;
  submissions: number;
  completed: number;
};

type VerifiedRow = {
  id: string;
  userId: string;
  challengeId: string;
  status: "pending" | "verified" | "rejected";
  score: number;
  createdAt: Date;
  playgroundName: string;
  discordUsername: string;
  discordDisplayName: string | null;
  avatarUrl: string | null;
};

async function getVerifiedRows(): Promise<VerifiedRow[]> {
  if (!isDatabaseConfigured()) return [];
  const rows = await getDb().select({
    id: submissions.id,
    userId: submissions.userId,
    challengeId: submissions.challengeId,
    status: submissions.status,
    score: submissions.score,
    createdAt: submissions.createdAt,
    playgroundName: users.playgroundName,
    discordUsername: users.discordUsername,
    discordDisplayName: users.discordDisplayName,
    avatarUrl: users.avatarUrl,
  }).from(submissions).innerJoin(users, eq(submissions.userId, users.id)).where(eq(submissions.status, "verified"));
  const verifiedRows: VerifiedRow[] = [];
  for (const row of rows) {
    if (row.score === null || row.playgroundName === null) continue;
    verifiedRows.push({ ...row, score: row.score, playgroundName: row.playgroundName });
  }
  return selectBestPerChallenge(verifiedRows);
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!isDatabaseConfigured()) return fallbackBuilders.map((builder) => ({ ...builder, userId: builder.name, playgroundName: builder.name, avatarUrl: null }));
  const verifiedRows = await getVerifiedRows();
  const ranked = calculateGlobalRanking(verifiedRows.map((row) => ({ userId: row.userId, score: row.score, status: "verified", createdAt: row.createdAt })));
  const identity = new Map(verifiedRows.map((row) => [row.userId, row]));
  const completed = new Map<string, Set<string>>();
  const winners = new Map<string, VerifiedRow>();
  for (const row of verifiedRows) {
    const set = completed.get(row.userId) ?? new Set<string>();
    set.add(row.challengeId);
    completed.set(row.userId, set);
    const winner = winners.get(row.challengeId);
    if (!winner || row.score > winner.score || (row.score === winner.score && row.createdAt < winner.createdAt)) winners.set(row.challengeId, row);
  }
  const wins = new Map<string, number>();
  for (const winner of winners.values()) wins.set(winner.userId, (wins.get(winner.userId) ?? 0) + 1);
  return ranked.map((entry) => {
    const user = identity.get(entry.userId)!;
    return {
      rank: entry.rank,
      userId: entry.userId,
      playgroundName: user.playgroundName,
      name: resolveDiscordDisplayName(user.discordDisplayName, user.discordUsername),
      avatarUrl: user.avatarUrl,
      score: entry.score,
      wins: wins.get(entry.userId) ?? 0,
      submissions: entry.submissions,
      completed: completed.get(entry.userId)?.size ?? 0,
    };
  });
}

export async function getProfile(playgroundName: string) {
  if (!isDatabaseConfigured()) {
    const fallback = fallbackBuilders.find((builder) => builder.name.toLowerCase() === playgroundName.toLowerCase());
    if (!fallback) return null;
    return { ...fallback, playgroundName: fallback.name, avatarUrl: null, work: fallbackChallenges.slice(0, 3).map((challenge, index) => ({ ...challenge, id: `mock-${challenge.slug}`, score: [947, 881, 794][index] })), badges: ["FÖRSTA BIDRAGET", "TOPP 03"] };
  }
  const user = await getUserByPlaygroundName(playgroundName);
  if (!user?.playgroundName) return null;
  const [allUserSubmissions, leaderboard, awardedBadges] = await Promise.all([
    getDb().select({ id: submissions.id, status: submissions.status, score: submissions.score, challengeId: submissions.challengeId, publicId: challengeTable.publicId, slug: challengeTable.slug, title: challengeTable.title, createdAt: submissions.createdAt }).from(submissions).innerJoin(challengeTable, eq(submissions.challengeId, challengeTable.id)).where(eq(submissions.userId, user.id)).orderBy(desc(submissions.score), desc(submissions.createdAt)),
    getLeaderboard(),
    getDb().select({ name: badges.name }).from(userBadges).innerJoin(badges, eq(userBadges.badgeId, badges.id)).where(eq(userBadges.userId, user.id)),
  ]);
  const ranking = leaderboard.find((entry) => entry.userId === user.id);
  const verified = allUserSubmissions.filter((submission) => submission.status === "verified" && submission.score !== null);
  return {
    rank: ranking?.rank ?? 0,
    playgroundName: user.playgroundName,
    name: resolveDiscordDisplayName(user.discordDisplayName, user.discordUsername),
    avatarUrl: user.avatarUrl,
    score: ranking?.score ?? 0,
    wins: ranking?.wins ?? 0,
    submissions: allUserSubmissions.length,
    completed: new Set(verified.map((submission) => submission.challengeId)).size,
    bio: user.bio || "Ny byggare i OPSV Playground.",
    work: verified.slice(0, 5),
    badges: awardedBadges.map((badge) => badge.name),
  };
}

function relativeTime(date: Date) {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "NYSS";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} MIN SEDAN`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} TIM SEDAN`;
  return `${Math.floor(seconds / 86400)} DAGAR SEDAN`;
}

export async function getHomeData() {
  const publicChallenges = await getPublicChallenges();
  if (!isDatabaseConfigured()) return { challenges: publicChallenges, activity: fallbackActivity.map((item) => ({ ...item, playgroundName: item.user })), stats: { activeChallenges: 4, totalSubmissions: 285, activeBuilders: 146, experiments: 9 } };
  const [submissionRows, userRows] = await Promise.all([
    getDb().select({ status: submissions.status, score: submissions.score, createdAt: submissions.createdAt, playgroundName: users.playgroundName, discordUsername: users.discordUsername, discordDisplayName: users.discordDisplayName, challengeTitle: challengeTable.title }).from(submissions).innerJoin(users, eq(submissions.userId, users.id)).innerJoin(challengeTable, eq(submissions.challengeId, challengeTable.id)).where(ne(submissions.status, "rejected")).orderBy(desc(submissions.createdAt)),
    getDb().select({ playgroundName: users.playgroundName }).from(users),
  ]);
  const activity = submissionRows.filter((row) => row.playgroundName).slice(0, 4).map((row) => ({
    user: resolveDiscordDisplayName(row.discordDisplayName, row.discordUsername),
    playgroundName: row.playgroundName!,
    action: row.status === "verified" && row.score !== null ? `FICK ${row.score} I` : "SKICKADE IN",
    target: row.challengeTitle,
    time: relativeTime(row.createdAt),
  }));
  return {
    challenges: publicChallenges,
    activity,
    stats: {
      activeChallenges: publicChallenges.filter((challenge) => challenge.status !== "Kommer snart").length,
      totalSubmissions: submissionRows.length,
      activeBuilders: userRows.filter((user) => user.playgroundName).length,
      experiments: publicChallenges.length,
    },
  };
}

export async function getAdminDashboard() {
  const [submissionRows, challengeRows] = await Promise.all([
    getDb().select({ id: submissions.id, status: submissions.status, score: submissions.score, claimedScore: submissions.claimedScore, githubUrl: submissions.githubUrl, demoUrl: submissions.demoUrl, content: submissions.content, reviewedBy: submissions.reviewedBy, createdAt: submissions.createdAt, updatedAt: submissions.updatedAt, playgroundName: users.playgroundName, discordUsername: users.discordUsername, discordDisplayName: users.discordDisplayName, challengeId: challengeTable.publicId, challengeSlug: challengeTable.slug, challengeTitle: challengeTable.title }).from(submissions).innerJoin(users, eq(submissions.userId, users.id)).innerJoin(challengeTable, eq(submissions.challengeId, challengeTable.id)).orderBy(desc(submissions.createdAt)),
    getDb().select().from(challengeTable).orderBy(asc(challengeTable.publicId)),
  ]);
  return {
    submissions: submissionRows.sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending")).map((row) => ({ ...row, displayName: resolveDiscordDisplayName(row.discordDisplayName, row.discordUsername) })),
    challenges: challengeRows,
  };
}
