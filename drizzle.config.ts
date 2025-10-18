import { defineConfig } from "drizzle-kit";
import { readConfig } from "./src/config";
import { tr } from "zod/locales";
import { env } from "./src/env";


export default defineConfig({
  schema: "src/db/schema.ts",
  out: "src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});