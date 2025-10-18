import { config } from "dotenv";
import { Pool } from "pg";
import * as schema from "./schema";
import {remember } from "@epic-web/remember";
import { env, isProd } from "src/env";

import { drizzle } from 'drizzle-orm/node-postgres';
import { create } from "domain";

const createPool = () => {
  return new Pool({
    connectionString: env.DATABASE_URL,
  });
}

let client;
if (isProd()) {
    client = createPool();
} else {
    client = remember("pgPool", () => createPool());
}

export const db = drizzle({client: client, schema: schema});