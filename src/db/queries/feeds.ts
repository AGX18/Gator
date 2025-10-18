import { eq, sql } from "drizzle-orm";
import { db } from "..";
import { feed_follows, feeds, SelectFeed, users } from "../schema";
import { get } from "http";
import { id } from "zod/v4/locales";
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

export async function markFeedFetched(id: string) {
  const [feed] = await db.update(feeds)
    .set({ last_fetched_at: new Date(), updatedAt: new Date() })
    .where(eq(feeds.id, id))
    .returning();
  return feed;
}

export async function getAllFeedsSortedByFetchTime(userId: string) {
  // Oldest fetched first, nulls first
  const feedsList = await db.select({
    url: feeds.url,
    id: feeds.id,
  }).from(feed_follows).where(eq(feed_follows.user_id, userId))
    .innerJoin(feeds, eq(feed_follows.feed_id, feeds.id))
    .orderBy(sql`${feeds.last_fetched_at} ASC NULLS FIRST`)
  return feedsList;
}

export async function getNextFeedToFetch(userId: string) {
  const [feed] = await getAllFeedsSortedByFetchTime(userId);
  return feed;
}


export async function deleteFeedById(id: string) {
    await db.delete(feeds).where(eq(feeds.id, id));
}