import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GameModule } from "./game/game.module.js";
import { validateEnv} from "./config/env.schema.js";


@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: ".env",
			validate: validateEnv,
		}),
		GameModule
	],
})

export class AppModule {}
