import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { ConfigService } from "@nestjs/config";

async function bootstrap(): Promise<void> {
	const app = await NestFactory.create(AppModule);
	const config = app.get(ConfigService);
	const port = config.getOrThrow<number>("PORT");
	await app.listen(port);
	console.log(`Listening on http://localhost:${port}`);
}

bootstrap();
