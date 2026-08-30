import assert from "node:assert/strict";
import test from "node:test";
import { submissionSchema } from "../lib/submission.ts";

test("accepts editor submissions without link fields", () => {
  const result = submissionSchema.safeParse({
    challengeId:"OPSV-001",
    content:"En komprimerad prompt",
    claimedScore:"1234",
  });

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.data.githubUrl, "");
  assert.equal(result.data.demoUrl, "");
  assert.equal(result.data.claimedScore, 1234);
});

test("keeps an empty score empty instead of coercing it to zero", () => {
  const result = submissionSchema.safeParse({ challengeId:"OPSV-001", content:"Resultat", claimedScore:"" });
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.claimedScore, "");
});

test("accepts a standard link submission", () => {
  const result = submissionSchema.safeParse({ challengeId:"OPSV-001", githubUrl:"https://github.com/opsv/example" });
  assert.equal(result.success, true);
});

test("rejects empty submissions and invalid links", () => {
  assert.equal(submissionSchema.safeParse({ challengeId:"OPSV-001" }).success, false);
  assert.equal(submissionSchema.safeParse({ challengeId:"OPSV-001", githubUrl:"inte-en-url" }).success, false);
});
