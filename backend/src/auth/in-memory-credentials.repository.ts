import { Injectable } from "@nestjs/common";
import { UsersRepository } from "../users/users.repository.js";
import { CredentialsRepository } from "./credentials.repository.js";
import type { User, UserId } from "@transcendence/shared/auth";

/** Password hashes in their own Map, like the separate credentials table in the database. */
@Injectable()
export class InMemoryCredentialsRepository extends CredentialsRepository {
  private readonly hashes = new Map<UserId, string>();

  constructor(private readonly users: UsersRepository) {
    super();
  }

  async createUserWithCredentials(user: User, passwordHash: string): Promise<void> {
    await this.users.create(user); // throws on a duplicate, so no hash is stored
    this.hashes.set(user.id, passwordHash);
  }

  async findPasswordHash(userId: UserId): Promise<string | null> {
    return this.hashes.get(userId) ?? null;
  }
}
