import { getDb } from "./index";
import { challenges as challengeTable } from "./schema";
import { challenges } from "../lib/data";
import { challengeRecord } from "../lib/challenge-persistence";

for (const challenge of challenges) {
  const record = challengeRecord(challenge);
  await getDb().insert(challengeTable).values(record).onConflictDoUpdate({ target: challengeTable.publicId, set: { ...record, updatedAt: new Date() } });
}

console.log(`Lade in ${challenges.length} challenges.`);
process.exit(0);
