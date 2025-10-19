import { db } from "..";
import { feeds, InsertPost, posts } from "../schema";
import { eq } from "drizzle-orm";

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
    }).from(feeds).where(eq(feeds.user_id, userId)).innerJoin(posts, eq(feeds.id, posts.feed_id)).limit(limit);
    return results;
}