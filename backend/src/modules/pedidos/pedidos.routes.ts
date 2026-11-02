import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { requireAuth, requireRole, requireUserFromDb } from '../../middleware/auth.js';
import type { AuthRequest } from '../../middleware/auth.js';

const router = Router();

const transitionSchema = z.object({
  estado: z.enum(['Registrado', 'En preparación', 'Entregado', 'Completado'])
});

router.get('/', requireAuth, requireUserFromDb, requireRole('personal', 'administrador'), async (req: AuthRequest, res: any) => {
  const rows = await query<any>(`
    SELECT p.id_pedido, p.estado, r.codigo_reserva, r.fecha_reserva, r.hora_reserva, m.numero_mesa, m.ubicacion,
           (SELECT COALESCE(json_agg(a.nombre), '[]') FROM terra_brasa.alergia a JOIN terra_brasa.preferencia_cliente pc USING(id_preferencia) WHERE pc.id_reserva=r.id_reserva) AS alergias,
           (SELECT COALESCE(json_agg(a.nombre), '[]') FROM terra_brasa.restriccion_alimentaria a JOIN terra_brasa.preferencia_cliente pc USING(id_preferencia) WHERE pc.id_reserva=r.id_reserva) AS restricciones,
           COALESCE(json_agg(json_build_object('nombre', plat.nombre, 'cantidad', dp.cantidad, 'termino_coccion', dp.termino_coccion)) FILTER (WHERE plat.id_platillo IS NOT NULL), '[]') AS platillos
    FROM terra_brasa.pedido p
    JOIN terra_brasa.reserva r ON r.id_reserva = p.id_reserva
    JOIN terra_brasa.mesa m ON m.id_mesa = r.id_mesa
    LEFT JOIN terra_brasa.detalle_pedido dp ON dp.id_pedido = p.id_pedido
    LEFT JOIN terra_brasa.platillo plat ON plat.id_platillo = dp.id_platillo
    WHERE r.estado_reserva IN ('Pagada', 'Confirmada')
      AND ($1::text IS NULL OR p.estado=$1) AND ($2::date IS NULL OR r.fecha_reserva=$2::date)
    GROUP BY p.id_pedido, r.id_reserva, p.estado, r.codigo_reserva, r.fecha_reserva, r.hora_reserva, m.numero_mesa, m.ubicacion
    ORDER BY p.id_pedido DESC
  `, [req.query.estado || null,req.query.fecha || null]);
  res.json({ pedidos: rows.rows });
});

router.patch('/:id/estado', requireAuth, requireUserFromDb, requireRole('personal', 'administrador'), async (req: AuthRequest, res: any) => {
  const parsed = transitionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Estado inválido' } });

  const current = await query<{ estado: string }>('SELECT estado FROM terra_brasa.pedido WHERE id_pedido = $1', [req.params.id]);
  if (!current.rowCount || current.rowCount === 0) return res.status(404).json({ error: { code: 'PEDIDO_NO_ENCONTRADO', message: 'Pedido no encontrado' } });

  const order = ['Registrado', 'En preparación', 'Entregado', 'Completado'];
  const next = parsed.data.estado;
  const currentIndex = order.indexOf(current.rows[0].estado);
  const nextIndex = order.indexOf(next);

  if (currentIndex === -1 || nextIndex === -1 || nextIndex !== currentIndex + 1) {
    return res.status(422).json({ error: { code: 'TRANSICION_INVALIDA', message: 'Transición de pedido inválida' } });
  }

  const changed=await query('UPDATE terra_brasa.pedido SET estado = $1 WHERE id_pedido = $2 AND estado=$3', [next, req.params.id,current.rows[0].estado]);
  if(!changed.rowCount) return res.status(409).json({error:{message:'El pedido cambió. Actualiza el panel.'}});
  res.json({ ok: true, estado: next });
});

export default router;
