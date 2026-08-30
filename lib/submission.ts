import { z } from "zod";

const optionalUrl = z.union([z.url(), z.literal("")]).optional().default("");
const optionalScore = z.union([
  z.literal(""),
  z.coerce.number().int().min(0).max(1_000_000),
]).optional().default("");

export const submissionSchema = z.object({
  challengeId: z.string().min(1),
  githubUrl: optionalUrl,
  demoUrl: optionalUrl,
  content: z.string().trim().max(50_000).optional().default(""),
  claimedScore: optionalScore,
}).refine(
  (data) => Boolean(data.githubUrl || data.demoUrl || data.content),
  { message: "Minst ett resultat krävs" },
);
