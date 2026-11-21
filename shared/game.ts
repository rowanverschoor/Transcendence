import type { ArenaConfig, Coord } from "./protocol.js";

/** Distance at which the speed ramp saturates (units). */
export const RAMP_DISTANCE = 100;

/** Base speed at full ramp for a default-size cell (units per second). */
export const BASE_SPEED = 40;

// Calculate ratio currentVelocity / maxVelocity
export const radiusFactor = (
  radius: number,
  defaultRadius: number = 25,
): number => {
  return Math.pow(radius / defaultRadius, -0.45);
};

/**
 * One step of cell movement toward `target`.
 * Speed = (dist / RAMP_DISTANCE capped at 1)^2 * BASE_SPEED * radiusFactor(radius),
 * capped at maxVelocity (units/s) and at the remaining distance to the target.
 */
export const moveCell = (
  pos: Coord,
  radius: number,
  target: Coord,
  maxVelocity: number,
  dtSeconds: number,
): Coord => {
  const dx = target.x - pos.x;
  const dy = target.y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return pos;
  const ramp = Math.min(dist / RAMP_DISTANCE, 1) ** 2;
  const step = Math.min(
    ramp * BASE_SPEED * radiusFactor(radius) * dtSeconds,
    maxVelocity * dtSeconds,
    dist,
  );
  return { x: pos.x + (dx / dist) * step, y: pos.y + (dy / dist) * step };
};

/**
 * Clamps a point into the arena, inset by `margin` (use cell radius for cells,
 * 0 for targets). A margin wider than half the arena collapses to its center.
 */
export const clampCoord = (
  pos: Coord,
  arena: ArenaConfig,
  margin = 0,
): Coord => {
  const clamp = (v: number, hi: number): number => {
    const lo = margin;
    hi -= margin;
    return hi < lo ? (lo + hi) / 2 : Math.min(Math.max(v, lo), hi);
  };
  return { x: clamp(pos.x, arena.width), y: clamp(pos.y, arena.height) };
};
