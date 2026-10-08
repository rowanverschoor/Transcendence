import {
  CellId,
  CellState,
  Food,
  FoodId,
  PlayerId,
  PlayerMeta,
  RoomId,
} from "@transcendence/shared";
import { RandomFromTo } from "./utils.js";
import type { GameConfig } from "./game.config.js";
import type { GameSnapshot } from "@transcendence/shared";
import type { Socket, Server } from "socket.io";
import { Injectable, Inject } from "@nestjs/common";
import { GAME_CONFIG } from "./game.config.js";
import { nanoid } from "nanoid";

const makeFood = (cfg: GameConfig): Food => {
  return {
    pos: {
      x: RandomFromTo(cfg.foodRadius, cfg.width - cfg.foodRadius),
      y: RandomFromTo(cfg.foodRadius, cfg.height - cfg.foodRadius),
    },
    radius: cfg.foodRadius,
  };
};

export class GameRoom {
  readonly socket: Server;
  readonly clients: Record<PlayerId, Socket> = {};
  readonly clientIds: Record<Socket["id"], PlayerId> = {};
  readonly players: Record<PlayerId, PlayerMeta> = {};
  readonly cells: Record<CellId, CellState> = {};
  readonly food: Record<FoodId, Food> = {};
  readonly capacity: number;

  constructor(
    readonly config: GameConfig,
    readonly id: RoomId,
    server: Server,
    capacity?: number,
  ) {
    this.socket = server;
    this.capacity = capacity ?? this.config.capacity;
    for (let i = 0; i < this.config.nFoodChunks; i += 1) {
      this.food[i] = makeFood(this.config);
    }
  }

  // TODO: Implement auth
  // PlayerIds are visible to all players. Make sure players can't impersonate eachother
  readonly addPlayer = (client: Socket, meta: PlayerMeta): PlayerId | null => {
    if (Object.keys(this.players).length >= this.capacity) return null;
    let id: PlayerId = nanoid(5);
    while (id in this.players) id = nanoid(5);
    this.players[id] = meta;
    this.clients[id] = client;
    this.clientIds[client.id] = id;
    return id;
  };

  private static readonly PALETTE = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
    "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#008080",
  ] as const;

  readonly resolveMeta = (proposed?: PlayerMeta): PlayerMeta => {
    const colors = Object.values(this.players).map((m) => m.color);
    const hex = () =>
      "#" +
      [0, 0, 0]
        .map(() => RandomFromTo(0, 255).toString(16).padStart(2, "0"))
        .join("");
    const color =
      proposed?.color ?? GameRoom.PALETTE.find((c) => !colors.includes(c)) ?? hex();
    const name = proposed?.name ?? `Blob-${nanoid(6)}`;
    return { name, color };
  };

  readonly removeClient = (socketId: Socket["id"]): void => {
    const id = this.clientIds[socketId];
    if (id === undefined) return;
    delete this.clientIds[socketId];
    delete this.clients[id];
    delete this.players[id];
  };

  readonly snapshotFor = (you: PlayerId): GameSnapshot => ({
    type: "snapshot",
    roomId: this.id,
    you,
    arena: { width: this.config.width, height: this.config.height },
    tick: 0,
    players: this.players,
    cells: this.cells,
    food: this.food,
  });
}

/**
 * Nest-owned registry over live rooms. Replaces what used to be the module
 * global `Rooms` record: rooms are runtime-created per game, so they cannot be
 * providers themselves — the registry is, and it owns the lifecycle.
 */
@Injectable()
export class RoomRegistry {
  private readonly rooms = new Map<RoomId, GameRoom>();

  constructor(
    // String token, not by-type: `design:paramtypes` reflects interface
    // parameters as `Object`, so GameConfig can never resolve by type.
    @Inject(GAME_CONFIG) private readonly config: GameConfig,
  ) {}

  create(id: RoomId, server: Server, capacity?: number): GameRoom {
    const room = new GameRoom(this.config, id, server, capacity);
    this.rooms.set(id, room);
    return room;
  }

  get(id: RoomId): GameRoom | undefined {
    return this.rooms.get(id);
  }

  /** First registered room, used as the fallback join target. */
  first(): GameRoom | undefined {
    return this.rooms.values().next().value;
  }

  /** Room a given socket has already joined, if any. */
  findForSocket(socketId: Socket["id"]): GameRoom | undefined {
    for (const room of this.rooms.values())
      if (room.clientIds[socketId] !== undefined) return room;
    return undefined;
  }

  removeClient(socketId: Socket["id"]): void {
    for (const room of this.rooms.values()) room.removeClient(socketId);
  }
}
