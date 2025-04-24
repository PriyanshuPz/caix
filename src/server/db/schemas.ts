import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

// Define possible document status values
export type DocumentStatus =
  | "pending"
  | "processing"
  | "processed"
  | "error"
  | "deleted";

export const docsSchema = pgTable("files", {
  // Core document fields
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  size: integer("size").notNull(),

  // File metadata
  mime_type: text("mime_type"),
  extension: text("extension"),
  hash: text("hash"), // For deduplication

  // Processing information
  status: text("status").$type<DocumentStatus>().default("pending"),
  chunk_count: integer("chunk_count"),
  collection: text("collection"), // Vector store collection name
  error_message: text("error_message"),

  // Embedding information
  embedding_model: text("embedding_model"),
  processed_at: text("processed_at"),

  // User relations
  user_id: text("user_id").notNull(),

  // Timestamps
  created_at: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull()
    .$onUpdate(() => new Date().toISOString()),

  // Optional thumbnail for visual documents
  // thumbnail: blob("thumbnail"),
});

// Message history
export const messagesSchema = pgTable("messages", {
  id: text("id").primaryKey().notNull(),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  user_id: text("user_id").notNull(),

  // Document context - which documents were referenced
  context_file_ids: text("context_file_ids"),

  parent_message_id: text("parent_message_id"),
  timestamps: text("timestamps")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// User sessions and preferences
export const usersSchema = pgTable("users", {
  id: text("id").primaryKey().notNull(),
  name: text("name"),
  email: text("email"),

  // Preferences
  theme: text("theme").default("system"),
  font_size: text("font_size").default("medium"),

  // Usage statistics
  message_count: integer("message_count").default(0),
  document_count: integer("document_count").default(0),

  created_at: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updated_at: text("updated_at")
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull()
    .$onUpdate(() => new Date().toISOString()),
});

import { sql } from "drizzle-orm";
