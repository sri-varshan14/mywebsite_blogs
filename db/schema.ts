import { sql } from "drizzle-orm";
import { pgTable, text, uuid, date } from "drizzle-orm/pg-core";

export const blog = pgTable('blogs', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    route: text('route').notNull().unique(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    readtime: text('readtime').notNull(),
    category: text('category').notNull(),
    markdown: text('markdown').notNull(),
    thumbnail: text('thumbnail').notNull(),
    date: date('date').default(sql`CURRENT_DATE`).notNull()
});

export const assets = pgTable('assets', {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    route: text('route').notNull().unique(),
    url: text('route').notNull()
})

export type Blog = typeof blog.$inferSelect
export type NewBlog = typeof blog.$inferInsert
export type Assets = typeof assets.$inferSelect
export type NewAssets = typeof assets.$inferInsert
