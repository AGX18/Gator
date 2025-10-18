import { eq } from "drizzle-orm";
import { db } from "..";
import { feeds, users } from "../schema";
export async function createFeed(name: string, user_id: string, url: string) {
  const [result] = await db.insert(feeds).values({ name: name.trim(), user_id: user_id, url: url.trim() }).returning();
  return result;
}

export async function getAllFeedsWithUsers() {
  return await db.select().from(feeds).innerJoin(users, eq(feeds.user_id, users.id));
}


export async function getFeedByURL(url: string) {
    const [feed] = await db.select().from(feeds).where(eq(feeds.url, url.trim()));
    return feed;
}

export async function getFeedByID(id: string) {
    const [feed] = await db.select().from(feeds).where(eq(feeds.id, id));
    return feed;
}