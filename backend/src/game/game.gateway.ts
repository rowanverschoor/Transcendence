import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from "@nestjs/websockets";
import { Inject } from "@nestjs/common";
import type { ArgumentMetadata } from "@nestjs/common";
import type { Server, Socket } from "socket.io";
import {
  type ClientMessage,
  type ClientMessageSchema,
  makeClientMessage,
  ServerMessage,
  RoomId,
} from "@transcendence/shared";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe.js";
import { RoomRegistry } from "./gameroom.js";
import { GAME_CONFIG, type GameConfig } from "./game.config.js";

// Attaches to the HTTP server. CORS reflects any origin so `ng serve`
// (different port) can complete the socket.io handshake in development.
@WebSocketGateway({ cors: { origin: true } })
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly messagePipe: ZodValidationPipe<ClientMessageSchema>;
  readonly config: GameConfig;

  // The @swc-node runner emits `design:paramtypes`, so class-typed parameters
  // (RoomRegistry) resolve by type. GameConfig stays on a string token: it is
  // an interface, and interface paramtypes reflect as `Object`.
  constructor(
    @Inject(GAME_CONFIG) config: GameConfig,
    private readonly registry: RoomRegistry,
  ) {
    this.messagePipe = new ZodValidationPipe(
      makeClientMessage({
        width: config.width,
        height: config.height,
      }),
    );
    this.config = config;
  }

  afterInit(server: Server) {
    const id: RoomId = "0123456789";
    this.registry.create(id, server);
  }

  handleConnection(client: Socket): void {
    console.log(`CONNECT: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.registry.removeClient(client.id);
  }

  @SubscribeMessage("message")
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): void {
    // The schema is arena-bound, and arena dims come from validated env, so
    // the pipe is built in the constructor (decorators cannot see DI values).
    const msg: ClientMessage = this.messagePipe.transform(payload, {
      type: "body",
    } satisfies ArgumentMetadata);
    const response: ServerMessage = { type: "announcement", text: "Input received" };
    switch (msg.type) {
      case "join": {
        // Idempotent repeat join: the socket is already in a room, resend its
        // snapshot instead of adding a second player.
        const existing = this.registry.findForSocket(client.id);
        if (existing !== undefined) {
          const you = existing.clientIds[client.id];
          if (you !== undefined) {
            client.emit("message", JSON.stringify(existing.snapshotFor(you)));
          }
          return;
        }
        const room = msg.roomId ? this.registry.get(msg.roomId) : this.registry.first();
        if (room === undefined) {
          client.emit(
            "message",
            JSON.stringify({
              type: "announcement",
              text: "Room not found",
            } satisfies ServerMessage),
          );
          return;
        }
        const id = room.addPlayer(client, room.resolveMeta(msg.meta));
        if (id === null) {
          client.emit(
            "message",
            JSON.stringify({
              type: "announcement",
              text: "Room is full",
            } satisfies ServerMessage),
          );
          return;
        }
        client.emit("message", JSON.stringify(room.snapshotFor(id)));
        return;
      }
      case "input":
        break;
    }
    // Broadcast message to all clients except the sender
    client.broadcast.emit("message", JSON.stringify(response));
  }
}
