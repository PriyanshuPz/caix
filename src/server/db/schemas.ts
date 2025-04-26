import {
  sqliteTable,
  text,
  integer,
  blob,
  customType,
  index,
} from "drizzle-orm/sqlite-core";

// Define a custom type for F32_BLOB(768)
const f32Blob1536 = customType<{
  data: unknown;
}>({
  dataType() {
    return "F32_BLOB(768)";
  },
});

// Define possible document status values
export type DocumentStatus =
  | "pending"
  | "processing"
  | "processed"
  | "error"
  | "deleted";

export const docsSchema = sqliteTable("files", {
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
export const messagesSchema = sqliteTable("messages", {
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
export const usersSchema = sqliteTable("users", {
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

export const vectorsSchema = sqliteTable(
  "vectors",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    content: text("content"),
    metadata: text("metadata"),
    embedding: f32Blob1536("embedding").notNull(),
  },
  (table) => [
    index("idx_vectors_embedding").on(
      sql`libsql_vector_idx(${table.embedding})`
    ),
  ]
);

import { sql } from "drizzle-orm";
