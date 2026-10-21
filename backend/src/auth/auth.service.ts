import { ConflictException, Injectable } from "@nestjs/common";
import type { RegisterRequest, User } from "@transcendence/shared/auth";
import { randomUUID } from "node:crypto";
import { DuplicateDisplayNameError, DuplicateEmailError } from "../users/users.repository.js";
import { CredentialsRepository } from "./credentials.repository.js";
import { PasswordHasher } from "./password-hasher.js";

/** Registers users, and logs them in later. The HTTP side lives in AuthController. */
@Injectable()
export class AuthService {
  constructor(
    private readonly credentials: CredentialsRepository,
    private readonly hasher: PasswordHasher,
  ) { }

  async register(request: RegisterRequest): Promise<User> {
    const user: User = { id: randomUUID(), email: request.email, displayName: request.displayName };
    const passwordHash = await this.hasher.hash(request.password);
    try {
      await this.credentials.createUserWithCredentials(user, passwordHash);
    } catch (err) {
      if (err instanceof DuplicateEmailError || err instanceof DuplicateDisplayNameError) {
        throw new ConflictException(err.message);
      }
      throw err;
    }
    return user;
  }
}
