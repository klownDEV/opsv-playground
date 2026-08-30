import { integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export type ChallengeResource = { label: string; href: string };

export const userRole = pgEnum("user_role", ["member", "admin"]);
export const challengeStatus = pgEnum("challenge_status", ["draft", "open", "featured", "new", "coming_soon", "archived"]);
export const submissionStatus = pgEnum("submission_status", ["pending", "verified", "rejected"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(), discordId: text("discord_id").notNull().unique(), discordUsername: text("discord_username").notNull(),
  discordDisplayName: text("discord_display_name"), avatarUrl: text("avatar_url"), playgroundName: text("playground_name"), playgroundNameNormalized: text("playground_name_normalized"),
  bio: text("bio").notNull().default(""), role: userRole("role").notNull().default("member"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("users_playground_name_normalized_idx").on(table.playgroundNameNormalized)]);

export const challenges = pgTable("challenges", {
  id: uuid("id").primaryKey().defaultRandom(), publicId: text("public_id").notNull().unique(), slug: text("slug").notNull().unique(), title: text("title").notNull(), description: text("description").notNull(),
  category: text("category").notNull(), difficulty: text("difficulty").notNull(), status: challengeStatus("status").notNull().default("draft"), challengeType: text("challenge_type").notNull(), submissionType: text("submission_type").notNull(),
  objective: text("objective").notNull(), rules: text("rules").array().notNull(), input: text("input").notNull().default(""), output: text("output").notNull().default(""),
  scoringType: text("scoring_type").notNull(), scoreFormula: text("score_formula").notNull().default(""), resources: jsonb("resources").$type<ChallengeResource[]>().notNull().default([]), createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(), challengeId: uuid("challenge_id").notNull().references(() => challenges.id, { onDelete: "cascade" }), userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  submissionType: text("submission_type").notNull(), githubUrl: text("github_url"), demoUrl: text("demo_url"), content: text("content"), claimedScore: integer("claimed_score"), score: integer("score"), status: submissionStatus("status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }), reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const badges = pgTable("badges", { id: uuid("id").primaryKey().defaultRandom(), slug: text("slug").notNull().unique(), name: text("name").notNull(), description: text("description").notNull() });
export const userBadges = pgTable("user_badges", { userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), badgeId: uuid("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }), awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [primaryKey({ columns: [table.userId, table.badgeId] })]);
