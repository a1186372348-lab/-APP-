import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

let pool: Pool;
let db: ReturnType<typeof drizzle>;

export function getDb() {
  if (!db) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    db = drizzle(pool, { schema });
  }
  return db;
}

export async function closeDb() {
  if (pool) await pool.end();
}
