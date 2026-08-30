import assert from "node:assert/strict";
import test from "node:test";
import { calculateGlobalRanking, selectBestPerChallenge } from "../lib/ranking.ts";
import { normalizePlaygroundName, resolveDiscordDisplayName, suggestPlaygroundName } from "../lib/identity.ts";

test("normalizes public names consistently", () => { assert.equal(normalizePlaygroundName("  Void DEV!!  "), "void-dev"); assert.equal(normalizePlaygroundName("a---b"), "a-b"); });
test("prefers Discord display names and derives profile addresses from them", () => { assert.equal(resolveDiscordDisplayName(" Fredrik Larsson ", "flv11"), "Fredrik Larsson"); assert.equal(resolveDiscordDisplayName(null, "flv11"), "flv11"); assert.equal(suggestPlaygroundName("Fredrik Larsson", "flv11"), "fredrik-larsson"); });
test("ranking ignores unverified scores and uses score order", () => { const now = new Date("2026-08-24"); const result = calculateGlobalRanking([{ userId:"a", score:200, status:"verified", createdAt:now },{ userId:"b", score:300, status:"verified", createdAt:now },{ userId:"a", score:999, status:"pending", createdAt:now }]); assert.deepEqual(result.map(({ userId, score, rank }) => ({ userId, score, rank })), [{ userId:"b", score:300, rank:1 },{ userId:"a", score:200, rank:2 }]); });
test("only the best verified result per user and challenge is ranked", () => {
  const old = new Date("2026-08-24");
  const recent = new Date("2026-08-25");
  const best = selectBestPerChallenge([
    { userId:"a", challengeId:"one", score:100, status:"verified", createdAt:old },
    { userId:"a", challengeId:"one", score:200, status:"verified", createdAt:recent },
    { userId:"a", challengeId:"two", score:50, status:"verified", createdAt:recent },
  ]);
  assert.deepEqual(best.map((entry) => entry.score).sort((a, b) => a! - b!), [50, 200]);
});
