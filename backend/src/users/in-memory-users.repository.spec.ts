import type { User } from "@transcendence/shared/auth";
import { describe, expect, it } from "vitest";
import { InMemoryUsersRepository } from "./in-memory-users.repository.js";
import { DuplicateDisplayNameError, DuplicateEmailError } from "./users.repository.js";

const sam: User = { id: "8f14e45f-ceea-4e7a-9f2b-3c1d2e4a5b6c", email: "sam@x.com", displayName: "Sam" };
const other: User = { id: "1c9b2f3e-7a4d-4e8f-8b6a-2d3c4e5f6a7b", email: "other@x.com", displayName: "Other" };

describe("InMemoryUsersRepository", () => {
  it("finds a created user by id, email and display name", async () => {
    const users = new InMemoryUsersRepository();
    await users.create(sam);
    expect(await users.findById(sam.id)).toEqual(sam);
    expect(await users.findByEmail("sam@x.com")).toEqual(sam);
    expect(await users.findByDisplayName("Sam")).toEqual(sam);
  });

  it("finds display names ignoring case", async () => {
    const users = new InMemoryUsersRepository();
    await users.create(sam);
    expect(await users.findByDisplayName("sAM")).toEqual(sam);
  });

  it("returns null for unknown users", async () => {
    const users = new InMemoryUsersRepository();
    expect(await users.findById(sam.id)).toBeNull();
    expect(await users.findByEmail("sam@x.com")).toBeNull();
    expect(await users.findByDisplayName("Sam")).toBeNull();
  });

  it("refuses a taken email", async () => {
    const users = new InMemoryUsersRepository();
    await users.create(sam);
    await expect(users.create({ ...other, email: "sam@x.com" })).rejects.toThrow(DuplicateEmailError);
  });

  it("refuses a taken display name, ignoring case", async () => {
    const users = new InMemoryUsersRepository();
    await users.create(sam);
    await expect(users.create({ ...other, displayName: "SAM" })).rejects.toThrow(DuplicateDisplayNameError);
  });
});
