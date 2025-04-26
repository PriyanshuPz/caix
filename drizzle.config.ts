import { defineConfig } from "drizzle-kit";
import { DB_URL } from "@/comman/constants";
import "dotenv/config";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/server/db/schemas.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: DB_URL,
  },
});
