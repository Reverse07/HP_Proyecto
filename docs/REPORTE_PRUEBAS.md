# Reporte de pruebas

Fecha: lunes, 2 de noviembre de 2026, 6:13:42 p. m. (America/Lima)

Pruebas ejecutadas contra PostgreSQL aislado `terra_brasa_test` y SMTP MailHog.

| Suite | Caso | Resultado |
| --- | --- | --- |
| backend | CP01 crea reserva, pedido y preferencias en transacción | Aprobado |
| backend | CP02 rechaza hoy y ayer; permite mañana, sin exigir 24 horas | Aprobado |
| backend | CP03 mesa ocupada no puede reservarse | Aprobado |
| backend | CP04 capacidad mínima y mesas aptas para seis | Aprobado |
| backend | CP05 campos obligatorios con errores por campo | Aprobado |
| backend | CP06 exige sesión y permite registro/login sin filtrar hash | Aprobado |
| backend | CP07 concurrencia real deja una sola reserva y ningún pedido huérfano | Aprobado |
| backend | CP08 exige un plato disponible y valida cocción | Aprobado |
| backend | CP09 detalle incluye mesa, pedido y preferencias | Aprobado |
| backend | EX-PRECIO ignora precios del cliente | Aprobado |
| backend | EX-EXPIRACION libera la mesa después de 30 minutos | Aprobado |
| backend | EX-PAGO rechazos, aprobación real SMTP y pago duplicado | Aprobado |
| backend | EX-CORREO falla SMTP sin perder pago y permite reenvío admin | Aprobado |
| backend | EX-ROLES limita administración y transiciones del personal | Aprobado |
| backend | EX-ADMIN cambios de mesa, carta y disponibilidad se reflejan al cliente | Aprobado |
| frontend | FE-CP02 fecha de hoy muestra anticipación mínima | Aprobado |
| frontend | FE-CP03 mapa distingue ocupada, insuficiente y elegida | Aprobado |
| frontend | FE-CP08 pedido vacío bloquea el siguiente paso | Aprobado |
| frontend | FE-CP07 conserva pedido tras 409 y vuelve al mapa | Aprobado |
| frontend | FE-CP06 redirige al login y conserva ruta de retorno | Aprobado |

Resultado global: **Aprobado**.
