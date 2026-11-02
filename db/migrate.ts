import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const directory = fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: path.join(directory, '..', '.env') });

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5433),
  database: process.env.DB_NAME || process.env.POSTGRES_DB || 'terra_brasa',
  user: process.env.DB_USER || process.env.POSTGRES_USER || 'terra',
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'terra123',
  options: '-c timezone=America/Lima',
});

async function main() {
  await client.connect();

  const schemaSql = fs.readFileSync(path.join(directory, 'schema.sql'), 'utf8');
  const seedSql = fs.readFileSync(path.join(directory, 'seed.sql'), 'utf8');

  await client.query('BEGIN');
  await client.query(schemaSql);
  await client.query(seedSql);
  for (const [correo, password] of [['ana.torres@correo.com', 'Cliente123!'], ['admin@terrabrasa.pe', 'Admin123!'], ['cocina@terrabrasa.pe', 'Cocina123!']]) {
    await client.query('UPDATE terra_brasa.cliente SET contrasena = $1 WHERE correo = $2', [await bcrypt.hash(password, 10), correo]);
  }
  await client.query('COMMIT');

  console.log('Esquema y datos de demostración creados.');
}

main().catch((error) => {
  console.error('No se pudo inicializar la base de datos:', error);
  process.exitCode = 1;
}).finally(() => {
  client.end();
});
