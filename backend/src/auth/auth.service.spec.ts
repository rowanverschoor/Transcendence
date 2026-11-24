import { User } from "@transcendence/shared/auth";
import { describe, expect, it, vi } from "vitest";
import { InMemoryUsersRepository } from "../users/in-memory-users.repository.js";
import { AuthService } from "./auth.service.js";
import { InMemoryCredentialsRepository } from "./in-memory-credentials.repository.js";
import { PasswordHasher } from "./password-hasher.js";

/** Wires the service by hand, the way NestJS does at startup. */
const setup = () => {
  const users = new InMemoryUsersRepository();
  const credentials = new InMemoryCredentialsRepository(users);
  const hasher = new PasswordHasher();
  const auth = new AuthService(users, credentials, hasher);
  return { users, credentials, hasher, auth };
};

const request = { email: "sam@x.com", displayName: "Sam", password: "correct-horse" };

describe("AuthService.register", () => {
  it("stores the user and a hash, and returns only the safe user", async () => {
    const { users, credentials, auth } = setup();
    const user = await auth.register(request);

    expect(User.parse(user)).toEqual(user);
    expect(Object.keys(user).sort()).toEqual(["displayName", "email", "id"]);
    expect(await users.findByEmail("sam@x.com")).toEqual(user);

    const hash = await credentials.findPasswordHash(user.id);
    expect(hash).toMatch(/^scrypt\$/);
    expect(hash).not.toContain("correct-horse");
  });

  it("refuses a taken email with a 409", async () => {
    const { auth } = setup();
    await auth.register(request);
    await expect(auth.register({ ...request, displayName: "Other" })).rejects.toMatchObject({
      response: { statusCode: 409, message: "Email already in use", error: "Conflict" },
    });
  });

  it("refuses a taken display name with a 409, ignoring case", async () => {
    const { auth } = setup();
    await auth.register(request);
    await expect(auth.register({ ...request, email: "other@x.com", displayName: "SAM" })).rejects.toMatchObject({
      response: { statusCode: 409, message: "Display name already in use", error: "Conflict" },
    });
  });
});

describe("AuthService.login", () => {
  const invalid = { response: { statusCode: 401, message: "Invalid email or password", error: "Unauthorized" } };

  it("returns the user for the right email and password", async () => {
    const { auth } = setup();
    const registered = await auth.register(request);
    expect(await auth.login({ email: "sam@x.com", password: "correct-horse" })).toEqual(registered);
  });

  it("refuses a wrong password with a 401", async () => {
    const { auth } = setup();
    await auth.register(request);
    await expect(auth.login({ email: "sam@x.com", password: "battery-staple" })).rejects.toMatchObject(invalid);
  });

  it("gives an unknown email the same 401 as a wrong password", async () => {
    const { auth } = setup();
    await expect(auth.login({ email: "nobody@x.com", password: "correct-horse" })).rejects.toMatchObject(invalid);
  });

  it("gives a user without a password the same 401", async () => {
    // Later an OAuth user, who has no password to check.
    const { users, auth } = setup();
    await users.create({ id: crypto.randomUUID(), email: "oauth@x.com", displayName: "OAuth" });
    await expect(auth.login({ email: "oauth@x.com", password: "anything" })).rejects.toMatchObject(invalid);
  });

  it("still runs one scrypt check for an unknown email, so it takes as long as a wrong password", async () => {
    const { hasher, auth } = setup();
    const verify = vi.spyOn(hasher, "verify");
    await expect(auth.login({ email: "nobody@x.com", password: "correct-horse" })).rejects.toThrow();
    expect(verify).toHaveBeenCalledOnce();
  });
});
