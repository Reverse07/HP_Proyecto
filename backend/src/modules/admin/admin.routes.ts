import { Router } from 'express';
import { z } from 'zod';
import { pool, query } from '../../db/pool.js';
import { requireAuth,requireRole,requireUserFromDb } from '../../middleware/auth.js';
import { confirmByEmail } from '../../services/reservations.js';
import { isValidDate } from '../../lib/date.js';
const router=Router();
router.use(requireAuth,requireUserFromDb,requireRole('administrador'));
const dish=z.object({nombre:z.string().trim().min(2).max(100),descripcion:z.string().max(200),precio:z.number().positive().max(999999),id_categoria:z.number().int().positive(),ingredientes:z.string().max(250).default(''),permite_coccion:z.boolean(),disponibilidad:z.boolean(),estado:z.enum(['Activo','Inactivo']).default('Activo')});
function validate<T>(schema:z.ZodType<T>,body:unknown):T { const parsed=schema.safeParse(body); if(!parsed.success) throw Object.assign(new Error('Revisa los campos: '+parsed.error.issues.map(i=>i.path.join('.')).join(', ')),{status:422}); return parsed.data; }
router.get('/mesas',async(_req,res)=>res.json({mesas:(await query('SELECT * FROM terra_brasa.mesa ORDER BY id_mesa')).rows}));
router.patch('/mesas/:id',async(req,res)=>{
  const d=validate(z.object({estado:z.enum(['Disponible','No disponible']),capacidad:z.number().int().min(1).max(30),ubicacion:z.string().min(1).max(50)}).partial().refine(d=>Object.keys(d).length>0),req.body);
  const r=await query('UPDATE terra_brasa.mesa SET estado=COALESCE($1,estado),capacidad=COALESCE($2,capacidad),ubicacion=COALESCE($3,ubicacion) WHERE id_mesa=$4 RETURNING *',[d.estado,d.capacidad,d.ubicacion,req.params.id]);
  return res.status(r.rowCount?200:404).json(r.rowCount?{mesa:r.rows[0]}:{error:{message:'Mesa no encontrada'}});
});
router.get('/platillos',async(_req,res)=>res.json({platillos:(await query('SELECT * FROM terra_brasa.platillo ORDER BY id_platillo')).rows,categorias:(await query('SELECT * FROM terra_brasa.categoria ORDER BY id_categoria')).rows}));
router.post('/platillos',async(req,res)=>{
  const d=validate(dish,req.body);
  const r=await query('INSERT INTO terra_brasa.platillo(nombre,descripcion,precio,id_categoria,ingredientes,permite_coccion,disponibilidad,estado) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[d.nombre,d.descripcion,d.precio,d.id_categoria,d.ingredientes,d.permite_coccion,d.disponibilidad,d.estado]);
  return res.status(201).json({platillo:r.rows[0]});
});
router.put('/platillos/:id',async(req,res)=>{
  const d=validate(dish,req.body);
  const r=await query('UPDATE terra_brasa.platillo SET nombre=$1,descripcion=$2,precio=$3,id_categoria=$4,ingredientes=$5,permite_coccion=$6,disponibilidad=$7,estado=$8 WHERE id_platillo=$9 RETURNING *',[d.nombre,d.descripcion,d.precio,d.id_categoria,d.ingredientes,d.permite_coccion,d.disponibilidad,d.estado,req.params.id]);
  return res.status(r.rowCount?200:404).json({platillo:r.rows[0]});
});
router.patch('/platillos/:id/disponibilidad',async(req,res)=>{
  const d=validate(z.object({disponibilidad:z.boolean()}),req.body);
  const r=await query('UPDATE terra_brasa.platillo SET disponibilidad=$1 WHERE id_platillo=$2 RETURNING *',[d.disponibilidad,req.params.id]);
  return res.status(r.rowCount?200:404).json({platillo:r.rows[0]});
});
router.delete('/platillos/:id',async(req,res)=>{
  const r=await query("UPDATE terra_brasa.platillo SET estado='Inactivo',disponibilidad=false WHERE id_platillo=$1 RETURNING id_platillo",[req.params.id]);
  return res.status(r.rowCount?200:404).json({ok:!!r.rowCount});
});
router.put('/menu/:fecha',async(req,res)=>{
  const d=validate(z.object({platillos:z.array(z.number().int().positive()).max(100)}),req.body);
  if(!isValidDate(String(req.params.fecha))) return res.status(422).json({error:{message:'Fecha inválida'}});
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))",[req.params.fecha]);
    let id=(await client.query('SELECT id_menu FROM terra_brasa.menu_diario WHERE fecha=$1 AND id_restaurante=1 FOR UPDATE',[req.params.fecha])).rows[0]?.id_menu;
    if(!id) id=(await client.query("INSERT INTO terra_brasa.menu_diario(id_restaurante,fecha,nombre,descripcion) VALUES(1,$1,'Carta del día','Carta del restaurante') RETURNING id_menu",[req.params.fecha])).rows[0].id_menu;
    await client.query('DELETE FROM terra_brasa.menu_platillo WHERE id_menu=$1',[id]);
    for(const p of new Set(d.platillos)) await client.query('INSERT INTO terra_brasa.menu_platillo(id_menu,id_platillo) VALUES($1,$2)',[id,p]);
    await client.query('COMMIT'); return res.json({ok:true});
  } catch(e) {await client.query('ROLLBACK');throw e;} finally {client.release();}
});
router.get('/reservas',async(req,res)=>{
  const r=await query(`SELECT r.*,m.numero_mesa,c.nombres,c.correo,p.total,(SELECT estado FROM terra_brasa.confirmacion_email e WHERE e.id_reserva=r.id_reserva ORDER BY id_confirmacion DESC LIMIT 1) AS estado_correo FROM terra_brasa.reserva r JOIN terra_brasa.mesa m USING(id_mesa) JOIN terra_brasa.cliente c USING(id_cliente) JOIN terra_brasa.pedido p USING(id_reserva) WHERE ($1::date IS NULL OR fecha_reserva=$1::date) AND ($2::text IS NULL OR estado_reserva=$2) ORDER BY fecha_reserva,hora_reserva`,[req.query.fecha||null,req.query.estado||null]);
  return res.json({reservas:r.rows});
});
router.post('/reservas/:codigo/reenviar-correo',async(req,res)=>{
  const r=(await query('SELECT estado_reserva FROM terra_brasa.reserva WHERE codigo_reserva=$1',[req.params.codigo])).rows[0];
  if(!r||!['Pagada','Confirmada'].includes(r.estado_reserva)) return res.status(409).json({error:{message:'La reserva debe tener un pago aprobado'}});
  return res.json({estado:await confirmByEmail(String(req.params.codigo))});
});
router.get('/dashboard',async(_req,res)=>{
  const counts=(await query(`SELECT (SELECT COUNT(*) FROM terra_brasa.reserva WHERE fecha_reserva=CURRENT_DATE AND estado_reserva<>'Cancelada')::int AS reservas_hoy,(SELECT COALESCE(SUM(monto),0) FROM terra_brasa.pago WHERE estado='Aprobado' AND fecha_pago::date=CURRENT_DATE) AS ingresos_hoy`)).rows[0];
  const mesas=(await query(`SELECT m.*, CASE WHEN m.estado='No disponible' OR EXISTS(SELECT 1 FROM terra_brasa.reserva r WHERE r.id_mesa=m.id_mesa AND fecha_reserva=CURRENT_DATE AND estado_reserva<>'Cancelada' AND LOCALTIME>=hora_reserva AND LOCALTIME<hora_reserva+INTERVAL '2 hours') THEN 'ocupada' ELSE 'libre' END AS situacion FROM terra_brasa.mesa m ORDER BY id_mesa`)).rows;
  return res.json({...counts,mesas_ocupadas:mesas.filter(m=>m.situacion==='ocupada').length,mesas_libres:mesas.filter(m=>m.situacion==='libre').length,mesas,pedidos:(await query('SELECT estado,COUNT(*)::int AS cantidad FROM terra_brasa.pedido GROUP BY estado')).rows,proximas:(await query("SELECT codigo_reserva,fecha_reserva,hora_reserva,numero_asistentes FROM terra_brasa.reserva WHERE fecha_reserva>=CURRENT_DATE AND estado_reserva<>'Cancelada' ORDER BY fecha_reserva,hora_reserva LIMIT 10")).rows});
});
export default router;
