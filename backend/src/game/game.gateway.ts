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
import { GameRoom, Rooms } from "./gameroom.js";
import { GAME_CONFIG, type GameConfig } from "./game.config.js";

// Attaches to the HTTP server. CORS reflects any origin so `ng serve`
// (different port) can complete the socket.io handshake in development.
@WebSocketGateway({ cors: { origin: true } })
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly messagePipe: ZodValidationPipe<ClientMessageSchema>;
  readonly config: GameConfig;

  // tsx/esbuild does not emit decorator metadata, so the injection token is
  // stated explicitly instead of relying on the parameter type.
  constructor(@Inject(GAME_CONFIG) config: GameConfig) {
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
    Rooms[id] = new GameRoom(this.config, id, server);
  }

  handleConnection(client: Socket): void {
    console.log(`CONNECT: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    for (const id in Rooms) Rooms[id].removeClient(client.id);
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
    let response: ServerMessage = { type: "announcement", text: "Input received" };
    switch (msg.type) {
      case "join": {
        // Idempotent repeat join: the socket is already in a room, resend its
        // snapshot instead of adding a second player.
        const existing = Object.values(Rooms).find(
          (room) => room.clientIds[client.id] !== undefined,
        );
        if (existing !== undefined) {
          const you = existing.clientIds[client.id];
          if (you !== undefined) {
            client.emit("message", JSON.stringify(existing.snapshotFor(you)));
          }
          return;
        }
        const room = msg.roomId ? Rooms[msg.roomId] : Object.values(Rooms)[0];
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
