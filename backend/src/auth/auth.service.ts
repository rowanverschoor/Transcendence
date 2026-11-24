import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import type { LoginRequest, RegisterRequest, User } from "@transcendence/shared/auth";
import { randomUUID } from "node:crypto";
import { DuplicateDisplayNameError, DuplicateEmailError, UsersRepository } from "../users/users.repository.js";
import { CredentialsRepository } from "./credentials.repository.js";
import { PasswordHasher } from "./password-hasher.js";

/** Registers users and checks their login. The HTTP side lives in AuthController. */
@Injectable()
export class AuthService {
  /**
   * A real hash of a random password nobody knows. Login checks against it
   * when the email is unknown, so that case costs the same scrypt run as a
   * wrong password, and the response time doesn't show which emails exist.
   */
  private readonly dummyHash: Promise<string>;

  constructor(
    private readonly users: UsersRepository,
    private readonly credentials: CredentialsRepository,
    private readonly hasher: PasswordHasher,
  ) {
    this.dummyHash = hasher.hash(randomUUID());
  }

  async register(request: RegisterRequest): Promise<User> {
    const user: User = { id: randomUUID(), email: request.email, displayName: request.displayName };
    const passwordHash = await this.hasher.hash(request.password);
    try {
      await this.credentials.createUserWithCredentials(user, passwordHash);
    } catch (err) {
      if (err instanceof DuplicateEmailError || err instanceof DuplicateDisplayNameError) {
        // TEMP: "Email already in use" tells anyone which emails have an account.
        // Once we send verification emails, register always answers "check your
        // email" instead to prevent phishing attacks (docs/auth.md, Q7).
        throw new ConflictException(err.message);
      }
      throw err;
    }
    return user;
  }

  /**
   * Returns the user if the email and password match. It does not start a
   * session, so other ways of logging in, like OAuth, can reuse the session code.
   */
  async login(request: LoginRequest): Promise<User> {
    const user = await this.users.findByEmail(request.email);
    const storedHash = user ? await this.credentials.findPasswordHash(user.id) : null;

    // Always run one scrypt check, even when there is nothing to check against.
    const matches = await this.hasher.verify(request.password, storedHash ?? (await this.dummyHash));

    // Same answer for an unknown email, a wrong password and an account
    // without a password, so the answer doesn't show which emails exist.
    if (!user || !storedHash || !matches) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return user;
  }
}
