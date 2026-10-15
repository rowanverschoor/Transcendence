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
import { GameRoom, RoomRegistry } from "./gameroom.js";
import { GAME_CONFIG, type GameConfig } from "./game.config.js";
import { nanoid } from "nanoid";

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
    const id: RoomId = nanoid(10);
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
    switch (msg.type) {
      case "join": {
        // Idempotent repeat join: the socket is already in a room, resend its
        // snapshot instead of adding a second player.
        let existing: RoomId | undefined = undefined;
        client.rooms.forEach((value: string): void => {
          if (value === client.id || !RoomId.safeParse(value).success) return;
          if (existing !== undefined)
            throw `Socket ${client.id} assigned to multiple GameRooms`;
          existing = value;
        });
        if (existing !== undefined) {
          const room: GameRoom | undefined = this.registry.get(existing);
          if (room === undefined)
            throw "Socket RoomId not in GameRoom Registry";
          const you = room.clientIds[client.id];
          if (you !== undefined) {
            client.emit("message", JSON.stringify(room.snapshotFor(you)));
            return;
          }
          throw `GameRoom ${room.id} can't find PlayerId for socket ${client.id}`;
        }
        const room = msg.roomId
          ? this.registry.get(msg.roomId)
          : this.registry.first();
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
        const id = room.addPlayer(client, msg.meta);
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
        client.emit("message", JSON.stringify(room.snapshotFor(id))); // Should room.addplayer handle this instead?
        client.join(room.id);
        return;
      }
      case "input":
        console.warn("Player input not yet handled");
        client.emit(
          "message",
          JSON.stringify({
            type: "announcement",
            text: "Input received",
          } satisfies ServerMessage),
        );
        return;
      default:
        throw "Unhandled ClientMessage type received";
    }
  }
} // Class GameGateway
