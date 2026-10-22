import type { ConfigService } from "@nestjs/config";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";
import type { Env } from "../config/env.schema.js";
import { DatabaseService } from "./database.service.js";

export function makeTestDatabase(): DatabaseService {
	const url = process.env.TEST_DATABASE_URL;
	if (!url) {
		throw new Error("Need valid TEST_DATABASE_URL for repo tests");
	}
	const config = { getOrThrow: () => url } as unknown as ConfigService<Env, true>;
	return new DatabaseService(config);
}

export async function migrateTestDatabase( database: DatabaseService ): Promise<void> {
	const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));
	await migrate(database.db, { migrationsFolder });
}

export async function resetTestDatabase( database: DatabaseService ): Promise<void> {
	await database.db.execute(sql `TRUNCATE TABLE users CASCADE`);
}