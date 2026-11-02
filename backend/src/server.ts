import app from './app.js';
import { env } from './config/env.js';
import { expireReservations } from './services/reservations.js';

const port = env.PORT;

app.listen(port, () => {
  console.log(`API Terra & Brasa escuchando en http://localhost:${port}`);
});
const timer = setInterval(() => { void expireReservations().catch(() => console.error('No se pudo limpiar las reservas vencidas')); }, 60_000);
timer.unref();
