"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { challenges as challengeTable, submissions, users } from "@/db/schema";
import { gradeSubmissionAutomatically } from "./automatic-grading";
import { requireAdmin, requireDiscordParticipant } from "./auth";
import { challengeRecord } from "./challenge-persistence";
import { getChallenge } from "./data";
import { submissionSchema } from "./submission";
import { normalizePlaygroundName, savePlaygroundName } from "./users";

const nameSchema = z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9-]+$/);

export async function completeOnboarding(formData: FormData) {
  const participant = await requireDiscordParticipant({ profileRequired: false });
  const parsed = nameSchema.safeParse(formData.get("playgroundName"));
  if (!parsed.success) redirect("/onboarding?error=Använd+3–24+tecken:+bokstäver,+siffror+eller+bindestreck");
  try {
    const user = await savePlaygroundName(participant.id, normalizePlaygroundName(parsed.data));
    redirect(`/u/${user.playgroundName}`);
  } catch (error) {
    if (String(error).includes("unique")) redirect("/onboarding?error=Det+namnet+är+redan+upptaget");
    throw error;
  }
}

export async function submitChallenge(formData: FormData) {
  const participant = await requireDiscordParticipant();
  const parsed = submissionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/challenges/${String(formData.get("challengeSlug") ?? "")}?error=invalid-submission#workspace`);
  let [challenge] = await getDb().select().from(challengeTable).where(eq(challengeTable.publicId, parsed.data.challengeId)).limit(1);
  if (!challenge) {
    const builtIn = getChallenge(String(formData.get("challengeSlug") ?? ""));
    if (!builtIn || builtIn.publicId !== parsed.data.challengeId || builtIn.status === "Kommer snart") redirect("/challenges?error=challenge-closed");
    await getDb().insert(challengeTable).values(challengeRecord(builtIn)).onConflictDoNothing();
    [challenge] = await getDb().select().from(challengeTable).where(eq(challengeTable.publicId, parsed.data.challengeId)).limit(1);
  }
  if (!challenge || ["draft", "coming_soon", "archived"].includes(challenge.status)) redirect("/challenges?error=challenge-closed");
  const grade = gradeSubmissionAutomatically({ slug: challenge.slug, content: parsed.data.content, claimedScore: parsed.data.claimedScore });
  if (!grade.accepted) redirect(`/challenges/${challenge.slug}?error=automatic-grading#workspace`);
  const automaticallyVerified = grade.mode === "automatic";
  await getDb().insert(submissions).values({
    challengeId: challenge.id,
    userId: participant.id,
    submissionType: challenge.submissionType,
    githubUrl: parsed.data.githubUrl || null,
    demoUrl: parsed.data.demoUrl || null,
    content: parsed.data.content || null,
    claimedScore: parsed.data.claimedScore === "" ? null : parsed.data.claimedScore,
    status: automaticallyVerified ? "verified" : "pending",
    score: grade.score,
    reviewedAt: automaticallyVerified ? new Date() : null,
  });
  revalidatePath("/");
  revalidatePath("/challenges");
  revalidatePath("/leaderboard");
  revalidatePath(`/challenges/${challenge.slug}`);
  revalidatePath(`/u/${participant.playgroundName}`);
  redirect(`/challenges/${challenge.slug}?submitted=1${automaticallyVerified ? `&score=${grade.score}` : ""}#workspace`);
}

const reviewSchema = z.object({ submissionId: z.string().uuid(), intent: z.enum(["verified", "rejected"]), score: z.string().trim() });

export async function reviewSubmission(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin?error=invalid-review");
  const score = parsed.data.intent === "verified" ? Number(parsed.data.score) : null;
  if (parsed.data.intent === "verified" && (parsed.data.score === "" || !Number.isInteger(score) || (score ?? -1) < 0 || (score ?? 1_000_001) > 1_000_000)) redirect("/admin?error=invalid-score");
  const [submission] = await getDb().select({ id: submissions.id, userId: submissions.userId, challengeSlug: challengeTable.slug }).from(submissions).innerJoin(challengeTable, eq(submissions.challengeId, challengeTable.id)).where(eq(submissions.id, parsed.data.submissionId)).limit(1);
  if (!submission) redirect("/admin?error=missing-submission");
  await getDb().update(submissions).set({ status: parsed.data.intent, score, reviewedBy: admin.id, reviewedAt: new Date(), updatedAt: new Date() }).where(eq(submissions.id, submission.id));
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath(`/challenges/${submission.challengeSlug}`);
  const [owner] = await getDb().select({ playgroundName: users.playgroundName }).from(users).where(eq(users.id, submission.userId)).limit(1);
  if (owner?.playgroundName) revalidatePath(`/u/${owner.playgroundName}`);
  redirect(`/admin?reviewed=${submission.id}`);
}
