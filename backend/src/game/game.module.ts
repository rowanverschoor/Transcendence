import { Module } from "@nestjs/common";
import { GameGateway } from "./game.gateway.js";
import { gameConfigProvider } from "./game.config.js";

@Module({
	providers: [gameConfigProvider, GameGateway],
})
export class GameModule {}
