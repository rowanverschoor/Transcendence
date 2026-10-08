import { type Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ArenaConfig } from "@transcendence/shared";
import type { Env } from "../config/env.schema.js";

/** Tunables for the game subsystem, derived from validated env at boot. */
export type GameConfig = ArenaConfig & {
  readonly capacity: number;
  readonly foodRadius: number;
  readonly nFoodChunks: number;
};

// Injection token: string keys stay stable across the module boundary.
export const GAME_CONFIG = "GAME_CONFIG" as const;

/**
 * Factory provider over @nestjs/config: the env is already coerced and
 * validated by envSchema (ConfigModule.forRoot validate), so these reads are
 * guaranteed numbers.
 */
export const gameConfigProvider: Provider = {
  provide: GAME_CONFIG,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>): GameConfig => ({
    width: config.getOrThrow("ARENA_WIDTH"),
    height: config.getOrThrow("ARENA_HEIGHT"),
    capacity: config.getOrThrow("ROOM_CAPACITY"),
    foodRadius: config.getOrThrow("FOOD_RADIUS"),
    nFoodChunks: config.getOrThrow("N_FOOD_CHUNKS"),
  }),
};
