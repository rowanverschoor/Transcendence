import type { User, UserId } from "@transcendence/shared/auth";

/**
 * Storage for password hashes, kept apart from users so the user record
 * never carries a secret. Same abstract class reason as UsersRepository.
 */
export abstract class CredentialsRepository {
  
  /**
   * Creates the user and their password hash together, all or nothing, so
   * there is never a user without a password.
   * Throws DuplicateEmailError or DuplicateDisplayNameError.
   */
  abstract createUserWithCredentials(user: User, passwordHash: string): Promise<void>;

  /**
   * The stored hash, which includes the salt. Null if the user has no
   * password (OAuth later).
   */
  abstract findPasswordHash(userId: UserId): Promise<string | null>;
}