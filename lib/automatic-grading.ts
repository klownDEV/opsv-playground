import { countSourceTokens, gradePrompt } from "./challenges/prompt-grader.ts";

export type AutomaticGrade =
  | { mode: "automatic"; accepted: true; score: number }
  | { mode: "automatic"; accepted: false; score: 0; reason: string }
  | { mode: "manual"; accepted: true; score: null };

type GradeInput = {
  slug: string;
  content: string;
  claimedScore: number | "";
};

function reject(reason: string): AutomaticGrade {
  return { mode: "automatic", accepted: false, score: 0, reason };
}

function hasEvery(value: string, markers: string[]) {
  return markers.every((marker) => value.includes(marker));
}

export function gradeSubmissionAutomatically({ slug, content, claimedScore }: GradeInput): AutomaticGrade {
  if (slug === "prompt-compression") {
    const result = gradePrompt(content);
    if (!result.complete) return reject("Prompten klarade inte serverns tolv kontroller.");
    if (claimedScore !== result.score) return reject("Poängen stämde inte med promptens tokenantal.");
    return { mode: "automatic", accepted: true, score: result.score };
  }

  if (slug === "broken-api") {
    const functions = ["findProduct", "searchProducts", "reserveStock", "basketTotal"];
    if (claimedScore !== 1400 || !hasEvery(content, functions) || content.length < 120) return reject("Kodresultatet matchade inte den godkända testkörningen.");
    return { mode: "automatic", accepted: true, score: 1400 };
  }

  if (slug === "ui-rescue") {
    if (claimedScore !== 100 || !hasEvery(content, ["HTML\n", "\n\nCSS\n", "<form", "button"])) return reject("UI-resultatet matchade inte den godkända UX-kontrollen.");
    return { mode: "automatic", accepted: true, score: 100 };
  }

  if (slug === "token-miser") {
    const score = Math.max(0, 20_000 - countSourceTokens(content));
    if (claimedScore !== score || score <= 0 || !/\bextractInvoice\s*\(/.test(content)) return reject("Poängen stämde inte med den godkända extraktionskoden.");
    return { mode: "automatic", accepted: true, score };
  }

  if (slug === "requirements-shift") {
    if (claimedScore !== 1300 || !hasEvery(content, ["HTML\n", "\n\nCSS\n", "\n\nJAVASCRIPT\n"]) || content.length < 300) return reject("Produktresultatet matchade inte de tretton godkända kontrollerna.");
    return { mode: "automatic", accepted: true, score: 1300 };
  }

  if (slug === "mcp-guard") {
    if (claimedScore !== 2400 || !hasEvery(content, ["HTML\n", "\n\nCSS\n", "\n\nJAVASCRIPT\n", "evaluateAction", "request-list", "audit-log"]) || content.length < 500) return reject("Säkerhetsprodukten matchade inte de 24 godkända kontrollerna.");
    return { mode: "automatic", accepted: true, score: 2400 };
  }

  return { mode: "manual", accepted: true, score: null };
}
