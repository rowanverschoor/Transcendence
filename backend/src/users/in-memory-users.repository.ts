import { Injectable } from "@nestjs/common";
import { DuplicateDisplayNameError, DuplicateEmailError, UsersRepository } from "./users.repository.js";
import type { User, UserId } from "@transcendence/shared/auth";

/** Users kept in a Map. For tests, and for the running backend until Postgres. */
@Injectable()
export class InMemoryUsersRepository extends UsersRepository {
  private readonly users = new Map<UserId, User>();

  async create(user: User): Promise<void> {
    // No awaits, so two simultaneous creates
    // can't both pass the check and be added
    if (this.byEmail(user.email)) throw new DuplicateEmailError();
    if (this.byDisplayName(user.displayName)) throw new DuplicateDisplayNameError();
    this.users.set(user.id, user);
  }

  async findById(id: UserId): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.byEmail(email);
  }

  async findByDisplayName(displayName: string): Promise<User | null> {
    return this.byDisplayName(displayName);
  }

  private byEmail(email: string): User | null {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  private byDisplayName(displayName: string): User | null {
    const wanted = displayName.toLowerCase();
    for (const user of this.users.values()) {
      if (user.displayName.toLowerCase() === wanted) return user;
    }
    return null;
  }
}
