import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | undefined;
export function isDatabaseConfigured() { return Boolean(process.env.DATABASE_URL); }
export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  client ??= postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  return drizzle(client, { schema });
}
