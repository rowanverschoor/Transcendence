import {
  CellId,
  CellState,
  Food,
  FoodId,
  PlayerId,
  PlayerMeta,
  RoomId,
} from "@transcendence/shared";
import { distance, RandomCoord, RandomFromTo, RandomUpTo } from "./utils.js";
import type { GameConfig } from "./game.config.js";
import type {
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
    for (const [id, update] of Object.entries(this.updates.cells))
      this.cells[id].pos = update.pos;
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
    const playerId: PlayerId = this.clientIds[socket.id];
    const inputValid = (): boolean => {
      for (const newState of input.cells) {
        const currentState = this.cells[newState.id];
        if (currentState === undefined || currentState.owner !== playerId)
          return false;
        // NOTE: Using the tick period for this calculation might be too naive. Will cause rubber banding on dropped packets.
        // TODO: Scale maxVelocity based on cell radius
        if (
          distance(currentState.pos, newState.pos) >
          (tickPeriod_ms / 1000) * this.config.maxVelocity
        )
          return false;
      }
      return true;
    };
    if (!inputValid()) {
      // TODO: Decide if and when we kick players emiting invalid input
      // Also ban and doxx them, sell data on darkweb, blame hackers
      console.log(`Player ${this.clientIds[socket.id]} sent invalid input`);
      return;
    }
    for (const cell of input.cells) {
      // Copy with the new pos: this.cells keeps the last-tick pos so the
      // next input this tick is still validated against it; the buffer
      // is committed to this.cells in doTick().
      this.updates.cells[cell.id] = { ...this.cells[cell.id], pos: cell.pos };
      // NOTE: Calculating collisions will happen at the next tick.
    }
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
    // Copy, not alias: updates.cells must buffer the intended next-tick state
    // while this.cells stays at the last-tick state that inputs validate
    // against.
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
