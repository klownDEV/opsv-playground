import assert from "node:assert/strict";
import test from "node:test";
import { gradeSubmissionAutomatically } from "../lib/automatic-grading.ts";
import { countSourceTokens, REFERENCE_PROMPT } from "../lib/challenges/prompt-grader.ts";

test("prompt submissions are recomputed instead of trusting the claimed score", () => {
  const score = Math.round(100_000 / countSourceTokens(REFERENCE_PROMPT));
  assert.deepEqual(gradeSubmissionAutomatically({ slug:"prompt-compression", content:REFERENCE_PROMPT, claimedScore:score }), { mode:"automatic", accepted:true, score });
  assert.equal(gradeSubmissionAutomatically({ slug:"prompt-compression", content:REFERENCE_PROMPT, claimedScore:score + 1 }).accepted, false);
  assert.equal(gradeSubmissionAutomatically({ slug:"prompt-compression", content:"Svara kort.", claimedScore:1000 }).accepted, false);
});

test("fixed-score editor challenges require a complete local test result", () => {
  const api = "function findProduct(){} function searchProducts(){} function reserveStock(){} function basketTotal(){}".padEnd(140, " ");
  assert.deepEqual(gradeSubmissionAutomatically({ slug:"broken-api", content:api, claimedScore:1400 }), { mode:"automatic", accepted:true, score:1400 });
  assert.equal(gradeSubmissionAutomatically({ slug:"broken-api", content:api, claimedScore:1399 }).accepted, false);
  assert.deepEqual(gradeSubmissionAutomatically({ slug:"ui-rescue", content:"HTML\n<form><button>Betala</button></form>\n\nCSS\nbutton{}", claimedScore:100 }), { mode:"automatic", accepted:true, score:100 });
  assert.deepEqual(gradeSubmissionAutomatically({ slug:"requirements-shift", content:("HTML\n<section></section>\n\nCSS\nbody{}\n\nJAVASCRIPT\nfunction app(){} ").padEnd(320, " "), claimedScore:1300 }), { mode:"automatic", accepted:true, score:1300 });
  const guard=("HTML\n<div id=\"request-list\"></div><ol id=\"audit-log\"></ol>\n\nCSS\nbody{}\n\nJAVASCRIPT\nfunction evaluateAction(){} ").padEnd(520," ");
  assert.deepEqual(gradeSubmissionAutomatically({ slug:"mcp-guard", content:guard, claimedScore:2400 }), { mode:"automatic", accepted:true, score:2400 });
  assert.equal(gradeSubmissionAutomatically({ slug:"mcp-guard", content:guard, claimedScore:2300 }).accepted, false);
});

test("token score is calculated from submitted source", () => {
  const content = "function extractInvoice(text) { return { value: text }; }";
  const score = 20_000 - countSourceTokens(content);
  assert.deepEqual(gradeSubmissionAutomatically({ slug:"token-miser", content, claimedScore:score }), { mode:"automatic", accepted:true, score });
  assert.equal(gradeSubmissionAutomatically({ slug:"token-miser", content, claimedScore:20_000 }).accepted, false);
});

test("non-editor challenges retain the fallback workflow", () => {
  assert.deepEqual(gradeSubmissionAutomatically({ slug:"future-challenge", content:"https://example.com", claimedScore:"" }), { mode:"manual", accepted:true, score:null });
});
