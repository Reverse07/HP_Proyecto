import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { isValidDate } from '../../lib/date.js';

const router = Router();

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

router.get('/', async (req: any, res: any) => {
  const fecha = String(req.query.fecha || '');
  if (!dateSchema.safeParse(fecha).success || !isValidDate(fecha)) {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'La fecha es obligatoria y debe tener formato YYYY-MM-DD' } });
  }

  const result = await query<{ id_platillo: number; nombre: string; descripcion: string; precio: string; categoria: string; disponibilidad: boolean; permite_coccion: boolean }>(`
    SELECT p.id_platillo, p.nombre, p.descripcion, p.precio, c.nombre AS categoria,
           (p.disponibilidad AND p.estado='Activo') AS disponibilidad, p.permite_coccion, p.ingredientes
    FROM terra_brasa.menu_diario md
    JOIN terra_brasa.menu_platillo mp ON mp.id_menu = md.id_menu
    JOIN terra_brasa.platillo p ON p.id_platillo = mp.id_platillo
    JOIN terra_brasa.categoria c ON c.id_categoria = p.id_categoria
    WHERE md.fecha = $1 AND md.estado = 'Activo'
    ORDER BY c.nombre, p.nombre
  `, [fecha]);

  return res.json({ fecha, platillos: result.rows.map((row: any) => ({
    id: row.id_platillo,
    nombre: row.nombre,
    descripcion: row.descripcion,
    ingredientes: row.ingredientes,
    precio: Number(row.precio),
    categoria: row.categoria,
    disponibilidad: row.disponibilidad,
    permite_coccion: row.permite_coccion
  })) });
});

export default router;
