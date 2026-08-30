ALTER TABLE "challenges" ADD COLUMN "input" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "output" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "score_formula" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "resources" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "submissions" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;