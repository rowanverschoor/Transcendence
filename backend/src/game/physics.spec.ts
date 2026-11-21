import { describe, expect, it } from "vitest";
import {
  BASE_SPEED,
  clampCoord,
  moveCell,
  RAMP_DISTANCE,
  radiusFactor,
} from "@transcendence/shared/game";

const arena = { width: 800, height: 600 };

describe("moveCell", () => {
  it("moves at the saturated ramp speed for a far target", () => {
    // dist 600 saturates the ramp (t = 1); 40 units/s * 0.05 s = 2 units.
    const pos = { x: 100, y: 100 };
    expect(moveCell(pos, 25, { x: pos.x + 600, y: pos.y }, 1000, 0.05)).toEqual({
      x: 102,
      y: 100,
    });
  });

  it("ramps quadratically below the saturation distance", () => {
    const step = moveCell({ x: 0, y: 0 }, 25, { x: 50, y: 0 }, 1000, 1);
    // (50 / RAMP_DISTANCE)^2 = 0.25, so a quarter of BASE_SPEED.
    expect(step.x).toBeCloseTo(BASE_SPEED * (50 / RAMP_DISTANCE) ** 2);
    expect(step.y).toBe(0);
  });

  it("caps the step at maxVelocity * dtSeconds", () => {
    const step = moveCell({ x: 0, y: 0 }, 25, { x: 500, y: 0 }, 10, 0.5);
    expect(step).toEqual({ x: 5, y: 0 });
  });

  it("stops exactly on a target closer than one step", () => {
    // 5 s at 40 units/s would travel 200 units; target is only 100 away.
    const target = { x: 0, y: 100 };
    expect(moveCell({ x: 0, y: 0 }, 25, target, 1000, 5)).toEqual(target);
  });

  it("returns pos unchanged when already at the target", () => {
    const pos = { x: 12, y: 34 };
    expect(moveCell(pos, 25, { x: 12, y: 34 }, 1000, 0.05)).toBe(pos);
  });

  it("moves a larger cell slower by radiusFactor", () => {
    const dt = 0.1;
    const small = moveCell({ x: 0, y: 0 }, 25, { x: 500, y: 0 }, 1000, dt).x;
    const large = moveCell({ x: 0, y: 0 }, 100, { x: 500, y: 0 }, 1000, dt).x;
    expect(large).toBeLessThan(small);
    expect(large).toBeCloseTo(small * radiusFactor(100));
  });

  it("moves diagonally without changing the step length", () => {
    const step = moveCell({ x: 0, y: 0 }, 25, { x: 300, y: 400 }, 1000, 0.05);
    expect(Math.hypot(step.x, step.y)).toBeCloseTo(2);
    expect(step.x / step.y).toBeCloseTo(3 / 4);
  });
});

describe("clampCoord", () => {
  it("insets by the margin on all four sides", () => {
    const m = 10;
    expect(clampCoord({ x: -50, y: -50 }, arena, m)).toEqual({ x: m, y: m });
    expect(clampCoord({ x: 9999, y: 9999 }, arena, m)).toEqual({
      x: arena.width - m,
      y: arena.height - m,
    });
  });

  it("leaves an inside point untouched", () => {
    const pos = { x: 400, y: 300 };
    expect(clampCoord(pos, arena)).toEqual(pos);
  });

  it("collapses a margin wider than half the arena to its center", () => {
    expect(clampCoord({ x: 0, y: 0 }, arena, 500)).toEqual({
      x: 400,
      y: 300,
    });
  });
});
