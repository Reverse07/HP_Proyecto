import { Pool, types, type QueryResultRow } from 'pg';
import { env } from '../config/env.js';

types.setTypeParser(1082, (value: string) => value);
export const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  options: '-c timezone=America/Lima',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]) {
  const result = await pool.query<T>(text, params);
  return result;
}
