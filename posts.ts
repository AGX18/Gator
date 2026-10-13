import { db } from "..";
import {feed_follows, feeds, InsertPost, posts} from "../schema";
import {desc, eq} from "drizzle-orm";

export async function createPost(post: InsertPost) {
    const newPost = await db.insert(posts).values({
        title: post.title,
        url: post.url,
        description: post.description,
        feed_id: post.feed_id,
        published_at: post.published_at
    }).onConflictDoNothing();;

}


export async function getPostsForUser(userId: string, limit: number = 100) {
    let results;
    if (!limit) {
        limit = 2;
    } 
    results = await db.select({
        id: posts.id,
        title: posts.title,
        url: posts.url,
        description: posts.description,
        published_at: posts.published_at
    }).from(feed_follows)
        .where(eq(feed_follows.user_id, userId))
        .innerJoin(posts, eq(feed_follows.feed_id, posts.feed_id))
        .orderBy(desc(posts.published_at))
        .limit(limit);
    return results;
}