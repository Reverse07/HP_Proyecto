# Trazabilidad

Los escenarios se ejecutan en `backend/tests/reservations.spec.ts` contra PostgreSQL real; los de interfaz en `frontend/src/test/flow.spec.tsx`.

| HU | CA / Gherkin | Caso y escenario | Automatización |
| --- | --- | --- | --- |
| HU04, HU06–08 | CA01 / GH01: dado cliente y mesa libre, cuando confirma con plato, entonces crea reserva y preferencias | CP01 | Backend |
| HU04 | CA02 / GH02: dado hoy/ayer/mañana, cuando reserva, entonces rechaza hoy/ayer y acepta mañana | CP02 / FE-CP02 | Backend y frontend |
| HU03–04 | CA03 / GH03: dada mesa reservada, cuando consulta, entonces aparece ocupada y no se reserva | CP03 / FE-CP03 | Backend y frontend |
| HU03–04 | CA04 / GH04: dados seis asistentes, cuando consulta, entonces solo mesas suficientes son aptas | CP04 | Backend |
| HU04 | CA05 / GH05: faltan fecha/hora/asistentes, al enviar responde error por campo | CP05 | Backend |
| HU01–02, HU04 | CA06 / GH06: sin sesión, al reservar pide login y conserva retorno | CP06 / FE-CP06 | Backend y frontend |
| HU04 | CA07 / GH07: dos solicitudes simultáneas, solo una crea; segunda conserva pedido | CP07 / FE-CP07 | Backend y frontend |
| HU05–06 | CA08: sin platos o plato no disponible, rechaza | CP08 / FE-CP08 | Backend y frontend |
| HU04 | CA09: dado reserva, al consultar retorna todos los datos y pedido | CP09 | Backend |
| HU09 | Rechazo tarjeta/Yape, aprobación SMTP y doble pago simultáneo | EX-PAGO | Backend |
| HU10 | Fallo SMTP conserva pago, administrador reenvía | EX-CORREO | Backend con fallo inyectado y reenvío SMTP real |
| HU04 | Pasados 30 minutos libera mesa y rechaza pago vencido | EX-EXPIRACION | Backend |
| HU11–13 | Cliente no administra, personal no edita carta, transición inválida | EX-ROLES | Backend |
| HU06 | Precio falso enviado se ignora | EX-PRECIO | Backend |
| HU11–12 | Mesa deshabilitada, plato agotado, publicación de carta y dashboard | EX-ADMIN | Backend |

El resultado real de cada caso se genera con `npm.cmd run test:report` en REPORTE_PRUEBAS.md. E2E Playwright es opcional y no forma parte del reporte unitario/integración.
