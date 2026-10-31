import { join } from 'node:path';
import { z } from 'zod';
import { REPO_ROOT } from './load-env';

const schema = z
  .object({
    PORT: z.coerce.number().int().positive().default(3000),
    PERSISTENCE: z.enum(['memory', 'postgres']).default('memory'),
    DATABASE_URL: z.string().optional(),

    STORAGE_DRIVER: z.enum(['local', 's3', 'memory']).default('local'),
    PUBLIC_BASE_URL: z.string().default('http://localhost:3000'),
    APP_PUBLIC_URL: z.string().default('http://localhost:5173'),
    UPLOADS_DIR: z.string().default(join(REPO_ROOT, '.data', 'uploads')),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),

    S3_ENDPOINT: z.string().optional(),
    S3_PUBLIC_URL: z.string().optional(),
    S3_REGION: z.string().default('us-east-1'),
    S3_BUCKET: z.string().default('merch-prints'),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),

    NOVA_POSHTA_API_KEY: z.string().optional(),
    NP_SENDER_CITY: z.string().default('Київ'),
    NP_SENDER_REF: z.string().optional(),
    NP_CONTACT_SENDER_REF: z.string().optional(),
    NP_SENDER_ADDRESS_REF: z.string().optional(),
    NP_SENDER_PHONE: z.string().optional(),

    LIQPAY_PUBLIC_KEY: z.string().optional(),
    LIQPAY_PRIVATE_KEY: z.string().optional(),
    LIQPAY_SANDBOX: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
    PAYMENT_RESULT_URL: z.string().default('http://localhost:5173/payment-result'),
    STUB_PAYMENT_AUTO_CONFIRM: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_SECURE: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM: z.string().default('Merch Platform <no-reply@merch.local>'),
  })
  .superRefine((cfg, ctx) => {
    const need = (cond: boolean, path: string, message: string): void => {
      if (!cond) ctx.addIssue({ code: 'custom', path: [path], message });
    };
    if (cfg.PERSISTENCE === 'postgres') need(!!cfg.DATABASE_URL, 'DATABASE_URL', 'required when PERSISTENCE=postgres');
    if (cfg.STORAGE_DRIVER === 's3') {
      need(!!cfg.S3_ENDPOINT, 'S3_ENDPOINT', 'required when STORAGE_DRIVER=s3');
      need(!!cfg.S3_ACCESS_KEY, 'S3_ACCESS_KEY', 'required when STORAGE_DRIVER=s3');
      need(!!cfg.S3_SECRET_KEY, 'S3_SECRET_KEY', 'required when STORAGE_DRIVER=s3');
    }
    if (cfg.NOVA_POSHTA_API_KEY) {
      for (const key of ['NP_SENDER_REF', 'NP_CONTACT_SENDER_REF', 'NP_SENDER_ADDRESS_REF', 'NP_SENDER_PHONE'] as const) {
        need(!!cfg[key], key, 'required when NOVA_POSHTA_API_KEY is set');
      }
    }
    if (!!cfg.LIQPAY_PUBLIC_KEY !== !!cfg.LIQPAY_PRIVATE_KEY) {
      need(false, 'LIQPAY_PRIVATE_KEY', 'LIQPAY_PUBLIC_KEY and LIQPAY_PRIVATE_KEY must be set together');
    }
  });

export type AppConfig = z.infer<typeof schema>;

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const cleaned = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== undefined && v !== ''));
  return schema.parse(cleaned);
}
