import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  PORT: z.coerce.number().int().positive().optional(),
  API_PORT: z.coerce.number().int().positive().optional(),

  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  DATABASE_URL: z.string().min(1).optional(),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  APP_URL: z.string().url().default("http://localhost:3000"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  console.error(`\nConfiguração inválida. Verifique as variáveis de ambiente (.env):\n${issues}\n`);
  process.exit(1);
}

const data = parsed.data;

export const env = {
  ...data,
  PORT: data.PORT ?? data.API_PORT ?? 3001,
  isProduction: data.NODE_ENV === "production",
  isDevelopment: data.NODE_ENV === "development",
  isTest: data.NODE_ENV === "test",
} as const;

export type Env = typeof env;
