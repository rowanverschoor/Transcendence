import { Injectable } from "@nestjs/common";
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// One of OWASP's recommended scrypt settings: about 16 MiB and 120 ms per hash.
// The cost is what slows down guessing if the database is ever stolen.
const COST = 16384; // N, must be a power of two
const BLOCK_SIZE = 8; // r, memory is 128 * N * r = 16 MiB
const PARALLELISM = 5; // p, independent runs: costs time, not memory
const SALT_BYTES = 16;
const HASH_BYTES = 64;
// Shortest salt or hash verify accepts. Shorter means the stored string was cut off.
const MIN_BYTES = 16;

function fromHex(hex: string): Buffer {
  if (!/^([0-9a-f]{2})+$/.test(hex) || hex.length < MIN_BYTES * 2) {
    throw new Error("Stored password hash has a bad salt or hash part");
  }
  return Buffer.from(hex, "hex");
}

// A hash takes about 120 ms on purpose, so it runs async instead of blocking the server.
function scryptAsync(password: string, salt: Buffer, length: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, length, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

/**
 * Turns a password into one string that holds everything needed to check it
 * later: scrypt$N$r$p$<salt hex>$<hash hex>. Keeping the settings in the
 * string means they can be raised later without breaking older passwords.
 */
@Injectable()
export class PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const hash = await scryptAsync(password, salt, HASH_BYTES, { N: COST, r: BLOCK_SIZE, p: PARALLELISM });
    return ["scrypt", COST, BLOCK_SIZE, PARALLELISM, salt.toString("hex"), hash.toString("hex")].join("$");
  }

  /**
   * Hashes the password again with the settings and salt from `stored`, and
   * compares the two. timingSafeEqual takes the same time wherever the first
   * difference is, so timing can't show how much of a hash matched. Throws
   * when `stored` can't be read, because that is a bug, not a wrong password.
   */
  async verify(password: string, stored: string): Promise<boolean> {
    const parts = stored.split("$");
    const [algorithm, n, r, p, saltHex, hashHex] = parts;
    if (parts.length !== 6 || algorithm !== "scrypt") {
      throw new Error("Stored password hash is not in scrypt$N$r$p$salt$hash format");
    }
    const salt = fromHex(saltHex);
    const expected = fromHex(hashHex);
    const actual = await scryptAsync(password, salt, expected.length, { N: Number(n), r: Number(r), p: Number(p) });
    return timingSafeEqual(actual, expected);
  }
}
