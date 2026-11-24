import { scryptSync } from "node:crypto";
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

describe("PasswordHasher.verify", () => {
  it("accepts the right password", async () => {
    const stored = await hasher.hash("correct-horse");
    expect(await hasher.verify("correct-horse", stored)).toBe(true);
  });

  it("refuses a wrong password", async () => {
    const stored = await hasher.hash("correct-horse");
    expect(await hasher.verify("battery-staple", stored)).toBe(false);
  });

  it("refuses a password that only differs in letter case", async () => {
    const stored = await hasher.hash("correct-horse");
    expect(await hasher.verify("Correct-Horse", stored)).toBe(false);
  });

  it("checks with the settings in the stored string, not the current ones", async () => {
    // A hash made with older, cheaper settings must still work after we raise them.
    const salt = Buffer.from("00112233445566778899aabbccddeeff", "hex");
    const hash = scryptSync("correct-horse", salt, 32, { N: 1024, r: 8, p: 1 });
    const stored = ["scrypt", 1024, 8, 1, salt.toString("hex"), hash.toString("hex")].join("$");
    expect(await hasher.verify("correct-horse", stored)).toBe(true);
    expect(await hasher.verify("battery-staple", stored)).toBe(false);
  });

  // A stored string we can't read is a bug on our side, not a wrong password,
  // so verify throws and login answers 500 instead of 401 (returning false)
  const salt = "00112233445566778899aabbccddeeff";
  const hash = "ab".repeat(64);
  it.each([
    ["empty", ""],
    ["plain text", "password123"],
    ["another algorithm", "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"],
    ["wrong separator", `scrypt:16384:8:5:${salt}:${hash}`],
    ["missing parts", `scrypt$16384$8$5$${salt}`],
    ["N not a power of two", `scrypt$1000$8$5$${salt}$${hash}`],
    // Buffer.from(..., "hex") silently drops what isn't hex instead of throwing.
    ["salt not hex", `scrypt$16384$8$5$ABEiM0RVZneImaq7zN3u/w==$${hash}`],
    ["hash not hex", `scrypt$16384$8$5$${salt}$zz${hash}`],
    // Two empty buffers compare as equal, so this would accept any password.
    ["empty hash", `scrypt$16384$8$5$${salt}$`],
    ["empty salt", `scrypt$16384$8$5$$${hash}`],
    // A shorter scrypt hash is the start of the longer one, so a cut-off hash
    // still matches the right password, but wrong ones get in more often.
    ["hash too short", `scrypt$16384$8$5$${salt}$9f8e7d6c5b4a`],
    ["salt too short", `scrypt$16384$8$5$0011223344$${hash}`],
  ])("throws on a stored string it can't read: %s", async (_case, stored) => {
    await expect(hasher.verify("correct-horse", stored)).rejects.toThrow();
  });
});
