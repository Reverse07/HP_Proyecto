# Decisiones de implementación

- Ejecución exclusivamente local en Windows. Git es local; no se necesita GitHub ni hosting.
- PostgreSQL Docker se publica en **5433**, para evitar interferir con el servicio PostgreSQL de la laptop en 5432. `DB_PORT` configura tanto la API como Docker Compose.
- Hoy se calcula en America/Lima; mañana es válido aunque falten menos de 24 horas. Los slots duran dos horas y respetan apertura/cierre.
- La carta inicial cubre hoy y los próximos trece días. El administrador puede publicar cartas para fechas posteriores.
- Se preservan las 17 tablas del modelo: rol en cliente, creado_en en reserva, permite_coccion y termino_coccion; índice único parcial de mesa/fecha/hora que ignora Cancelada e índices de consulta.
- Código TB-0000 a TB-9999 aleatorio criptográfico, con reintentos por colisión, sin agregar otra tabla.
- Solo se cancelan reservas pendientes de pago. Una reserva pagada se conserva; no existe devolución automática.
- Al cambiar la fecha se limpia el pedido porque cada día puede tener una carta distinta. El pedido se conserva al cambiar de mesa, ingresar y ante conflicto 409.
- No se exige un término de cocción; si se elige, debe ser uno de los cuatro permitidos y el platillo debe admitirlo.
- Los platillos retirados usan baja lógica siempre, conservando el historial. Pueden reactivarse desde Editar.
- Los pagos son simulados, tal como indica la especificación. No se guardan tarjetas ni CVV. La fila de reserva se bloquea durante el pago para impedir cobros duplicados.
- El correo se envía después de confirmar la transacción del pago; un fallo de SMTP mantiene la reserva Pagada y registra Error. El administrador reenvía manualmente.
- El esquema original usa TIMESTAMP sin zona. Todas las conexiones PostgreSQL fijan America/Lima; el vencimiento enviado al navegador incluye desplazamiento -05.
- El asistente y el JWT se guardan en sessionStorage por pestaña. Los precios del resumen anterior a confirmar son estimados; el comprobante y el pago usan el total calculado por el servidor.
- Se usan fuentes locales del sistema (Georgia, Segoe UI, Consolas) para que la interfaz no dependa de descargar fuentes externas.
- Las pruebas crean y recrean exclusivamente la base terra_brasa_test, nunca la base demo. El reporte refleja ejecuciones reales.
- Se actualizaron Vite, Vitest, Zod y Nodemailer por alertas de las versiones originales. Usar Node 22.19+ (instalado en esta laptop) o una versión compatible con sus requisitos, como Node 20.19+.
