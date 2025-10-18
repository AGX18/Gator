import { defineConfig } from "drizzle-kit";
import { readConfig } from "./src/config";
import { tr } from "zod/locales";

export default defineConfig({
  schema: "src/db/schema.ts",
  out: "src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DB_URL as string,
  },
  verbose: true,
  strict: true,
});