import type { Challenge } from "./data";

const statusMap = { "Kommer snart": "coming_soon", "Öppen": "open", "Utvald": "featured", "Ny": "new" } as const;

export function challengeRecord(challenge: Challenge) {
  return {
    publicId: challenge.publicId, slug: challenge.slug, title: challenge.title,
    description: challenge.description, category: challenge.category,
    difficulty: challenge.difficulty.toLowerCase(), status: statusMap[challenge.status],
    challengeType: challenge.challengeType, submissionType: challenge.submissionType,
    objective: challenge.objective, rules: challenge.rules, input: challenge.input,
    output: challenge.output, scoringType: challenge.scoringLabel,
    scoreFormula: challenge.scoreFormula, resources: challenge.resources,
  };
}
