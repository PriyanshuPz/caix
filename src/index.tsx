import { serve } from "bun";
import { Routes } from "./server/routes";
import index from "@/index.html";

const server = serve({
  development: process.env.NODE_ENV !== "production",
  routes: {
    "/*": index,
    "/api/files": {
      POST: Routes.handleFileUpload,
      GET: Routes.handleListFiles,
      DELETE: Routes.handleDeleteFile,
    },
    "/api/chat": {
      POST: Routes.handleChatWithDocument,
    },
  },
});

console.log(`🚀 Server running at ${server.url}`);
