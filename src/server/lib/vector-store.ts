import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { LibSQLVectorStore } from "@langchain/community/vectorstores/libsql";
import { createClient } from "@libsql/client";
import { DB_URL } from "@/comman/constants";

// Online instantiation
// const libsqlClient = createClient({
//   url: "libsql://[database-name]-[your-username].turso.io",
//   authToken: "...",
// });

// Local instantiation
const libsqlClient = createClient({
  url: DB_URL,
});

export async function getVectorStore({
  collectionName = "user-docs",
  embeddingModel = "embedding-001",
}: {
  collectionName?: string;
  embeddingModel?: string;
}) {
  // Initialize embeddings with API key
  const apiKey = Bun.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable"
    );
  }

  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: embeddingModel,
    apiKey,
  });

  // Initialize vector store
  // const vectorStore = await QdrantVectorStore.fromExistingCollection(
  //   embeddings,
  //   {
  //     url: "http://localhost:6333",
  //     collectionName: collectionName,
  //   }
  // );

  const vectorStore = new LibSQLVectorStore(embeddings, {
    db: libsqlClient,
  });

  return vectorStore;
}
