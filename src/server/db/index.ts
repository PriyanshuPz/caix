// import { drizzle } from "drizzle-orm/postgres-js";
// import postgres from "postgres";
import { DB_URL } from "@/comman/constants";
import * as schema from "./schemas";

// const client = postgres(Bun.env.DATABASE_URL);
// export const db = drizzle(client, { schema });

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

const client = createClient({
  url: DB_URL,
});

export const db = drizzle(client, {
  schema,
});
