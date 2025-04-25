import { Worker } from "bullmq";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "langchain/document";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import mime from "mime-types";
import { db } from "./db";
import { docsSchema } from "./db/schemas";
import { eq } from "drizzle-orm";
import { FILE_PROCESS_QUEUE } from "@/comman/constants";
import { getVectorStore } from "./lib/vector-store";

// Constants for text splitting
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

// Create hash for file deduplication
const createFileHash = (filePath: string): string => {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
};

// Support different file types
const getLoader = (filePath: string) => {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".pdf":
      return new PDFLoader(filePath);
    case ".docx":
    case ".doc":
      return new DocxLoader(filePath);
    case ".txt":
    case ".md":
    // return new TextLoader(filePath);
    case ".csv":
      return new CSVLoader(filePath);
    case ".json":
    // return new JSONLoader(filePath, "/texts");
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
};

// Main worker definition
const worker = new Worker(
  FILE_PROCESS_QUEUE,
  async (job) => {
    const { fileId, userId, filePath } = JSON.parse(job.data);
    console.log(`Processing file ${fileId} for user ${userId}`);

    try {
      // Update status to processing
      await db
        .update(docsSchema)
        .set({
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .where(eq(docsSchema.id, fileId));

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist at path: ${filePath}`);
      }

      // Get file metadata
      const fileStats = fs.statSync(filePath);
      const extension = path.extname(filePath).toLowerCase();
      const mimeType = mime.lookup(extension) || "application/octet-stream";
      const fileHash = createFileHash(filePath);

      // Update file metadata in database
      await db
        .update(docsSchema)
        .set({
          mime_type: mimeType,
          extension: extension.substring(1), // Remove the dot
          hash: fileHash,
        })
        .where(eq(docsSchema.id, fileId));

      // Get the appropriate loader based on file type
      const loader = getLoader(filePath);

      // Load the document
      const rawDocs = await loader.load();

      // Split text into chunks for better embedding
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: CHUNK_SIZE,
        chunkOverlap: CHUNK_OVERLAP,
      });

      // Process the documents with metadata
      const docs = await textSplitter.splitDocuments(rawDocs);

      // Add user and file metadata to each document
      const processedDocs = docs.map((doc) => {
        return new Document({
          pageContent: doc.pageContent,
          metadata: {
            ...doc.metadata,
            userId,
            fileId,
            fileName: path.basename(filePath),
            mimeType,
            fileHash,
            timestamp: new Date().toISOString(),
          },
        });
      });

      // Set up collection name with user ID for isolation
      const collectionName = `user-docs`;
      const embeddingModel = "embedding-001";

      // Initialize vector store
      const vectorStore = await getVectorStore({
        collectionName,
        embeddingModel,
      });

      // Add documents to vector store with metadata
      await vectorStore.addDocuments(processedDocs);

      // Update database record with all processing information
      await db
        .update(docsSchema)
        .set({
          status: "processed",
          chunk_count: processedDocs.length,
          collection: collectionName,
          embedding_model: embeddingModel,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          error_message: null, // Clear any previous errors
        })
        .where(eq(docsSchema.id, fileId));

      console.log(
        `File ${fileId} processed successfully with ${processedDocs.length} chunks`
      );

      return {
        status: "success",
        fileId,
        chunks: processedDocs.length,
        collection: collectionName,
      };
    } catch (error) {
      console.error(`Error processing file ${fileId}:`, error);

      // Update database with error status and message
      await db
        .update(docsSchema)
        .set({
          status: "error",
          error_message: error instanceof Error ? error.message : String(error),
          updated_at: new Date().toISOString(),
        })
        .where(eq(docsSchema.id, fileId));

      throw error;
    }
  },
  {
    concurrency: 5, // More reasonable concurrency to avoid overloading
    connection: {
      host: Bun.env.REDIS_HOST || "localhost",
      port: parseInt(Bun.env.REDIS_PORT || "6379"),
    },
    removeOnComplete: {
      age: 24 * 60 * 60, // Keep completed jobs for 1 day
      count: 1000, // Keep the last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60, // Keep failed jobs for 7 days for debugging
    },
  }
);

worker.on("stalled", (job) => {
  console.warn(`Job ${job} has stalled`);
});

// Handle worker events
worker.on("completed", (job) => {
  const { fileId } = JSON.parse(job.data);
  console.log(`Job completed for file ${fileId}`);
});

worker.on("failed", (job, err) => {
  if (job) {
    const { fileId } = JSON.parse(job.data);
    console.error(`Job failed for file ${fileId}:`, err);
  } else {
    console.error("Job failed:", err);
  }
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});

export default worker;
// import { Queue } from "bullmq";

// // Create a helper function to check jobs in queue
// async function checkQueueStatus() {
//   const queue = new Queue(QUEUE_NAME, {
//     connection: {
//       host: Bun.env.REDIS_HOST || "localhost",
//       port: parseInt(Bun.env.REDIS_PORT || "6379"),
//     },
//   });

//   // Get counts
//   const waiting = await queue.getWaitingCount();
//   const active = await queue.getActiveCount();
//   const completed = await queue.getCompletedCount();
//   const failed = await queue.getFailedCount();

//   console.log(
//     `Queue status - Waiting: ${waiting}, Active: ${active}, Completed: ${completed}, Failed: ${failed}`
//   );

//   // Get actual job data if needed
//   const waitingJobs = await queue.getWaiting();
//   console.log(
//     "Waiting jobs:",
//     waitingJobs.map((job) => ({ id: job.id, data: job.data }))
//   );
// }

// // Call this function to debug
// checkQueueStatus().catch(console.error);
