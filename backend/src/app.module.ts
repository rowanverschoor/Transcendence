import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnv } from "./config/env.schema.js";
import { GameModule } from "./game/game.module.js";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ".env",
			validate: validateEnv,
		}),
		GameModule,
	],
})
export class AppModule {}
