# Terra & Brasa

Sistema local de reservas de mesa, carta por fecha, pedido anticipado, preferencias, pago simulado, confirmación SMTP y paneles por rol. React 18 + Vite, Express + TypeScript + pg + Zod, PostgreSQL 16. No requiere GitHub.

## Ejecutar en Windows

Requisitos: Node.js **22.19+** (o 20.19+ compatible con Vite), npm y Docker Desktop encendido con contenedores Linux. En PowerShell usa `npm.cmd` si `npm` está bloqueado por la política de scripts.

```powershell
cd C:\Users\USER\HP_Proyecto
# Solo si todavía no existe .env:
Copy-Item .env.example .env
npm.cmd install
npm.cmd run db:up
# Solo la primera vez o cuando quieras restaurar los datos demo:
npm.cmd run db:reset
npm.cmd run dev
```

Espera a que PostgreSQL esté sano (`docker compose ps`) antes de inicializarlo. **db:reset borra y recrea el esquema terra_brasa de la base configurada.** No lo ejecutes sobre datos que quieras conservar.

- Web: http://localhost:5173
- API: http://localhost:4000/api/health
- Correos en MailHog: http://localhost:8025
- PostgreSQL: localhost:**5433**, base terra_brasa, usuario terra (credenciales locales en .env).

Para próximos arranques: abre Docker Desktop, ejecuta `npm.cmd run db:up` y `npm.cmd run dev`. No hace falta volver a instalar ni reiniciar datos. Detén la web/API con Ctrl+C. `docker compose stop` detiene los servicios conservando los datos; no uses `down -v` si quieres conservarlos.

## Cuentas demo

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Cliente | ana.torres@correo.com | Cliente123! |
| Administrador | admin@terrabrasa.pe | Admin123! |
| Cocina/personal | cocina@terrabrasa.pe | Cocina123! |

La reserva demo TB-0142 es de Ana, mesa 7, mañana a las 20:30, S/ 94.00, Confirmada. Su correo es un registro del seed; los nuevos pagos sí envían un mensaje real a MailHog.

## Probar el flujo

1. Regístrate o ingresa como cliente; elige mañana, hora, asistentes y mesa libre.
2. Agrega un plato; elige cocción si corresponde y registra alergias/restricciones.
3. Revisa el resumen, confirma y paga antes de 30 minutos.
4. Yape de prueba: celular 987654321 y código 123456. 000000 simula rechazo.
5. Tarjeta de prueba: 4242424242424242, titular Ana Torres, 12/39, CVV 123. 4000000000000002 simula rechazo.
6. Abre MailHog para ver el correo y Mis reservas para el detalle.
7. Como administrador abre Panel para mesas, platillos, carta por fecha, indicadores y reenvío de correos fallidos. Como personal avanza pedidos desde Registrado hasta Completado.

Los pagos son simulados: no se realiza ningún cobro real. El envío SMTP queda en MailHog, no llega a una bandeja externa. Si SMTP falla, el pago se conserva y el administrador puede reenviar.

## Configuración

`.env` en la raíz se carga desde backend, DB y Vite. `.env.example` documenta todas las variables. DB_PORT=5433 también configura el puerto externo de Docker, para evitar conflictos con PostgreSQL instalado en Windows. Cambia JWT_SECRET para cualquier despliegue fuera de esta laptop. Solo VITE_API_URL se expone al navegador. La zona de negocio es America/Lima.

La carta inicial cubre 14 días desde la inicialización. Para otras fechas publica una carta desde Panel → Menú. Horarios configurables en backend/src/constants.ts, limitados además por la tabla horario.

## Validación

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd test
npm.cmd run test:report
```

Las pruebas crean/recrean una base **terra_brasa_test** separada usando las credenciales de `.env` (usuario con permiso de crear bases). Requieren PostgreSQL y MailHog activos. Incluyen concurrencia real, vencimiento, seguridad por roles y fallo SMTP inyectado. El reporte se guarda en docs/REPORTE_PRUEBAS.md y devuelve código de fallo si alguna prueba falla. `lint` es la revisión estricta de tipos TypeScript.

## Solución de problemas

- Error de conexión web/API: deja abierta la terminal con `npm.cmd run dev`; revisa los puertos 5173 y 4000.
- Error de contraseña PostgreSQL: comprueba DB_PORT=5433 y que docker compose ps publique 5433; el servicio local de Windows puede ocupar 5432.
- Docker no conecta: inicia Docker Desktop y espera a que el motor esté listo.
- El puerto 5433 ya está ocupado: elige otro DB_PORT en .env, ejecuta `npm.cmd run db:up` y reinicia la API.
- Si cambia el puerto de Vite, ajusta CORS_ORIGIN; el puerto 5173 es estricto para detectar conflictos.
- Sin correo: revisa el contenedor mailhog y SMTP_HOST/SMTP_PORT; consulta Panel → Correos tras solucionar SMTP.

## Documentación

- docs/API.md: endpoints y cuerpos.
- docs/SUPUESTOS.md: decisiones y alcance.
- docs/TRAZABILIDAD.md: casos, criterios y archivos de prueba.
- docs/REPORTE_PRUEBAS.md: última ejecución real.

Los commits se conservan en el repositorio Git local. No hay publicación ni sincronización con GitHub.
