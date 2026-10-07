import { MessageBody, SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket } from "@nestjs/websockets";
import type { Socket } from "socket.io";
import { type ClientMessage, ArenaConfig, makeClientMessage, ServerMessage } from "@transcendence/shared";

const arena: ArenaConfig = { width: 800, height: 800 };
const ClientMessageSchema = makeClientMessage(arena);

// Attaches to the HTTP server. CORS reflects any origin so `ng serve`
// (different port) can complete the socket.io handshake in development.
@WebSocketGateway({ cors: { origin: true } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
	handleConnection(): void {
		console.log("CONNECTED");
	}

	handleDisconnect(): void {
		console.log("DISCONNECTED");
	}

	@SubscribeMessage("message")
	handleMessage(@ConnectedSocket() client: Socket, @MessageBody() data: unknown): void {
		// Binary messages might be interesting in a later stage.
		// Could reduce overhead.
		if (typeof data !== "string") {
			return;
		}
		let msg: ClientMessage;
		try {
			msg = ClientMessageSchema.parse(JSON.parse(data));
		} catch {
			console.error("Invalid ClientMessage received");
			return;
		}
		let response: ServerMessage;
		switch (msg.type) {
			case "join":
				response = { type: "announcement", text: "A player joined" };
				break;

			case "input":
				response = { type: "announcement", text: "Input received" };
				break;
		}
		// Broadcast message to all clients except the sender
		client.broadcast.emit("message", JSON.stringify(response));
	}
}
