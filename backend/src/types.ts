export type Role = 'cliente' | 'administrador' | 'personal';

export interface AuthUser {
  id_cliente: number;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono?: string | null;
  rol: Role;
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}
