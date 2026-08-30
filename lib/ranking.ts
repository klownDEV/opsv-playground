export type RankableSubmission = { userId: string; score: number | null; status: string; createdAt: Date };

export type ChallengeSubmission = RankableSubmission & { challengeId: string };

export function selectBestPerChallenge<T extends ChallengeSubmission>(submissions: T[]) {
  const best = new Map<string, T>();
  for (const submission of submissions) {
    if (submission.status !== "verified" || submission.score === null) continue;
    const key = `${submission.userId}:${submission.challengeId}`;
    const current = best.get(key);
    if (!current || submission.score > current.score! || (submission.score === current.score && submission.createdAt < current.createdAt)) best.set(key, submission);
  }
  return [...best.values()];
}

export function calculateGlobalRanking(submissions: RankableSubmission[]) {
  const totals = new Map<string, { score: number; submissions: number; latest: Date }>();
  for (const entry of submissions) {
    if (entry.status !== "verified" || entry.score === null) continue;
    const current = totals.get(entry.userId) ?? { score: 0, submissions: 0, latest: entry.createdAt };
    current.score += entry.score;
    current.submissions += 1;
    if (entry.createdAt > current.latest) current.latest = entry.createdAt;
    totals.set(entry.userId, current);
  }
  return [...totals.entries()]
    .map(([userId, value]) => ({ userId, ...value }))
    .sort((a, b) => b.score - a.score || a.latest.getTime() - b.latest.getTime())
    .map((entry, index) => ({ rank: index + 1, ...entry }));
}
