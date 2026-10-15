import { afterEach, describe, expect, it, vi } from "vitest";
import { RandomFromTo, RandomUpTo } from "./utils.js";

afterEach(() => vi.restoreAllMocks());

describe("RandomFromTo", () => {
  it("stays within the inclusive bounds over many trials", () => {
    for (let i = 0; i < 1000; i += 1) {
      const value = RandomFromTo(-3, 7);
      expect(value).toBeGreaterThanOrEqual(-3);
      expect(value).toBeLessThanOrEqual(7);
      expect(Number.isInteger(value));
    }
  });

  it("hits both bounds inclusively", () => {
    expect(RandomFromTo(5, 5)).toBe(5);
    vi.spyOn(Math, "random").mockReturnValueOnce(0);
    expect(RandomFromTo(10, 20)).toBe(10);
    vi.spyOn(Math, "random").mockReturnValueOnce(0.999999);
    expect(RandomFromTo(10, 20)).toBe(20);
  });
});

describe("RandomUpTo", () => {
  it("stays within the inclusive bounds over many trails", () => {
    for (let i = 0; i < 1000; i += 1) {
      const value = RandomUpTo(10);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).lessThanOrEqual(10);
      expect(Number.isInteger(value));
    }
  });

  it("hits both bounds inclusively", () => {
    expect(RandomUpTo(0)).toBe(0);
    vi.spyOn(Math, "random").mockReturnValueOnce(0.999999);
    expect(RandomUpTo(10)).toBe(10);
  });
});
