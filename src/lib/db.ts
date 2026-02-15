import { Pool } from "@neondatabase/serverless";
import { initSchema } from "./schema";
// import { seedIfEmpty } from "./seed"; // Disabled: start with empty database

const connectionString = process.env.DATABASE_URL!;

const pool = new Pool({ connectionString });

let initialized = false;

export async function getDb() {
  if (!initialized) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    // We can run migration/seed logic here if needed,
    // but in serverless env, it's better to be careful with concurrency.
    // For this MVP, we will try to init on first connection.
    const client = await pool.connect();
    try {
      await initSchema(client);
      // await seedIfEmpty(client); // Disabled: start with empty database
      initialized = true;
    } finally {
      client.release();
    }
  }
  return pool;
}
