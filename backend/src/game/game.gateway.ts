import { MessageBody, SubscribeMessage, WebSocketGateway, OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket } from "@nestjs/websockets";
import type { Socket } from "socket.io";
import { ClientMessage, ServerMessage } from "@transcendence/shared";

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
			msg = ClientMessage.parse(JSON.parse(data));
		} catch {
			console.error("Invalid ClientMessage received");
			return;
		}
		let response: ServerMessage;
		switch (msg.type) {
			case "mousemove":
				response = { type: "forward", msg };
				break;

			default:
				response = { type: "announcement", text: "Unexpected ClientMessage type received" };
				break;
		}
		// Broadcast message to all clients except the sender
		client.broadcast.emit("message", JSON.stringify(response));
	}
}
