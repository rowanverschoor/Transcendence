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
import type { GameSnapshot, GameUpdate } from "@transcendence/shared";
import type { Socket, Server } from "socket.io";
import { Injectable, Inject } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
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
  readonly players: Record<PlayerId, { meta: PlayerMeta; seq: number }> = {};
  readonly cells: Record<CellId, CellState> = {};
  readonly food: Record<FoodId, Food> = {};
  readonly capacity: number;
  readonly tick: number = 0;
  readonly updates: {
    players: Record<PlayerId, PlayerMeta>;
    cells: Record<CellId, CellState>;
    food: Record<FoodId, Food>;
  } = { players: {}, cells: {}, food: {} };

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

  makeUpdate = (id: PlayerId): GameUpdate => {
    return {
      type: "update",
      tick: this.tick,
      seq: this.players[id].seq,
      players: this.updates.players,
      cells: this.updates.cells, // TODO: Filter on proximity to player.
      food: this.updates.food, // Maybe here too
    };
  };

  @Interval(1000 / 20)
  handleInterval() {
    for (const [_, socket] of Object.entries(this.clients))
      socket
        .to(this.id)
        .emit(
          "message",
          JSON.stringify(this.makeUpdate(this.clientIds[socket.id])),
        );
  }

  // TODO: Implement auth
  // PlayerIds are visible to all players. Make sure players can't impersonate eachother
  readonly addPlayer = (client: Socket, meta: PlayerMeta): PlayerId | null => {
    if (Object.keys(this.players).length >= this.capacity) return null;
    let id: PlayerId = nanoid(5);
    while (id in this.players) id = nanoid(5);
    this.players[id] = { meta: meta, seq: 0 };
    this.clients[id] = client;
    this.clientIds[client.id] = id;
    client.join(this.id);
    client.emit("message", JSON.stringify(this.snapshotFor(id)));
    return id;
  };

  readonly removeClient = (socketId: Socket["id"]): void => {
    const id = this.clientIds[socketId];
    if (id === undefined) return;
    delete this.clientIds[socketId];
    this.clients[id].leave(this.id);
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
