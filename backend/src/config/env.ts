import { z } from 'zod';
z.config(z.locales.es());
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  JWT_SECRET: z.string().min(16).default('terra-brasa-secret-2026'),
  JWT_EXPIRES_IN: z.enum(['1h', '8h', '24h']).default('8h'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5433),
  DB_NAME: z.string().default('terra_brasa'),
  DB_USER: z.string().default('terra'),
  DB_PASSWORD: z.string().default('terra123'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM: z.string().default('reservas@terrabrasa.pe'),
  MAILHOG_UI: z.string().default('http://localhost:8025')
});

export const env = envSchema.parse(process.env);
