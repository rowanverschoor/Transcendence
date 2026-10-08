import { Module } from "@nestjs/common";
import { GameGateway } from "./game.gateway.js";
import { gameConfigProvider } from "./game.config.js";
import { RoomRegistry } from "./gameroom.js";

@Module({
	providers: [gameConfigProvider, RoomRegistry, GameGateway],
})
export class GameModule {}
