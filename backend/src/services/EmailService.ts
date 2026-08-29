import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../lib/logger';

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  senderName?: string;
  senderEmail?: string;
}

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: parseInt(env.SMTP_PORT, 10),
  secure: parseInt(env.SMTP_PORT, 10) === 465, // true for 465, false for other ports
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
});

export class EmailService {
  static async sendEmail(payload: SendEmailPayload): Promise<string> {
    const fromAddress = payload.senderEmail
      ? (payload.senderName ? `"${payload.senderName}" <${payload.senderEmail}>` : payload.senderEmail)
      : env.SMTP_FROM;

    logger.debug({ payload: { ...payload, html: '[REDACTED]' } }, 'Attempting to send email via SMTP');

    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
      });

      logger.info({ messageId: info.messageId }, 'Email sent successfully via SMTP');
      return info.messageId;
    } catch (error) {
      logger.error({ error }, 'Failed to send email via SMTP');
      throw error;
    }
  }
}
