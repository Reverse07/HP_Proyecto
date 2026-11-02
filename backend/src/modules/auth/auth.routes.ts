import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { query } from '../../db/pool.js';
import { signToken } from '../../lib/auth.js';
import { requireAuth, requireUserFromDb } from '../../middleware/auth.js';
import type { AuthRequest } from '../../middleware/auth.js';
import type { Role } from '../../types.js';

const router = Router();

const registerSchema = z.object({
  nombres: z.string().trim().min(2).max(80),
  apellidos: z.string().trim().min(2).max(80),
  correo: z.string().trim().email().max(100).transform(v=>v.toLowerCase()),
  telefono: z.string().regex(/^\d{9}$/).optional().or(z.literal('')),
  contrasena: z.string().min(8).refine((value: string) => /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value), {
    message: 'La contraseña debe tener mayúscula, minúscula y número.'
  })
});

const loginSchema = z.object({
  correo: z.string().trim().email().transform(v=>v.toLowerCase()),
  contrasena: z.string().min(1)
});

router.post('/register', async (req: any, res: any) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        fields: parsed.error.flatten().fieldErrors
      }
    });
  }

  const { nombres, apellidos, correo, telefono, contrasena } = parsed.data;

  const existing = await query<{ id_cliente: number }>(
    'SELECT id_cliente FROM terra_brasa.cliente WHERE correo = $1',
    [correo]
  );

  if (existing.rowCount && existing.rowCount > 0) {
    return res.status(409).json({ error: { code: 'EMAIL_EXISTS', message: 'El correo ya está registrado' } });
  }

  const passwordHash = await bcrypt.hash(contrasena, 10);
  const insert = await query<{ id_cliente: number }>(
    `INSERT INTO terra_brasa.cliente (nombres, apellidos, correo, telefono, contrasena, rol) VALUES ($1, $2, $3, $4, $5, 'cliente') RETURNING id_cliente`,
    [nombres, apellidos, correo, telefono || null, passwordHash]
  );

  const user = {
    id_cliente: insert.rows[0].id_cliente,
    nombres,
    apellidos,
    correo,
    telefono: telefono || null,
    rol: 'cliente' as const
  };

  return res.status(201).json({
    user,
    token: signToken(user)
  });
});

router.post('/login', async (req: any, res: any) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos' } });
  }

  const { correo, contrasena } = parsed.data;
  const result = await query<{ id_cliente: number; nombres: string; apellidos: string; correo: string; telefono: string | null; rol: Role; contrasena: string }>(
    'SELECT * FROM terra_brasa.cliente WHERE correo = $1',
    [correo]
  );

  if (!result.rowCount || result.rowCount === 0) {
    return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas' } });
  }

  const user = result.rows[0];
  const passwordOk = await bcrypt.compare(contrasena, user.contrasena);

  if (!passwordOk) {
    return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas' } });
  }

  const safeUser = {
    id_cliente: user.id_cliente,
    nombres: user.nombres,
    apellidos: user.apellidos,
    correo: user.correo,
    telefono: user.telefono,
    rol: user.rol as Role
  };

  return res.json({ user: safeUser, token: signToken(safeUser) });
});

router.get('/me', requireAuth, requireUserFromDb, (req: AuthRequest, res: any) => {
  res.json({ user: req.user });
});

export default router;
