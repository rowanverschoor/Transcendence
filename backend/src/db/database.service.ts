import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { Env } from "../config/env.schema.js";
import * as schema from "./schema.js";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
	readonly db: NodePgDatabase<typeof schema>;
	private readonly pool: Pool;
	
	constructor(config: ConfigService<Env, true>) {
		this.pool = new Pool({
			connectionString: config.getOrThrow("DATABASE_URL"),
		});
		this.db = drizzle(this.pool, { schema });
	}

	async onModuleDestroy(): Promise<void> {
		await this.pool.end();
	}
}