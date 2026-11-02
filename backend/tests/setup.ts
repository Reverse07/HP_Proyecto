import { Client } from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config({path:fileURLToPath(new URL('../../.env',import.meta.url))});
process.env.NODE_ENV='test';
process.env.DB_NAME='terra_brasa_test';
process.env.JWT_SECRET='terra-brasa-test-secret-local';
export async function setup() {
  const config={host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||5433),user:process.env.DB_USER||'terra',password:process.env.DB_PASSWORD||'terra123',options:'-c timezone=America/Lima'};
  const admin=new Client({...config,database:'postgres'});
  await admin.connect();
  if(!(await admin.query("SELECT 1 FROM pg_database WHERE datname='terra_brasa_test'")).rowCount)await admin.query('CREATE DATABASE terra_brasa_test');
  await admin.end();
  const db=new Client({...config,database:'terra_brasa_test'});await db.connect();
  try {
    await db.query(await readFile(fileURLToPath(new URL('../../db/schema.sql',import.meta.url)),'utf8'));
    await db.query(await readFile(fileURLToPath(new URL('../../db/seed.sql',import.meta.url)),'utf8'));
    for(const [email,password] of [['ana.torres@correo.com','Cliente123!'],['admin@terrabrasa.pe','Admin123!'],['cocina@terrabrasa.pe','Cocina123!']])await db.query('UPDATE terra_brasa.cliente SET contrasena=$1 WHERE correo=$2',[await bcrypt.hash(password,4),email]);
  }finally{await db.end();}
}
