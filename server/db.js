import pg from 'pg'
const { Pool } = pg

export const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: process.env.DB_PORT ?? 5432,
  user: process.env.DB_USER ?? 'rust',
  password: process.env.DB_PASSWORD ?? 'rust',
  database: process.env.DB_NAME ?? 'rustsets',
})

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      name TEXT PRIMARY KEY,
      price TEXT,
      hash TEXT,
      price_expires_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS items_sets (
      id SERIAL PRIMARY KEY,
      set_hash TEXT NOT NULL UNIQUE,
      items TEXT[] NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)
  console.log('[DB] schema ready')
}
