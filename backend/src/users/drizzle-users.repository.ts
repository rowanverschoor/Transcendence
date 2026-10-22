import { Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import type { User, UserId } from "@transcendence/shared/auth";
import { DatabaseService } from "../db/database.service.js";
import { users } from "../db/schema.js";
import { UsersRepository } from "./users.repository.js";
import { translateDuplicateUserError } from "./duplicate-error.js";

@Injectable()
export class DrizzleUsersRepository extends UsersRepository {
	constructor(private readonly database: DatabaseService) {
		super();
	}
	private toUser(row: {
		id: string;
		email: string;
		displayName: string;
	}): User {
		return {
			id: row.id,
			email: row.email,
			displayName: row.displayName,
		};
	}
	async findById(id: UserId): Promise<User | null> {
		const [row] = await this.database.db
			.select({
				id: users.id,
				email: users.email,
				displayName: users.displayName,
			})
			.from(users)
			.where(eq(users.id, id))
			.limit(1);
			return row ? this.toUser(row) : null;
	}
	async findByEmail(email: string): Promise<User | null> {
		const [row] = await this.database.db
			.select({
				id: users.id,
				email: users.email,
				displayName: users.displayName,
			})
			.from(users)
			.where(eq(users.email, email))
			.limit(1);
			return row ? this.toUser(row) : null;
	}
	async findByDisplayName(displayName: string): Promise<User | null> {
		const [row] = await this.database.db
			.select({
				id: users.id,
				email: users.email,
				displayName: users.displayName,
			})
			.from(users)
			.where(sql`lower(${users.displayName}) = ${displayName.toLowerCase()}`)
			.limit(1);
			return row ? this.toUser(row) : null;
	}
	async create(user: User): Promise<void> {
		try {
			await this.database.db.insert(users).values({
				id: user.id,
				email: user.email,
				displayName: user.displayName,
			});
		}
		catch (error) {
			throw translateDuplicateUserError(error);
		}
	}
}