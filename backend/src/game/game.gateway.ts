import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from "@nestjs/websockets";
import type { Socket } from "socket.io";
import {
  type ClientMessage,
  ArenaConfig,
  makeClientMessage,
  ServerMessage,
  GameSnapshot,
  PlayerId,
  RoomId,
} from "@transcendence/shared";
import { nanoid } from "nanoid";

const arena: ArenaConfig = { width: 800, height: 800 };
const ClientMessageSchema = makeClientMessage(arena);
const playerSockets: Record<PlayerId, Socket> = {};

// Attaches to the HTTP server. CORS reflects any origin so `ng serve`
// (different port) can complete the socket.io handshake in development.
@WebSocketGateway({ cors: { origin: true } })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  handleConnection(client: Socket): void {
    console.log("CONNECTED");
    let pi: PlayerId;
    do {
      pi = nanoid(5);
    } while (pi in playerSockets);
    playerSockets[pi] = client;
  }

  handleDisconnect(client: Socket): void {
    console.log("Player ${}");
  }

  @SubscribeMessage("message")
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: unknown,
  ): void {
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
    let response: ServerMessage = { type: "announcement", text: "Idk bud" };
    switch (msg.type) {
      case "join":
        // Auth or whatever
        break;

      case "input":
        response = { type: "announcement", text: "Input received" };
        break;
    }
    // Broadcast message to all clients except the sender
    client.broadcast.emit("message", JSON.stringify(response));
  }
}
