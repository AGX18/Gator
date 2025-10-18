import { db } from "..";
import { users } from "../schema";
import { eq } from "drizzle-orm";

export async function createUser(name: string) {
  const [result] = await db.insert(users).values({ name: name.trim() }).returning();
  return result;
}

export async function getUserByName(name: string) {
  const user = await db.select().from(users).where(eq(users.name, name));
  return user.length > 0 ? user[0] : null;
}

export async function deleteAllUsers() {
  await db.delete(users);
}

export async function getAllUsers() {
  return await db.select().from(users);
}

export function getUserById(id: string) {
  return db.select().from(users).where(eq(users.id, id));
}