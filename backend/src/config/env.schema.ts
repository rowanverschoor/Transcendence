import { z } from "zod";

const envSchema = z.looseObject({
  NODE_ENV: z.enum(["development", "production"]).default("production"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  DATABASE_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;

export const validateEnv = (env: Record<string, unknown>): Env =>
  envSchema.parse(env);
