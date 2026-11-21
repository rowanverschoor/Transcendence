import {
  CellId,
  CellState,
  Food,
  FoodId,
  PlayerId,
  PlayerMeta,
  RoomId,
} from "@transcendence/shared";
import { RandomCoord, RandomFromTo, RandomUpTo } from "./utils.js";
import { clampCoord, moveCell } from "@transcendence/shared/game";
import type { GameConfig } from "./game.config.js";
import type {
  Coord,
  GameSnapshot,
  GameUpdate,
  PlayerInput,
} from "@transcendence/shared";
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

const tickRate_Hz: number = 20; // NOTE: Add to config?
const tickPeriod_ms: number = 1000 / tickRate_Hz;

export class GameRoom {
  readonly socket: Server;
  readonly clients: Record<PlayerId, Socket> = {};
  readonly clientIds: Record<Socket["id"], PlayerId> = {};
  readonly capacity: number;

  readonly players: Record<PlayerId, PlayerMeta> = {};
  readonly cells: Record<CellId, CellState> = {};
  readonly food: Record<FoodId, Food> = {};

  private tick: number = 0;

  readonly updates: {
    players: Record<PlayerId, PlayerMeta | null>;
    cells: Record<CellId, CellState>;
    food: Record<FoodId, Food>;
  } = { players: {}, cells: {}, food: {} };
  readonly PlayerSeqs: Record<PlayerId, number> = {};
  /** Latest accepted mouse target per player, already clamped to the arena. */
  readonly mouseTargets: Record<PlayerId, Coord> = {};

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
      seq: this.PlayerSeqs[id],
      players: this.updates.players,
      cells: this.updates.cells, // TODO: Filter on proximity to player.
      food: this.updates.food, // Maybe here too
    };
  };

  private nextCell = 0;
  newCellId = (): string => (this.nextCell++).toString();

  doTick() {
    const dt = tickPeriod_ms / 1000;
    for (const [id, cell] of Object.entries(this.cells)) {
      const target = this.mouseTargets[cell.owner];
      if (target === undefined) continue; // never sent input: cell stays put
      const pos = clampCoord(
        moveCell(cell.pos, cell.radius, target, this.config.maxVelocity, dt),
        this.config,
        cell.radius,
      );
      this.cells[id] = { ...cell, pos };
      this.updates.cells[id] = this.cells[id];
    }
    for (const [_, socket] of Object.entries(this.clients))
      socket.emit(
        "message",
        JSON.stringify(this.makeUpdate(this.clientIds[socket.id])),
      );
    this.updates.players = {};
    this.updates.cells = {};
    this.updates.food = {};
    this.tick += 1;
    // TODO: Handle collisions, cell growth
    // NOTE: Remember to not process collisions and absorbtion based on insertion order.
    // Use penetration depth instead.
    // Don't be weird.
  }

  readonly processInput = (socket: Socket, input: PlayerInput) => {
    const playerId = this.clientIds[socket.id];
    if (playerId === undefined) return; // gateway routes only room members
    // Drop reordered and duplicate input so a stale mouse target can't
    // regress a newer one.
    if (input.seq <= this.PlayerSeqs[playerId]) return;
    this.mouseTargets[playerId] = clampCoord(input.mouse, this.config);
    this.PlayerSeqs[playerId] = input.seq;
    // TODO: Handle splitting and ejection
  };

  // TODO: Implement auth
  // PlayerIds are visible to all players. Make sure players can't impersonate eachother
  // NOTE: Might not actually be possible already, each player is associated with a websocket
  // Need to check socket.io docs to see if clients can connect to other client's websocket
  readonly addPlayer = (client: Socket, meta: PlayerMeta): PlayerId | null => {
    if (Object.keys(this.players).length >= this.capacity) return null;
    let id: PlayerId = nanoid(5);
    while (id in this.players) id = nanoid(5);
    this.players[id] = meta;
    this.updates.players[id] = meta;
    this.PlayerSeqs[id] = 0;
    this.clients[id] = client;
    this.clientIds[client.id] = id;

    const cellId = this.newCellId();
    const cell: CellState = {
      owner: id,
      pos: RandomCoord(this.config.width, this.config.height, 0.15),
      radius: this.config.playerRadius,
    };
    this.cells[cellId] = cell;
    // Spawn delta: the new cell rides the next tick's update.
    this.updates.cells[cellId] = { ...cell };
    client.join(this.id);
    client.emit("message", JSON.stringify(this.snapshotFor(id)));
    return id;
  };

  readonly removeClient = (socketId: Socket["id"]): void => {
    const pid = this.clientIds[socketId];
    if (pid === undefined) return;
    this.clients[pid].leave(this.id);
    delete this.clientIds[socketId];
    delete this.clients[pid];
    delete this.players[pid];
    delete this.PlayerSeqs[pid];
    delete this.mouseTargets[pid];
    for (const [cid, _] of Object.entries(this.cells))
      if (this.cells[cid].owner === pid) delete this.cells[cid];
    // Null entry in update message tells frontend the player has been removed
    this.updates.players[pid] = null;
    for (const [cid, cell] of Object.entries(this.updates.cells))
      if (cell.owner === pid) delete this.updates.cells[cid];
  };

  readonly snapshotFor = (you: PlayerId): GameSnapshot => ({
    type: "snapshot",
    roomId: this.id,
    you,
    seq: (you in this.PlayerSeqs ? this.PlayerSeqs[you] : 0) + 1,
    arena: { width: this.config.width, height: this.config.height },
    tick: 0,
    players: this.players,
    cells: this.cells, // TODO: Filter for proximity to player
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

  @Interval(tickPeriod_ms)
  tickAll(): void {
    for (const room of this.rooms.values()) room.doTick();
  }
}
