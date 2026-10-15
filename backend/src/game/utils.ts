import { Coord } from "@transcendence/shared";

/** Inclusive integer in [from, to]. Consumers (geometry, hex colors) need ints. */
export const RandomFromTo = (from: number, to: number): number => {
  if (to < from) [from, to] = [to, from];
  return Math.floor(Math.random() * (to - from + 1)) + from;
};

export const RandomUpTo = (upto: number): number => {
  return RandomFromTo(0, upto);
};

export const distance = (a: Coord, b: Coord): number => {
  const c: Coord = { x: a.x - b.x, y: a.y - b.y };
  return Math.sqrt(c.x * c.x + c.y * c.y);
};
