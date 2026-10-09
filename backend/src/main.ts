import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import session from "express-session";
import { AppModule } from "./app.module.js";
import type { Env } from "./config/env.schema.js";

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create(AppModule);
	const config = app.get<ConfigService<Env, true>>(ConfigService);
	// resave/saveUninitialized default to unsafe values; cookies must be
	// Secure in production (cloudflared terminates TLS). Unset NODE_ENV is
	// treated as production by design, so prod behavior is the failure mode.
	app.use(
		session({
			secret: config.getOrThrow("SESSION_SECRET"),
			resave: false,
			saveUninitialized: false,
			cookie: {
				secure: config.get("NODE_ENV") === "production",
				sameSite: "lax",
			},
		}),
	);
	await app.listen(config.getOrThrow("PORT"));
	console.log(`Listening on http://localhost:${config.getOrThrow("PORT")}`);
}

bootstrap();
