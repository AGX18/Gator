import { db } from "..";
import { feeds } from "../schema";
export async function createFeed(name: string, user_id: string, url: string) {
  const [result] = await db.insert(feeds).values({ name: name, user_id: user_id, url: url }).returning();
  return result;
}