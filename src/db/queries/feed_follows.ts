import {feed_follows, feeds, users} from "../schema";
import { db } from "..";
import { and, eq } from "drizzle-orm";
import { get } from "http";


export async function createFeedFollow(user_id: string, feed_id: string) {
    const newFeedFollow = await insertFeedFollow(user_id, feed_id);
    const [res] = await db.select().from(feed_follows)
        .innerJoin(feeds, eq(feed_follows.feed_id, feeds.id))
        .innerJoin(users, eq(feed_follows.user_id, users.id))
        .where(and(eq(feed_follows.id, newFeedFollow.id), eq(users.id, user_id)));
    return res;
}

export async function insertFeedFollow(user_id: string, feed_id: string) {
    const [newFeedFollow] = await db.insert(feed_follows).values({ user_id: user_id, feed_id: feed_id }).returning();
    return newFeedFollow;
}

/**
 * return all the feed follows for a given user, and include the names of the feeds and user in the result.
 * @param user_id the id of the user that we get the feedfollows for
 * @returns all the feeds that the user follows
 */
export async function getFeedFollowByUser(user_id: string) {
    const feedFollow = await db.select()
        .from(feed_follows)
        .innerJoin(feeds, eq(feeds.id, feed_follows.feed_id))
        .where(eq(feed_follows.user_id, user_id));
    return feedFollow;
}


export async function deleteFeedFollow(user_id: string, feed_id: string) {
    await db.delete(feed_follows)
        .where(and(eq(feed_follows.user_id, user_id), eq(feed_follows.feed_id, feed_id)));
}