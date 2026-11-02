import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import type { AuthUser, Role } from '../types.js';

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(user: AuthUser) {
  return jwt.sign({ sub: String(user.id_cliente), email: user.correo, role: user.rol }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export function isRole(value: string): value is Role {
  return value === 'cliente' || value === 'administrador' || value === 'personal';
}
