import type { User } from "@transcendence/shared/auth";
import { describe, expect, it } from "vitest";
import { InMemoryUsersRepository } from "../users/in-memory-users.repository.js";
import { DuplicateEmailError } from "../users/users.repository.js";
import { InMemoryCredentialsRepository } from "./in-memory-credentials.repository.js";

const sam: User = { id: "8f14e45f-ceea-4e7a-9f2b-3c1d2e4a5b6c", email: "sam@x.com", displayName: "Sam" };
const other: User = { id: "1c9b2f3e-7a4d-4e8f-8b6a-2d3c4e5f6a7b", email: "other@x.com", displayName: "Other" };

describe("InMemoryCredentialsRepository", () => {
  it("stores the user and their password hash together", async () => {
    const users = new InMemoryUsersRepository();
    const credentials = new InMemoryCredentialsRepository(users);
    await credentials.createUserWithCredentials(sam, "scrypt$hash");
    expect(await users.findById(sam.id)).toEqual(sam);
    expect(await credentials.findPasswordHash(sam.id)).toBe("scrypt$hash");
  });

  it("stores nothing when the user is a duplicate", async () => {
    const users = new InMemoryUsersRepository();
    const credentials = new InMemoryCredentialsRepository(users);
    await credentials.createUserWithCredentials(sam, "first");
    const twin = { ...other, email: "sam@x.com" };
    await expect(credentials.createUserWithCredentials(twin, "second")).rejects.toThrow(DuplicateEmailError);
    expect(await credentials.findPasswordHash(twin.id)).toBeNull();
  });

  it("returns null for a user without a password", async () => {
    const credentials = new InMemoryCredentialsRepository(new InMemoryUsersRepository());
    expect(await credentials.findPasswordHash(sam.id)).toBeNull();
  });
});
