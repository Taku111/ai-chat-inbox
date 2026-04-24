import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  FIREBASE_ADMIN_PROJECT_ID: z.string().min(1),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(100),
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC').min(34),
  TWILIO_AUTH_TOKEN: z.string().min(32),
  TWILIO_WHATSAPP_NUMBER: z.string().startsWith('+').min(10),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  AI_VENDOR: z.enum(['claude', 'openai', 'gemini']).default('claude'),
  AI_MODEL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  WEBHOOK_SECRET: z.string().min(32),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
}).refine(
  (d) => d.ANTHROPIC_API_KEY || d.OPENAI_API_KEY || d.GOOGLE_GENERATIVE_AI_API_KEY,
  { message: 'At least one AI provider API key must be present' }
)

export const env = envSchema.parse(process.env)
