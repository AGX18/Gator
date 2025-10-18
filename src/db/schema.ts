import { relations } from "drizzle-orm";
import { pgTable, timestamp, uuid, text, unique } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  name: text("name").notNull().unique(),
});

export const feeds = pgTable("feeds", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  url: text("url").notNull().unique(),
  name: text("name").notNull(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const feed_follows = pgTable("feed_follows", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  feed_id: uuid("feed_id")
    .notNull()
    .references(() => feeds.id, { onDelete: 'cascade' }),

}, (table) => [
  unique().on(table.user_id, table.feed_id)
]);


export const userRelation = relations(users, ({ many }) => ({
  feeds: many(feeds),
  feedFollows: many(feed_follows),
}));

export const feedRelation = relations(feeds, ({ one, many }) => ({
  user: one(users, {
    fields: [feeds.user_id],
    references: [users.id],
  }),
  feedFollows: many(feed_follows),
}));

export const feedFollowRelations = relations(feed_follows, ({ one }) => ({
  users: one(users, {
    fields: [feed_follows.user_id],
    references: [users.id],
  }),
  feeds: one(feeds, {
    fields: [feed_follows.feed_id],
    references: [feeds.id],
  }),
}));

export type User = typeof users.$inferSelect; 
export type Feed = typeof feeds.$inferSelect; 

export const insertUserSchema = createInsertSchema(users);
export const insertFeedSchema = createInsertSchema(feeds);

export const selectUserSchema = createSelectSchema(users);
export const selectFeedSchema = createSelectSchema(feeds);