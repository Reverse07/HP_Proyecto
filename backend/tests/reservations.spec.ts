import { beforeAll,afterAll,describe,it,expect,vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { pool,query } from '../src/db/pool.js';
import { getLimaDateString } from '../src/lib/date.js';
import { mailTransport } from '../src/services/email.js';
let token='',admin='',staff='';
function day(offset=1){const d=new Date(`${getLimaDateString(new Date())}T12:00:00-05:00`);d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);}
function payload(extra:any={}){return {fecha:day(),hora:'12:30',asistentes:2,id_mesa:1,items:[{id_platillo:1,cantidad:1,termino_coccion:'Al punto'}],alergias:[{nombre:'Frutos secos'}],restricciones:[{nombre:'Sin lactosa'}],...extra};}
const post=(body:any)=>request(app).post('/api/reservas').set('Authorization',`Bearer ${token}`).send(body);
const auth=(value=token)=>({Authorization:`Bearer ${value}`});
beforeAll(async()=>{
  for(const [email,password,role] of [['ana.torres@correo.com','Cliente123!','client'],['admin@terrabrasa.pe','Admin123!','admin'],['cocina@terrabrasa.pe','Cocina123!','staff']]) {
    const r=await request(app).post('/api/auth/login').send({correo:email,contrasena:password});expect(r.status).toBe(200);if(role==='client')token=r.body.token;else if(role==='admin')admin=r.body.token;else staff=r.body.token;
  }
});
afterAll(async()=>{vi.restoreAllMocks();await pool.end();});
describe('Reservas con PostgreSQL real',()=>{
  it('CP01 crea reserva, pedido y preferencias en transacción',async()=>{
    const r=await post(payload());expect(r.status).toBe(201);expect(r.body.reserva.codigo).toMatch(/^TB-\d{4}$/);
    const detail=await request(app).get(`/api/reservas/${r.body.reserva.codigo}`).set(auth());expect(detail.body.reserva.estado_reserva).toBe('Pendiente de pago');expect(detail.body.reserva.alergias[0].nombre).toBe('Frutos secos');
  });
  it('CP02 rechaza hoy y ayer; permite mañana, sin exigir 24 horas',async()=>{
    for(const fecha of [day(0),day(-1)]){const r=await post(payload({fecha}));expect(r.status).toBe(422);expect(r.body.error.message).toBe('La reserva requiere al menos 1 día de anticipación');}
    expect((await post(payload({id_mesa:2}))).status).toBe(201);
  });
  it('CP03 mesa ocupada no puede reservarse',async()=>{
    const r=await request(app).get(`/api/disponibilidad/mesas?fecha=${day()}&hora=12:30&asistentes=2`);expect(r.body.mesas.find((m:any)=>m.id===1).estado).toBe('ocupada');expect((await post(payload())).status).toBe(409);
  });
  it('CP04 capacidad mínima y mesas aptas para seis',async()=>{
    const r=await request(app).get(`/api/disponibilidad/mesas?fecha=${day()}&hora=14:30&asistentes=6`);expect(r.body.mesas.filter((m:any)=>m.apta).map((m:any)=>m.numero)).toEqual([5,6,8]);expect((await post(payload({id_mesa:3,asistentes:6}))).status).toBe(422);
  });
  it('CP05 campos obligatorios con errores por campo',async()=>{
    for(const key of ['fecha','hora','asistentes']){const body:any=payload();delete body[key];const r=await post(body);expect(r.status).toBe(422);expect(r.body.error.fields[key]).toBeTruthy();}
  });
  it('CP06 exige sesión y permite registro/login sin filtrar hash',async()=>{
    expect((await request(app).post('/api/reservas').send(payload())).status).toBe(401);
    const r=await request(app).post('/api/auth/register').send({nombres:'Luis',apellidos:'Pérez',correo:'luis@correo.pe',contrasena:'Cliente123!',telefono:'987654321'});expect(r.status).toBe(201);expect(r.body.user.contrasena).toBeUndefined();
    expect((await request(app).post('/api/auth/login').send({correo:'luis@correo.pe',contrasena:'Cliente123!'})).status).toBe(200);
  });
  it('CP07 concurrencia real deja una sola reserva y ningún pedido huérfano',async()=>{
    const responses=await Promise.all([post(payload({id_mesa:3,hora:'18:30'})),post(payload({id_mesa:3,hora:'18:30'}))]);expect(responses.map(r=>r.status).sort()).toEqual([201,409]);expect(responses.find(r=>r.status===409)!.body.error.message).toBe('La mesa ya no está disponible');
    const count=await query("SELECT COUNT(*)::int AS n FROM terra_brasa.reserva WHERE id_mesa=3 AND hora_reserva='18:30' AND fecha_reserva=$1",[day()]);expect(count.rows[0].n).toBe(1);
  });
  it('CP08 exige un plato disponible y valida cocción',async()=>{
    const r=await post(payload({items:[]}));expect(r.status).toBe(422);expect(r.body.error.message).toBe('Para reservar debes pedir al menos un plato');
    expect((await post(payload({items:[{id_platillo:12,cantidad:1}]}))).status).toBe(422);
    expect((await post(payload({items:[{id_platillo:3,cantidad:1,termino_coccion:'Jugoso'}]}))).status).toBe(422);
  });
  it('CP09 detalle incluye mesa, pedido y preferencias',async()=>{
    const r=await request(app).get('/api/reservas/TB-0142').set(auth());expect(r.status).toBe(200);expect(r.body.reserva.numero_mesa).toBe(7);expect(r.body.reserva.items).toHaveLength(2);expect(Number(r.body.reserva.total)).toBe(94);expect(Number.isFinite(Date.parse(r.body.reserva.creado_iso))).toBe(true);
  });
  it('EX-PRECIO ignora precios del cliente',async()=>{
    const r=await post(payload({id_mesa:4,hora:'14:30',items:[{id_platillo:1,cantidad:2,precio:0.01}]}));expect(r.status).toBe(201);expect(r.body.reserva.total).toBe(96);
  });
  it('EX-EXPIRACION libera la mesa después de 30 minutos',async()=>{
    const r=await post(payload({id_mesa:5,hora:'14:30'}));await query("UPDATE terra_brasa.reserva SET creado_en=LOCALTIMESTAMP-INTERVAL '31 minutes' WHERE codigo_reserva=$1",[r.body.reserva.codigo]);
    const a=await request(app).get(`/api/disponibilidad/mesas?fecha=${day()}&hora=14:30&asistentes=2`);expect(a.body.mesas.find((m:any)=>m.id===5).apta).toBe(true);
    expect((await post(payload({id_mesa:5,hora:'14:30'}))).status).toBe(201);
    expect((await request(app).post(`/api/reservas/${r.body.reserva.codigo}/pago`).set(auth()).send({metodo:'Yape',datos:{celular:'987654321',codigo:'123456'}})).status).toBe(409);
  });
  it('EX-PAGO rechazos, aprobación real SMTP y pago duplicado',async()=>{
    const r=await post(payload({id_mesa:6,hora:'20:30'}));expect(r.status).toBe(201);const url=`/api/reservas/${r.body.reserva.codigo}/pago`;
    for(const body of [{metodo:'Yape',datos:{celular:'987654321',codigo:'000000'}},{metodo:'Tarjeta',datos:{numero:'4000000000000002',titular:'Ana Torres',vencimiento:'12/39',cvv:'123'}}])expect((await request(app).post(url).set(auth()).send(body)).status).toBe(402);
    const responses=await Promise.all([request(app).post(url).set(auth()).send({metodo:'Tarjeta',datos:{numero:'4242424242424242',titular:'Ana Torres',vencimiento:'12/39',cvv:'123'}}),request(app).post(url).set(auth()).send({metodo:'Yape',datos:{celular:'987654321',codigo:'123456'}})]);expect(responses.map(r=>r.status).sort()).toEqual([200,409]);expect(responses.find(r=>r.status===200)!.body.correo.estado).toBe('Enviado');
  });
  it('EX-CORREO falla SMTP sin perder pago y permite reenvío admin',async()=>{
    const spy=vi.spyOn(mailTransport,'sendMail').mockImplementationOnce((()=>Promise.reject(new Error('SMTP no disponible'))) as any);
    const r=await post(payload({id_mesa:8,hora:'20:30'}));const url=`/api/reservas/${r.body.reserva.codigo}`;
    const pay=await request(app).post(`${url}/pago`).set(auth()).send({metodo:'Yape',datos:{celular:'987654321',codigo:'123456'}});expect(pay.body.reserva.estado).toBe('Pagada');expect(pay.body.correo.estado).toBe('Error');spy.mockRestore();
    const retry=await request(app).post(`/api/admin/reservas/${r.body.reserva.codigo}/reenviar-correo`).set(auth(admin));expect(retry.body.estado).toBe('Enviado');
    expect((await request(app).get(url).set(auth())).body.reserva.estado_reserva).toBe('Confirmada');
  });
  it('EX-ROLES limita administración y transiciones del personal',async()=>{
    expect((await request(app).get('/api/admin/mesas').set(auth())).status).toBe(403);expect((await request(app).get('/api/admin/platillos').set(auth(staff))).status).toBe(403);
    const list=await request(app).get('/api/pedidos').set(auth(staff));expect(list.status).toBe(200);expect(list.body.pedidos[0].alergias).toBeDefined();
    const r=await request(app).patch('/api/pedidos/1/estado').set(auth(staff)).send({estado:'Registrado'});expect(r.status).toBe(422);
  });
  it('EX-ADMIN cambios de mesa, carta y disponibilidad se reflejan al cliente',async()=>{
    expect((await request(app).patch('/api/admin/mesas/8').set(auth(admin)).send({estado:'No disponible'})).status).toBe(200);
    const a=await request(app).get(`/api/disponibilidad/mesas?fecha=${day()}&hora=14:30&asistentes=2`);expect(a.body.mesas.find((m:any)=>m.id===8).estado).toBe('ocupada');
    expect((await request(app).patch('/api/admin/platillos/1/disponibilidad').set(auth(admin)).send({disponibilidad:false})).status).toBe(200);
    expect((await post(payload({id_mesa:6,hora:'14:30'}))).status).toBe(422);
    expect((await request(app).put(`/api/admin/menu/${day(2)}`).set(auth(admin)).send({platillos:[2,3]})).status).toBe(200);
    expect((await request(app).get(`/api/menu?fecha=${day(2)}`)).body.platillos).toHaveLength(2);
    expect((await request(app).get('/api/admin/dashboard').set(auth(admin))).status).toBe(200);
  });
});
