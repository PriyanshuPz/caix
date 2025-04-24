import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { db } from "./db";
import { docsSchema, messagesSchema, usersSchema } from "./db/schemas";
import { jobQueue } from "./lib/queue";
import { eq, and, desc } from "drizzle-orm";
import mime from "mime-types";
import crypto from "crypto";

const UPLOAD_DIR = "./uploads";
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/msword", // doc
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
];

export class Routes {
  /**
   * Handle file uploads
   */
  static async handleFileUpload(req: Request): Promise<Response> {
    try {
      const formdata = await req.formData();
      const files = formdata.getAll("files");
      const userId = formdata.get("user_id");

      // Validate user ID
      if (!userId || typeof userId !== "string") {
        return Response.json(
          { error: "Valid user ID is required" },
          { status: 400 }
        );
      }

      // Check if user exists
      // const user = await db
      //   .select({ id: usersSchema.id })
      //   .from(usersSchema)
      //   .where(eq(usersSchema.id, userId))
      //   .limit(1);

      // // Create user if not exists
      // if (user.length === 0) {
      //   await db.insert(usersSchema).values({
      //     id: userId,
      //     created_at: new Date().toISOString(),
      //   });
      // }

      // Validate files
      if (!files.length) {
        return Response.json({ error: "No files uploaded" }, { status: 400 });
      }

      let uploadedFiles = [];

      // Process each file
      for (const file of files) {
        if (!(file instanceof File)) continue;

        // Validate file size
        if (file.size > MAX_UPLOAD_SIZE) {
          return Response.json(
            { error: `File ${file.name} exceeds maximum upload size of 50MB` },
            { status: 400 }
          );
        }

        // Validate file type
        const fileType = file.type;
        if (
          !ALLOWED_FILE_TYPES.includes(fileType) &&
          !ALLOWED_FILE_TYPES.some((type) =>
            fileType.startsWith(type.split("/")[0])
          )
        ) {
          return Response.json(
            { error: `Unsupported file type: ${fileType}` },
            { status: 400 }
          );
        }

        // Generate a unique file ID
        const fileId = crypto.randomUUID();
        const buffer = await file.arrayBuffer();
        const filename = `${fileId}-${file.name.replace(
          /[^a-zA-Z0-9.-]/g,
          "_"
        )}`;
        const filepath = join(UPLOAD_DIR, filename);

        // Create uploads directory if it doesn't exist
        await mkdir(UPLOAD_DIR, { recursive: true });

        // Write file to disk
        await writeFile(filepath, Buffer.from(buffer));

        // Insert file record in database
        const savedFile = await db
          .insert(docsSchema)
          .values({
            id: fileId,
            name: file.name,
            path: filepath,
            size: file.size,
            user_id: userId.toString(),
            mime_type: file.type,
            extension: file.name.split(".").pop(),
            status: "pending",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .returning({ id: docsSchema.id });

        console.log(`Uploaded ${file.name} -> ${filepath} (ID: ${fileId})`);

        // Add to response
        uploadedFiles.push({
          id: savedFile[0].id,
          name: file.name,
          size: file.size,
          type: file.type,
        });

        // Queue file for processing
        await jobQueue.add(
          "processFile",
          JSON.stringify({
            fileId: savedFile[0].id,
            userId: userId.toString(),
            filePath: filepath,
          }),
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 1000,
            },
          }
        );
      }

      // Update user document count
      // await db.execute(sql`
      //   UPDATE users
      //   SET document_count = document_count + ${uploadedFiles.length},
      //       updated_at = CURRENT_TIMESTAMP
      //   WHERE id = ${userId}
      // `);

      return Response.json({
        message: "Files uploaded successfully",
        files: uploadedFiles,
      });
    } catch (error) {
      console.error("Error in file upload:", error);
      return Response.json(
        { error: "Failed to process file upload" },
        { status: 500 }
      );
    }
  }

  /**
   * List all files for a user
   */
  static async handleListFiles(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const userId = url.searchParams.get("user_id");

      if (!userId) {
        return Response.json({ error: "User ID is required" }, { status: 400 });
      }

      const files = await db
        .select({
          id: docsSchema.id,
          name: docsSchema.name,
          size: docsSchema.size,
          status: docsSchema.status,
          mimeType: docsSchema.mime_type,
          createdAt: docsSchema.created_at,
          updatedAt: docsSchema.updated_at,
          chunkCount: docsSchema.chunk_count,
        })
        .from(docsSchema)
        .where(
          and(
            eq(docsSchema.user_id, userId),
            eq(docsSchema.status, "processed")
          )
        )
        .orderBy(desc(docsSchema.created_at));

      return Response.json({ files });
    } catch (error) {
      console.error("Error listing files:", error);
      return Response.json(
        { error: "Failed to retrieve files" },
        { status: 500 }
      );
    }
  }

  /**
   * Get file status
   */
  static async handleFileStatus(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const fileId = url.searchParams.get("file_id");

      if (!fileId) {
        return Response.json({ error: "File ID is required" }, { status: 400 });
      }

      const file = await db
        .select({
          id: docsSchema.id,
          name: docsSchema.name,
          status: docsSchema.status,
          chunkCount: docsSchema.chunk_count,
          errorMessage: docsSchema.error_message,
          processedAt: docsSchema.processed_at,
        })
        .from(docsSchema)
        .where(eq(docsSchema.id, fileId))
        .limit(1);

      if (!file.length) {
        return Response.json({ error: "File not found" }, { status: 404 });
      }

      return Response.json(file[0]);
    } catch (error) {
      console.error("Error getting file status:", error);
      return Response.json(
        { error: "Failed to retrieve file status" },
        { status: 500 }
      );
    }
  }

  /**
   * Delete a file
   */
  static async handleDeleteFile(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const fileId = url.searchParams.get("file_id");
      const userId = url.searchParams.get("user_id");

      if (!fileId || !userId) {
        return Response.json(
          { error: "File ID and User ID are required" },
          { status: 400 }
        );
      }

      // Get file info first
      const file = await db
        .select({
          path: docsSchema.path,
          userId: docsSchema.user_id,
        })
        .from(docsSchema)
        .where(eq(docsSchema.id, fileId))
        .limit(1);

      if (!file.length) {
        return Response.json({ error: "File not found" }, { status: 404 });
      }

      // Check if user owns the file
      if (file[0].userId !== userId) {
        return Response.json(
          { error: "You don't have permission to delete this file" },
          { status: 403 }
        );
      }

      // Update the file status to "deleted" (soft delete)
      await db
        .update(docsSchema)
        .set({
          status: "deleted",
          updated_at: new Date().toISOString(),
        })
        .where(eq(docsSchema.id, fileId));

      // Optionally delete the physical file
      if (existsSync(file[0].path)) {
        await unlink(file[0].path);
      }

      // Update user document count
      // await db.execute(sql`
      //   UPDATE users
      //   SET document_count = document_count - 1,
      //       updated_at = CURRENT_TIMESTAMP
      //   WHERE id = ${userId}
      // `);

      return Response.json({
        message: "File deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      return Response.json({ error: "Failed to delete file" }, { status: 500 });
    }
  }

  /**
   * Get document chat history
   */
  static async handleGetMessages(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const userId = url.searchParams.get("user_id");
      const limit = url.searchParams.get("limit") || "50";

      if (!userId) {
        return Response.json({ error: "User ID is required" }, { status: 400 });
      }

      const messages = await db
        .select()
        .from(messagesSchema)
        .where(eq(messagesSchema.user_id, userId))
        .orderBy(desc(messagesSchema.timestamps))
        .limit(parseInt(limit));

      return Response.json({ messages });
    } catch (error) {
      console.error("Error getting messages:", error);
      return Response.json(
        { error: "Failed to retrieve messages" },
        { status: 500 }
      );
    }
  }
}

import { sql } from "drizzle-orm";
