import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schemas";

const client = postgres("postgres://youruser:yourpass@localhost:5432/yourdb");
export const db = drizzle(client, { schema });
