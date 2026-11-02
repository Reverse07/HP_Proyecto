import { Router } from 'express';
import { query } from '../../db/pool.js';
import { isValidDate } from '../../lib/date.js';
import { expireReservations,getSlots } from '../../services/reservations.js';
const router=Router();
router.get('/horarios',async(req,res)=>{
  const fecha=String(req.query.fecha??'');
  if(!isValidDate(fecha)) return res.status(422).json({error:{message:'Indica una fecha válida'}});
  await expireReservations();
  const slots=[];
  for(const hora of await getSlots(fecha)) {
    const count=await query(`SELECT COUNT(*)::int AS count FROM terra_brasa.mesa m WHERE estado='Disponible' AND capacidad >= $3 AND NOT EXISTS(SELECT 1 FROM terra_brasa.reserva r WHERE r.id_mesa=m.id_mesa AND fecha_reserva=$1 AND hora_reserva=$2::time AND estado_reserva<>'Cancelada')`,[fecha,hora,Number(req.query.asistentes)||1]);
    slots.push({hora,mesas_libres:count.rows[0].count});
  }
  return res.json({fecha,slots});
});
router.get('/mesas',async(req,res)=>{
  const fecha=String(req.query.fecha??''),hora=String(req.query.hora??''),asistentes=Number(req.query.asistentes);
  if(!isValidDate(fecha)||!Number.isInteger(asistentes)||asistentes<1||!(await getSlots(fecha)).includes(hora as any)) return res.status(422).json({error:{message:'Fecha, hora y asistentes son obligatorios y deben ser válidos'}});
  await expireReservations();
  const mesas=await query(`SELECT m.*, CASE WHEN estado='No disponible' OR EXISTS(SELECT 1 FROM terra_brasa.reserva r WHERE r.id_mesa=m.id_mesa AND fecha_reserva=$1 AND hora_reserva=$2::time AND estado_reserva<>'Cancelada') THEN 'ocupada' ELSE 'libre' END AS situacion FROM terra_brasa.mesa m ORDER BY id_mesa`,[fecha,hora]);
  return res.json({mesas:mesas.rows.map(m=>({id:m.id_mesa,numero:m.numero_mesa,capacidad:m.capacidad,ubicacion:m.ubicacion,estado:m.situacion,apta:m.situacion==='libre'&&m.capacidad>=asistentes}))});
});
export default router;
