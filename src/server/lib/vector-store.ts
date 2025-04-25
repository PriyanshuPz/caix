import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";

export async function getVectorStore({
  collectionName = "user-docs",
  embeddingModel = "embedding-001",
}: {
  collectionName?: string;
  embeddingModel?: string;
}) {
  // Initialize embeddings with API key
  const apiKey = Bun.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }

  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: embeddingModel,
    apiKey,
  });

  // Initialize vector store
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: "http://localhost:6333",
      collectionName: collectionName,
    }
  );

  return vectorStore;
}
