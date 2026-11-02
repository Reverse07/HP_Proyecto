import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export const mailTransport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined
});

export async function sendReservationEmail(payload: EmailPayload) {
  await mailTransport.sendMail({
    from: env.SMTP_FROM,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html
  });
  return true;
}
