import { z } from "zod";

export const PlayerStats = z.object({
  ballsConsumed: z.number().int().nonnegative(),
  // gamesPlayed, wins, ... add as you decide them
});

export type PlayerStats = z.infer<typeof PlayerStats>;