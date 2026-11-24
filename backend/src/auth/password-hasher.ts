import { Injectable } from "@nestjs/common";
import { randomBytes, scrypt } from "node:crypto";

// One of OWASP's recommended scrypt settings: about 16 MiB and 120 ms per hash.
// The cost is what slows down guessing if the database is ever stolen.
const COST = 16384; // N, must be a power of two
const BLOCK_SIZE = 8; // r, memory is 128 * N * r = 16 MiB
const PARALLELISM = 5; // p, independent runs: costs time, not memory
const SALT_BYTES = 16;
const HASH_BYTES = 64;

/**
 * Turns a password into one string that holds everything needed to check it
 * later: scrypt$N$r$p$<salt hex>$<hash hex>. Keeping the settings in the
 * string means they can be raised later without breaking older passwords.
 */
@Injectable()
export class PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const hash = await new Promise<Buffer>((resolve, reject) => {
      scrypt(password, salt, HASH_BYTES, { N: COST, r: BLOCK_SIZE, p: PARALLELISM }, (err, key) =>
        err ? reject(err) : resolve(key),
      );
    });
    return ["scrypt", COST, BLOCK_SIZE, PARALLELISM, salt.toString("hex"), hash.toString("hex")].join("$");
  }
}
