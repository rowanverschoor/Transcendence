import { Coord } from "@transcendence/shared";

/** Inclusive integer in [from, to]. Consumers (geometry, hex colors) need ints. */
export const RandomFromTo = (from: number, to: number): number => {
  if (to < from) [from, to] = [to, from];
  return Math.floor(Math.random() * (to - from + 1)) + from;
};

export const RandomUpTo = (upto: number): number => {
  return RandomFromTo(0, upto);
};

export const RandomCoord = (
  width: number,
  height: number,
  margin?: number,
): Coord => {
  let xmin, xmax, ymin, ymax;
  if (margin === undefined) {
    [xmin, xmax] = [0, width];
    [ymin, ymax] = [0, height];
  } else if (margin < 0 || 0.5 <= margin)
    throw "RandomCoord: margin not in range 0 to 0.5";
  else {
    [xmin, xmax] = [width * margin, width * (1 - margin)];
    [ymin, ymax] = [height * margin, height * (1 - margin)];
  }
  return {
    x: RandomFromTo(xmin, xmax),
    y: RandomFromTo(ymin, ymax),
  };
};

export const distance = (a: Coord, b: Coord): number => {
  const c: Coord = { x: a.x - b.x, y: a.y - b.y };
  return Math.sqrt(c.x * c.x + c.y * c.y);
};
