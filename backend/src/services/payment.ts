import { z } from 'zod';

const cardSchema = z.object({
  numero: z.string().min(12),
  titular: z.string().min(2),
  vencimiento: z.string().min(4),
  cvv: z.string().min(3).max(4)
});

const yapeSchema = z.object({
  celular: z.string().regex(/^\d{9}$/),
  codigo: z.string().regex(/^\d{6}$/)
});

export type PaymentMethod = 'Tarjeta' | 'Yape';
export interface PaymentGateway { pay(method: PaymentMethod, payload: unknown): { approved: boolean; message: string | undefined }; }
export class SimulatedGateway implements PaymentGateway {
  pay(method: PaymentMethod, payload: unknown) { return simulatePayment(method, payload); }
}
export const gateway: PaymentGateway = new SimulatedGateway();

export function isLuhnValid(value: string) {
  const digits = value.replace(/\s+/g, '').replace(/-/g, '');
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function validateCardData(data: unknown) {
  const parsed = cardSchema.safeParse(data);
  if (!parsed.success) return { ok: false, message: 'Datos de tarjeta inválidos' };

  const { numero, vencimiento, cvv, titular } = parsed.data;
  const digits = numero.replace(/\s+/g, '').replace(/-/g, '');
  if (!isLuhnValid(digits)) return { ok: false, message: 'La tarjeta no es válida' };

  const [monthRaw, yearRaw] = vencimiento.split('/');
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;

  if (Number.isNaN(month) || Number.isNaN(year) || month < 1 || month > 12) {
    return { ok: false, message: 'Vencimiento inválido' };
  }

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return { ok: false, message: 'La tarjeta está vencida' };
  }

  if (!titular.trim()) return { ok: false, message: 'El titular es obligatorio' };
  if (!/^\d{3,4}$/.test(cvv)) return { ok: false, message: 'CVV inválido' };

  return { ok: true };
}

export function validateYapeData(data: unknown) {
  const parsed = yapeSchema.safeParse(data);
  if (!parsed.success) return { ok: false, message: 'Datos de Yape inválidos' };
  return { ok: true };
}

export function simulatePayment(method: PaymentMethod, payload: unknown) {
  if (method === 'Tarjeta') {
    const validation = validateCardData(payload);
    if (!validation.ok) return { approved: false, message: validation.message };
    const digits = String((payload as any).numero).replace(/\s+/g, '').replace(/-/g, '');
    if (digits.endsWith('0002')) return { approved: false, message: 'El pago no pudo realizarse' };
    return { approved: true, message: 'Pago aprobado' };
  }

  const validation = validateYapeData(payload);
  if (!validation.ok) return { approved: false, message: validation.message };
  const code = String((payload as any).codigo || '');
  if (code === '000000') return { approved: false, message: 'El pago no pudo realizarse' };
  return { approved: true, message: 'Pago aprobado' };
}
