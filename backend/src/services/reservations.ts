import { query } from '../db/pool.js';
import { RESERVATION_SLOTS } from '../constants.js';
import { isValidDate } from '../lib/date.js';
import { sendReservationEmail } from './email.js';

export async function expireReservations() {
  await query("UPDATE terra_brasa.reserva SET estado_reserva='Cancelada' WHERE estado_reserva='Pendiente de pago' AND creado_en < LOCALTIMESTAMP - INTERVAL '30 minutes'");
}
export async function getSlots(fecha: string) {
  if (!isValidDate(fecha)) return [];
  const day = new Intl.DateTimeFormat('es-PE', { weekday: 'long', timeZone: 'America/Lima' }).format(new Date(`${fecha}T12:00:00-05:00`));
  const hours = await query('SELECT hora_apertura, hora_cierre FROM terra_brasa.horario WHERE lower(dia_semana)=lower($1) AND estado=$2', [day, 'Activo']);
  return RESERVATION_SLOTS.filter(slot => hours.rows.some(h => slot >= h.hora_apertura.slice(0,5) && `${String(Number(slot.slice(0,2)) + 2).padStart(2,'0')}:${slot.slice(3)}` <= h.hora_cierre.slice(0,5)));
}
export async function reservationDetail(codigo: string) {
  const r = await query(`SELECT r.*, m.numero_mesa,m.capacidad,m.ubicacion,c.correo,c.nombres,
    to_char(r.creado_en, 'YYYY-MM-DD"T"HH24:MI:SS') || '-05:00' AS creado_iso,
    p.total,p.id_pedido,p.estado AS estado_pedido,
    (SELECT estado FROM terra_brasa.confirmacion_email e WHERE e.id_reserva=r.id_reserva ORDER BY id_confirmacion DESC LIMIT 1) AS estado_correo,
    (SELECT metodo_pago FROM terra_brasa.pago pg WHERE pg.id_reserva=r.id_reserva AND pg.estado='Aprobado' LIMIT 1) AS metodo_pago
    FROM terra_brasa.reserva r JOIN terra_brasa.mesa m USING(id_mesa) JOIN terra_brasa.cliente c USING(id_cliente)
    JOIN terra_brasa.pedido p USING(id_reserva) WHERE codigo_reserva=$1`, [codigo]);
  if (!r.rows[0]) return null;
  const row = r.rows[0];
  row.items = (await query(`SELECT d.*,p.nombre FROM terra_brasa.detalle_pedido d JOIN terra_brasa.platillo p USING(id_platillo) WHERE id_pedido=$1`, [row.id_pedido])).rows;
  row.alergias = (await query(`SELECT a.nombre,a.descripcion FROM terra_brasa.alergia a JOIN terra_brasa.preferencia_cliente pc USING(id_preferencia) WHERE id_reserva=$1`, [row.id_reserva])).rows;
  row.restricciones = (await query(`SELECT a.nombre,a.descripcion FROM terra_brasa.restriccion_alimentaria a JOIN terra_brasa.preferencia_cliente pc USING(id_preferencia) WHERE id_reserva=$1`, [row.id_reserva])).rows;
  return row;
}
const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export async function confirmByEmail(codigo: string) {
  const r = await reservationDetail(codigo);
  if (!r || !['Pagada','Confirmada'].includes(r.estado_reserva)) throw new Error('Reserva sin pago aprobado');
  const text = `Terra & Brasa · Reserva ${codigo} confirmada\nFecha: ${r.fecha_reserva} · Hora: ${r.hora_reserva}\nMesa ${r.numero_mesa} · ${r.ubicacion} · ${r.numero_asistentes} asistentes\n${r.items.map((i: any) => `${i.cantidad} × ${i.nombre} ${i.termino_coccion || ''} · S/ ${Number(i.subtotal).toFixed(2)}`).join('\n')}\nAlergias: ${r.alergias.map((a: any) => a.nombre).join(', ') || 'Ninguna'}\nRestricciones: ${r.restricciones.map((a: any) => a.nombre).join(', ') || 'Ninguna'}\nMonto pagado: S/ ${Number(r.total).toFixed(2)} · ${r.metodo_pago}\nTu mesa queda reservada por 2 horas desde la hora elegida.`;
  let estado = 'Enviado';
  try {
    await sendReservationEmail({to:r.correo,subject:`Terra & Brasa · Reserva ${codigo} confirmada`,text,html:`<div style="background:#0B140F;color:#EFE7D4;padding:32px;font-family:Arial"><h1 style="color:#E5C560">Terra &amp; Brasa</h1><div style="white-space:pre-line;line-height:1.8">${escape(text)}</div></div>`});
  } catch { estado = 'Error'; }
  await query('INSERT INTO terra_brasa.confirmacion_email(id_reserva,correo,fecha_envio,estado) VALUES($1,$2,NOW(),$3)', [r.id_reserva,r.correo,estado]);
  if (estado === 'Enviado') await query("UPDATE terra_brasa.reserva SET estado_reserva='Confirmada' WHERE id_reserva=$1 AND estado_reserva='Pagada'", [r.id_reserva]);
  return estado;
}
