import { z } from "zod";

/**
 * The single zod view of process environment.
 *
 * ConfigModule.forRoot({ validate: ... }) runs this once at boot: .env and
 * process env are coerced and checked together, and the parsed result becomes
 * the only thing ConfigService serves. Unknown keys pass through untouched so
 * future subsystems (DB URLs, OAuth secrets) can be added without touching
 * this schema.
 *
 * Defaults mirror current dev values; production overrides via .env or
 * docker-compose environment. NODE_ENV defaults to "production": an unset
 * environment is treated as deployment, so the dev placeholder
 * SESSION_SECRET only works once NODE_ENV=development is declared.
 */

/** Rot me if changed: the refine below forbids exactly this value in production. */
const DEV_SESSION_SECRET_PLACEHOLDER = "hoedjevanpapier";

const envSchema = z
  .looseObject({
    NODE_ENV: z.enum(["development", "production"]).default("production"),
    PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    SESSION_SECRET: z.string().min(1).default(DEV_SESSION_SECRET_PLACEHOLDER),
    ROOM_CAPACITY: z.coerce.number().int().min(2).max(200).default(10),
    ARENA_WIDTH: z.coerce.number().int().min(100).max(4000).default(800),
    ARENA_HEIGHT: z.coerce.number().int().min(100).max(4000).default(800),
    FOOD_RADIUS: z.coerce.number().int().min(1).max(100).default(5),
    N_FOOD_CHUNKS: z.coerce.number().int().min(1).max(500).default(50),
  })
  .refine(
    (env) =>
      env.NODE_ENV === "development" ||
      env.SESSION_SECRET !== DEV_SESSION_SECRET_PLACEHOLDER,
    {
      message:
        "The dev placeholder SESSION_SECRET is not allowed in production; set a real secret in the environment",
      path: ["SESSION_SECRET"],
    },
  );

export type Env = z.infer<typeof envSchema>;

/** Adapter handed to ConfigModule.forRoot({ validate }); fails boot on bad env. */
export const validateEnv = (env: Record<string, unknown>): Env =>
  envSchema.parse(env);
