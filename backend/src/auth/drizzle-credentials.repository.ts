import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { User, UserId } from "@transcendence/shared/auth";
import { DatabaseService } from "../db/database.service.js";
import { credentials, users } from "../db/schema.js";
import { CredentialsRepository } from "./credentials.repository.js";
import { translateDuplicateUserError } from "../users/duplicate-error.js";

@Injectable()
export class DrizzleCredentialsRepository extends CredentialsRepository {
	constructor(private readonly database: DatabaseService) {
		super();
	}

	async findPasswordHash(userId: UserId): Promise<string | null> {
		const [row] = await this.database.db
			.select({ passwordHash: credentials.passwordHash })
			.from(credentials)
			.where(eq(credentials.userId, userId))
			.limit(1);
		return row?.passwordHash ?? null;
	}
	
	async createUserWithCredentials(user: User, passwordHash: string,): Promise <void> {
		try {
			await this.database.db.transaction(async (tx) => {
				await tx.insert(users).values({
					id: user.id,
					email: user.email,
					displayName: user.displayName,
				});
				await tx.insert(credentials).values({
					userId: user.id,
					passwordHash,
				});
			});
		} catch (error) {
			throw translateDuplicateUserError(error);
		}
	}
}
