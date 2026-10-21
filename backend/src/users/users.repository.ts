import type { User, UserId } from "@transcendence/shared/auth";

export class DuplicateEmailError extends Error {
  constructor() {
    super("Email already in use"); // derived class's constructor must call super() and call before using `this`.
    this.name = "DuplicateEmailError";
  }
}

export class DuplicateDisplayNameError extends Error {
  constructor() {
    super("Display name already in use");
    this.name = "DuplicateDisplayNameError";
  }
}

/**
 * Storage for users. Knows nothing about passwords: anything that touches
 * both, like creating a user with a password, lives in auth/.
 *
 * An abstract class and not an interface, because NestJS needs a real class
 * at runtime to look up which implementation to inject.
 */

export abstract class UsersRepository {
  /**
   * TEMP: For users without a password (OAuth later). Register uses
   * CredentialsRepository.createUserWithCredentials instead.
   * Throws DuplicateEmailError or DuplicateDisplayNameError.
   */
  abstract create(user: User): Promise<void>;

  abstract findById(id: UserId): Promise<User | null>;

  /** Expects an email normalized by the `Email` schema (trimmed, lowercase). */
  abstract findByEmail(email: string): Promise<User | null>;

  /** Ignores case: "jimmothy" finds "Jimmothy". */
  abstract findByDisplayName(displayName: string): Promise<User | null>;
}
