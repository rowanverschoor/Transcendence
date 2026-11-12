import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

// npm workspace scripts run with cwd = backend/, so the repo-root .env is one
// level up. Resolve relative to this config file so it also works if invoked
// from elsewhere with --config.
const envPath = resolve(import.meta.dirname, "../.env");
if (existsSync(envPath)) {
	process.loadEnvFile(envPath);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error(
		"DATABASE_URL is not set. Copy .env.example to .env at the repo root, or export DATABASE_URL before running drizzle-kit.",
	);
}

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/db/schema.ts",
	out: "./drizzle",
	dbCredentials: {
		url: databaseUrl,
	},
});