import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { db } from "./db";
import { docsSchema, messagesSchema } from "./db/schemas";
import { jobQueue } from "./lib/queue";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

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
            jobId: null,
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
        const job = await jobQueue.add(
          "file-process",
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

        // Update the file record with the job ID
        await db
          .update(docsSchema)
          .set({
            jobId: job.id,
          })
          .where(eq(docsSchema.id, savedFile[0].id));
        console.log("Files queued for processing:", job.id);
      }

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
          // Check if the user ID matches and the file is not deleted
          and(
            eq(docsSchema.user_id, userId),
            // status is not equal to "deleted"
            sql`${docsSchema.status} != 'deleted'`
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
   * Retry file processing on failure
   */
  static async handleRetryFile(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url);
      const fileId = url.searchParams.get("file_id");

      if (!fileId) {
        return Response.json({ error: "File ID is required" }, { status: 400 });
      }

      // Get file info first
      const file = await db
        .select({
          fileId: docsSchema.id,
          status: docsSchema.status,
          jobId: docsSchema.jobId,
          userId: docsSchema.user_id,
          path: docsSchema.path,
        })
        .from(docsSchema)
        .where(eq(docsSchema.id, fileId))
        .limit(1);

      if (!file.length) {
        return Response.json({ error: "File not found" }, { status: 404 });
      }

      if (file[0].status !== "error") {
        return Response.json(
          { error: "File is not in a failed state" },
          { status: 400 }
        );
      }
      // Check if the job is already in the queue
      const existingJob = await jobQueue.getJob(file[0].jobId);
      if (existingJob) {
        return Response.json(
          { error: "File is already being processed" },
          { status: 400 }
        );
      }
      // Retry the job
      const job = await jobQueue.add(
        "file-process",
        JSON.stringify({
          fileId: file[0].fileId,
          userId: file[0].userId,
          filePath: file[0].path,
        }),
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
        }
      );
      // Update the file record with the new job ID
      await db
        .update(docsSchema)
        .set({
          jobId: job.id,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .where(eq(docsSchema.id, file[0].fileId));
      console.log("Files queued for processing:", job.id);
      return Response.json({
        message: "File processing retried successfully",
        jobId: job.id,
      });
    } catch (error) {
      console.error("Error retrying file processing:", error);
      return Response.json(
        { error: "Failed to retry file processing" },
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
          jobId: docsSchema.jobId,
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

      // Optionally delete the file from the database
      // await db.delete(docsSchema).where(eq(docsSchema.id, fileId));

      // Optionally delete job from the queue

      const job = await jobQueue.remove(file[0].jobId);
      console.log(`Job ${file[0].jobId} removed from the queue`);

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

  /**
   * Chat with document
   */
  static async handleChatWithDocument(req: Request): Promise<Response> {
    try {
      const { userId, userQuery } = await req.json();

      if (!userId || !userQuery) {
        return Response.json(
          { error: "User ID, userQuery are required" },
          { status: 400 }
        );
      }

      const collectionName = `user-docs`;
      const embeddingModel = "embedding-001";

      const vectorStore = await getVectorStore({
        collectionName,
        embeddingModel,
      });

      const ret = vectorStore.asRetriever({
        k: 2,
      });
      const result = await ret.invoke(userQuery.toString());

      const SYSTEM_PROMPT = `
You are BOB, a sophisticated personal AI assistant designed for Priyanshu. Respond in a helpful, slightly witty manner similar to how Jarvis would assist Tony Stark.

USER PROFILE:
- Name: Priyanshu
- Occupation: Developer
- Interests: Programming, technology, learning new skills
- Current projects: Building a personal knowledge management system (CAIX)
- Learning focus: AI systems, RAG architectures, TypeScript

Context from Priyanshu's personal files:
${JSON.stringify(result)}

When responding to queries:
1. Prioritize information from Priyanshu's personal journals, blogs, notes, educational PDFs, and other documents.
2. Address Priyanshu by name occasionally to personalize the experience.
3. Reference specific documents naturally (e.g., "According to your journal entry from Tuesday..." or "In that TypeScript tutorial you uploaded...")
4. When explaining technical concepts from PDFs, connect them to Priyanshu's current projects when relevant.
5. Maintain a balance between being professional and personal - you're Priyanshu's trusted confidant and technical advisor.
6. Present information in a clear, organized manner using formatting when appropriate.
7. If you recognize patterns across multiple documents (like recurring topics in journals or coding notes), tactfully point them out.
8. Be direct and concise - value Priyanshu's time while still being thorough.
9. When appropriate, suggest connections between different documents or ideas.
10. Respect privacy completely - this is Priyanshu's personal system handling confidential information.

For educational content and learning:
1. Identify key concepts from educational PDFs and materials
2. Explain complex ideas in simpler terms when asked
3. Connect concepts to Priyanshu's development work when relevant
4. Suggest practical applications of theoretical knowledge to CAIX or other projects
5. Help create summaries and study notes from longer materials
6. Point out important code snippets, formulas, or methodologies
7. Answer follow-up questions with additional context from relevant documents

Remember key characteristics:
- Be helpful but not obsequious
- Be informative without being pedantic
- Be personable without being overly familiar
- Maintain a slight touch of dry wit when appropriate
- When teaching, be patient and encouraging
- Reference Priyanshu's interests and projects when relevant

If you don't have enough information from the provided context:
1. Clearly acknowledge this limitation
2. Suggest what information might help provide a better answer
3. Never fabricate information about Priyanshu's personal documents

Your primary purpose is to make Priyanshu's personal information and learning materials more accessible and useful, helping organize thoughts, recall important details, discover insights across personal documents, and facilitate learning from educational content.
`;

      const { text } = await generateText({
        model: google("gemini-1.5-flash"),
        system: SYSTEM_PROMPT,
        prompt: userQuery,
      });

      return Response.json({
        data: {
          text: text,
          context: result,
        },
      });
    } catch (error) {
      console.error("Error sending message:", error);
      return Response.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }
  }
}

import { sql } from "drizzle-orm";
import { getVectorStore } from "./lib/vector-store";
