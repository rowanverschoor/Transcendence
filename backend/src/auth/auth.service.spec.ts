import { ConflictException } from "@nestjs/common";
import { User } from "@transcendence/shared/auth";
import { describe, expect, it } from "vitest";
import { InMemoryUsersRepository } from "../users/in-memory-users.repository.js";
import { AuthService } from "./auth.service.js";
import { InMemoryCredentialsRepository } from "./in-memory-credentials.repository.js";
import { PasswordHasher } from "./password-hasher.js";

/** Wires the service by hand, the way NestJS does at startup. */
const setup = () => {
  const users = new InMemoryUsersRepository();
  const credentials = new InMemoryCredentialsRepository(users);
  const auth = new AuthService(credentials, new PasswordHasher());
  return { users, credentials, auth };
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
    await expect(auth.register({ ...request, displayName: "Other" })).rejects.toThrow("Email already in use");

  });

  it("refuses a taken display name with a 409, ignoring case", async () => {
    const { auth } = setup();
    await auth.register(request);
    await expect(auth.register({ ...request, email: "other@x.com", displayName: "SAM" })).rejects.toThrow(
      "Display name already in use",
    );
  });
});
