import { describe, expect, it } from "vitest";
import { PasswordHasher } from "./password-hasher.js";

const hasher = new PasswordHasher();

describe("PasswordHasher", () => {
  it("stores the settings, salt and hash in one string", async () => {
    const stored = await hasher.hash("correct-horse");
    const [algorithm, n, r, p, salt, hash] = stored.split("$");
    expect([algorithm, n, r, p]).toEqual(["scrypt", "16384", "8", "5"]);
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).toMatch(/^[0-9a-f]{128}$/);
  });

  it("never stores the password itself", async () => {
    expect(await hasher.hash("correct-horse")).not.toContain("correct-horse");
  });

  it("uses a new salt every time", async () => {
    expect(await hasher.hash("correct-horse")).not.toBe(await hasher.hash("correct-horse"));
  });
});
