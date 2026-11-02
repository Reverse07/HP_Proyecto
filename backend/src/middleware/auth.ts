import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AuthUser, Role } from '../types.js';
import { query } from '../db/pool.js';

export type AuthRequest = Request & {
  user?: AuthUser;
};

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const rawHeader = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!rawHeader || !rawHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No autorizado' } });
  }

  const token = rawHeader.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    if (!payload.sub || !Number.isInteger(Number(payload.sub))) throw new Error('Token inválido');
    req.user = {
      id_cliente: Number(payload.sub),
      correo: payload.email,
      nombres: '',
      apellidos: '',
      rol: payload.role
    } as AuthUser;
    return next();
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token inválido' } });
  }
}

export async function requireUserFromDb(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No autorizado' } });

  const userResult = await query<{ id_cliente: number; nombres: string; apellidos: string; correo: string; telefono: string | null; rol: Role }>(
    'SELECT id_cliente, nombres, apellidos, correo, telefono, rol FROM terra_brasa.cliente WHERE id_cliente = $1',
    [req.user.id_cliente]
  );

  if (userResult.rowCount === 0) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Usuario no encontrado' } });
  }

  req.user = userResult.rows[0];
  return next();
}

export function requireRole(...roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No autorizado' } });
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'No tienes permisos para esta acción' } });
    }
    return next();
  };
}
