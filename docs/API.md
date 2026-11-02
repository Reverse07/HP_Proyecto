# API local

Base: `http://localhost:4000/api`. JSON. Autenticación: `Authorization: Bearer <token>`. Errores: `{error:{code?,message,fields?}}`. 401 sin sesión, 403 sin rol, 404 inexistente, 409 conflicto, 422 validación, 402 pago rechazado.

| Método | Ruta | Acceso / datos |
| --- | --- | --- |
| GET | /health | Público; comprueba el proceso de API |
| POST | /auth/register | nombres, apellidos, correo, telefono opcional, contrasena |
| POST | /auth/login | correo, contrasena; retorna user y token |
| GET | /auth/me | Sesión; usuario sin hash |
| GET | /disponibilidad/horarios?fecha=&asistentes= | Público; slots permitidos y mesas libres con capacidad |
| GET | /disponibilidad/mesas?fecha=&hora=&asistentes= | Público; todas las mesas, estado y apta |
| GET | /menu?fecha= | Público; carta del día y disponibilidad |
| POST | /reservas | Cliente; cuerpo de ejemplo debajo |
| GET | /reservas/mias | Sesión; historial propio |
| GET | /reservas/:codigo | Dueño, administrador o personal; detalle y pedido |
| POST | /reservas/:codigo/cancelar | Dueño o administrador; solo pendiente |
| POST | /reservas/:codigo/pago | Cliente dueño; metodo y datos |
| GET | /admin/dashboard | Administrador; indicadores, salón, próximos y pedidos |
| GET | /admin/reservas?fecha=&estado= | Administrador; filtros opcionales |
| GET/PATCH | /admin/mesas y /admin/mesas/:id | Administrador; estado, capacidad, ubicacion |
| GET/POST | /admin/platillos | Administrador; lista con categorías / alta |
| PUT/DELETE | /admin/platillos/:id | Administrador; edición completa / baja lógica |
| PATCH | /admin/platillos/:id/disponibilidad | Administrador; disponibilidad boolean |
| PUT | /admin/menu/:fecha | Administrador; {platillos:[ids]} reemplaza carta del día |
| POST | /admin/reservas/:codigo/reenviar-correo | Administrador; requiere pago aprobado |
| GET | /pedidos?fecha=&estado= | Personal/admin; cocina, alergias y restricciones |
| PATCH | /pedidos/:id/estado | Personal/admin; {estado}; solo siguiente estado |

Crear reserva (fecha posterior a hoy en Lima):

```json
{"fecha":"2026-11-04","hora":"20:30","asistentes":4,"id_mesa":3,"items":[{"id_platillo":1,"cantidad":1,"termino_coccion":"Al punto"}],"alergias":[{"nombre":"Frutos secos"}],"restricciones":[],"sin_restricciones":false}
```

Pago Yape: `{"metodo":"Yape","datos":{"celular":"987654321","codigo":"123456"}}`. Código 000000 rechaza.

Pago tarjeta: `{"metodo":"Tarjeta","datos":{"numero":"4242424242424242","titular":"Ana Torres","vencimiento":"12/39","cvv":"123"}}`. Número válido terminado en 0002 rechaza. No se guardan los datos de tarjeta.

Platillo: nombre, descripcion, precio numérico positivo, id_categoria, ingredientes, permite_coccion, disponibilidad, estado (Activo/Inactivo). Valores de fecha: YYYY-MM-DD; hora: HH:mm. Cantidades: 1–20. Slots: 12:30, 14:30, 18:30, 20:30.
