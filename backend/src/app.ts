import express from 'express';
import 'express-async-errors';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import authRoutes from './modules/auth/auth.routes.js';
import disponibilidadRoutes from './modules/disponibilidad/disponibilidad.routes.js';
import menuRoutes from './modules/menu/menu.routes.js';
import reservasRoutes from './modules/reservas/reservas.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import pedidosRoutes from './modules/pedidos/pedidos.routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT', message: 'Demasiadas solicitudes. Inténtalo más tarde.' } }
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT', message: 'Demasiadas solicitudes de pago. Inténtalo más tarde.' } }
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/disponibilidad', disponibilidadRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/reservas', paymentLimiter, reservasRoutes);
app.use('/api/admin', authLimiter, adminRoutes);
app.use('/api/pedidos', authLimiter, pedidosRoutes);

app.get('/api/health', (_req: any, res: any) => {
  res.json({ ok: true, name: 'terra-brasa-api' });
});

app.use((req: any, res: any) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } });
});

app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = error.status ?? (error.code === '23505' ? 409 : 500);
  res.status(status).json({ error: { code: status === 409 ? 'CONFLICTO' : 'ERROR', message: status === 409 ? 'El registro ya existe' : status === 400 ? 'JSON inválido' : status === 422 ? error.message : 'No se pudo completar la operación. Inténtalo nuevamente.' } });
});

export default app;
