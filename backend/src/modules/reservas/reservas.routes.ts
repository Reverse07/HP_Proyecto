import { Router } from 'express';
import { z } from 'zod';
import { randomInt } from 'node:crypto';
import { pool, query } from '../../db/pool.js';
import { requireAuth, requireRole, requireUserFromDb, type AuthRequest } from '../../middleware/auth.js';
import { isDateAtLeastOneDayInAdvance } from '../../lib/date.js';
import { confirmByEmail, expireReservations, getSlots, reservationDetail } from '../../services/reservations.js';
import { gateway } from '../../services/payment.js';
const router = Router();
router.use(requireAuth, requireUserFromDb);
const cooking = z.enum(['Jugoso','Al punto','Tres cuartos','Bien cocido']);
const preference = z.object({nombre:z.string().trim().min(1).max(80),descripcion:z.string().max(150).optional()});
const schema = z.object({fecha:z.string(),hora:z.string(),asistentes:z.number().int().min(1).max(30),id_mesa:z.number().int().positive(),
  items:z.array(z.object({id_platillo:z.number().int().positive(),cantidad:z.number().int().min(1).max(20),termino_coccion:cooking.optional()})).min(1),
  alergias:z.array(preference).max(20).default([]),restricciones:z.array(preference).max(20).default([]),sin_restricciones:z.boolean().default(false)});
router.post('/',requireRole('cliente'),async(req:AuthRequest,res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({error:{code:'VALIDATION_ERROR',message:Array.isArray(req.body?.items) && req.body.items.length === 0 ? 'Para reservar debes pedir al menos un plato' : 'Completa los campos obligatorios con datos válidos',fields:parsed.error.flatten().fieldErrors}});
  const d = parsed.data;
  if (!isDateAtLeastOneDayInAdvance(d.fecha)) return res.status(422).json({error:{code:'ANTICIPACION_MINIMA',message:'La reserva requiere al menos 1 día de anticipación'}});
  if (!(await getSlots(d.fecha)).includes(d.hora as any)) return res.status(422).json({error:{code:'SLOT_INVALIDO',message:'Hora no válida para reservas'}});
  if (d.sin_restricciones && (d.alergias.length || d.restricciones.length)) return res.status(422).json({error:{code:'PREFERENCIAS_INVALIDAS',message:'Revisa tus alergias y restricciones'}});
  await expireReservations();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const fail = (message:string,status=422):never => { throw Object.assign(new Error(message),{status}); };
    const mesa = (await client.query('SELECT * FROM terra_brasa.mesa WHERE id_mesa=$1 FOR SHARE',[d.id_mesa])).rows[0];
    if (!mesa) fail('Mesa no encontrada',404);
    if (mesa.estado !== 'Disponible') fail('La mesa ya no está disponible',409);
    if (mesa.capacidad < d.asistentes) fail('La mesa no cumple la capacidad requerida');
    const items = [];
    let cents = 0;
    for (const i of d.items) {
      const p = (await client.query(`SELECT p.* FROM terra_brasa.platillo p WHERE id_platillo=$1 AND EXISTS(SELECT 1 FROM terra_brasa.menu_diario md JOIN terra_brasa.menu_platillo mp USING(id_menu) WHERE md.fecha=$2 AND md.estado='Activo' AND mp.id_platillo=p.id_platillo) FOR SHARE`,[i.id_platillo,d.fecha])).rows[0];
      if (!p || !p.disponibilidad || p.estado !== 'Activo') fail('Hay platillos no disponibles en tu pedido');
      if (i.termino_coccion && !p.permite_coccion) fail('Este platillo no permite elegir cocción');
      cents += Math.round(Number(p.precio)*100)*i.cantidad;
      items.push({...i,precio:Number(p.precio)});
    }
    let codigo = '';
    let id = 0;
    for (let attempt=0;attempt<20;attempt++) {
      codigo = `TB-${String(randomInt(0,10000)).padStart(4,'0')}`;
      const r = await client.query(`INSERT INTO terra_brasa.reserva(id_cliente,id_mesa,id_restaurante,fecha_reserva,hora_reserva,numero_asistentes,codigo_reserva) VALUES($1,$2,1,$3,$4,$5,$6) ON CONFLICT(codigo_reserva) DO NOTHING RETURNING id_reserva`,[req.user!.id_cliente,d.id_mesa,d.fecha,d.hora,d.asistentes,codigo]);
      if (r.rows[0]) { id=r.rows[0].id_reserva; break; }
    }
    if (!id) fail('No se pudo generar el código. Inténtalo nuevamente.',503);
    const pedido = (await client.query('INSERT INTO terra_brasa.pedido(id_reserva,subtotal,total) VALUES($1,$2,$2) RETURNING id_pedido',[id,cents/100])).rows[0].id_pedido;
    for (const i of items) await client.query('INSERT INTO terra_brasa.detalle_pedido(id_pedido,id_platillo,cantidad,precio_unitario,subtotal,termino_coccion) VALUES($1,$2,$3,$4,$5,$6)',[pedido,i.id_platillo,i.cantidad,i.precio,i.precio*i.cantidad,i.termino_coccion ?? null]);
    const pref = (await client.query('INSERT INTO terra_brasa.preferencia_cliente(id_reserva) VALUES($1) RETURNING id_preferencia',[id])).rows[0].id_preferencia;
    for (const a of d.alergias) await client.query('INSERT INTO terra_brasa.alergia(id_preferencia,nombre,descripcion) VALUES($1,$2,$3)',[pref,a.nombre,a.descripcion ?? '']);
    for (const a of d.restricciones) await client.query('INSERT INTO terra_brasa.restriccion_alimentaria(id_preferencia,nombre,descripcion) VALUES($1,$2,$3)',[pref,a.nombre,a.descripcion ?? '']);
    if (d.sin_restricciones) await client.query('INSERT INTO terra_brasa.restriccion_alimentaria(id_preferencia,nombre) VALUES($1,$2)',[pref,'No tengo alergias ni restricciones']);
    for (const term of new Set(items.map(i=>i.termino_coccion).filter(Boolean))) await client.query('INSERT INTO terra_brasa.preferencia_coccion(id_preferencia,nombre) VALUES($1,$2)',[pref,term]);
    await client.query('COMMIT');
    return res.status(201).json({reserva:{codigo,id,estado:'Pendiente de pago',total:cents/100}});
  } catch(error:any) {
    await client.query('ROLLBACK');
    const conflict = error.code==='23505';
    return res.status(conflict ? 409 : error.status ?? 500).json({error:{code:conflict ? 'MESA_NO_DISPONIBLE':'RESERVA_INVALIDA',message:conflict ? 'La mesa ya no está disponible':error.status ? error.message : 'No se pudo crear la reserva'}});
  } finally { client.release(); }
});
router.get('/mias',async(req:AuthRequest,res)=>{
  await expireReservations();
  res.json({reservas:(await query('SELECT r.*,m.numero_mesa,p.total FROM terra_brasa.reserva r JOIN terra_brasa.mesa m USING(id_mesa) JOIN terra_brasa.pedido p USING(id_reserva) WHERE id_cliente=$1 ORDER BY id_reserva DESC',[req.user!.id_cliente])).rows});
});
router.get('/:codigo',async(req:AuthRequest,res)=>{
  await expireReservations();
  const reserva=await reservationDetail(String(req.params.codigo));
  if (!reserva) return res.status(404).json({error:{message:'Reserva no encontrada'}});
  if (reserva.id_cliente!==req.user!.id_cliente && req.user!.rol==='cliente') return res.status(403).json({error:{message:'No tienes permisos'}});
  return res.json({reserva});
});
router.post('/:codigo/pago',requireRole('cliente'),async(req:AuthRequest,res)=>{
  const parsed=z.object({metodo:z.enum(['Tarjeta','Yape']),datos:z.unknown()}).safeParse(req.body);
  if (!parsed.success) return res.status(422).json({error:{message:'Método de pago inválido'}});
  await expireReservations();
  const client=await pool.connect();
  let approved=false;
  try {
    await client.query('BEGIN');
    const r=(await client.query('SELECT * FROM terra_brasa.reserva WHERE codigo_reserva=$1 FOR UPDATE',[req.params.codigo])).rows[0];
    if (!r) throw Object.assign(new Error('Reserva no encontrada'),{status:404});
    if(r.id_cliente!==req.user!.id_cliente) throw Object.assign(new Error('No tienes permisos'),{status:403});
    if(r.estado_reserva!=='Pendiente de pago') throw Object.assign(new Error('La reserva ya fue pagada o está cancelada'),{status:409});
    // Revalidar vencimiento bajo el bloqueo para evitar carreras con el job.
    const expired=(await client.query("SELECT creado_en < LOCALTIMESTAMP - INTERVAL '30 minutes' AS expired FROM terra_brasa.reserva WHERE id_reserva=$1",[r.id_reserva])).rows[0].expired;
    if(expired) throw Object.assign(new Error('La reserva ha vencido'),{status:409});
    const result=gateway.pay(parsed.data.metodo,parsed.data.datos);
    const total=(await client.query('SELECT total FROM terra_brasa.pedido WHERE id_reserva=$1',[r.id_reserva])).rows[0].total;
    approved=result.approved;
    await client.query('INSERT INTO terra_brasa.pago(id_reserva,monto,metodo_pago,estado) VALUES($1,$2,$3,$4)',[r.id_reserva,total,parsed.data.metodo,approved?'Aprobado':'Rechazado']);
    if(approved) await client.query("UPDATE terra_brasa.reserva SET estado_reserva='Pagada' WHERE id_reserva=$1",[r.id_reserva]);
    await client.query('COMMIT');
  } catch(error:any) {await client.query('ROLLBACK'); return res.status(error.status??500).json({error:{message:error.status?error.message:'No se pudo procesar el pago'}});}
  finally {client.release();}
  if(!approved) return res.status(402).json({error:{message:'El pago no pudo realizarse'}});
  const estado=await confirmByEmail(String(req.params.codigo));
  return res.json({ok:true,pago:{estado:'Aprobado'},correo:{estado},reserva:{codigo:req.params.codigo,estado:estado==='Enviado'?'Confirmada':'Pagada'}});
});
router.post('/:codigo/cancelar',async(req:AuthRequest,res)=>{
  const r=await query("UPDATE terra_brasa.reserva SET estado_reserva='Cancelada' WHERE codigo_reserva=$1 AND (id_cliente=$2 OR $3='administrador') AND estado_reserva='Pendiente de pago' RETURNING id_reserva",[req.params.codigo,req.user!.id_cliente,req.user!.rol]);
  if(!r.rowCount) return res.status(409).json({error:{message:'Solo puedes cancelar reservas pendientes de pago propias'}});
  return res.json({ok:true});
});
export default router;
