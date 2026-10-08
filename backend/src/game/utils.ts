export const RandomFromTo = (from: number, to: number): number => {
  if (to < from) [from, to] = [to, from];
  return Math.random() * (to - from + 1) + from;
};

export const RandomUpTo = (upto: number): number => {
  return RandomFromTo(0, upto);
};
