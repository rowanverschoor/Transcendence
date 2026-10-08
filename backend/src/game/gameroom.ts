import {
  ArenaConfig,
  CellId,
  CellState,
  Food,
  FoodId,
  GameSnapshot,
  PlayerId,
  PlayerMeta,
  RoomId,
} from "@transcendence/shared";
import { RandomFromTo, RandomUpTo } from "./utils.js";
import { Socket } from "socket.io";

export const foodRadius: number = 5;
export const nFoodChunks: number = 50;

const makeFood = (cfg: ArenaConfig): Food => {
  return {
    pos: {
      x: RandomFromTo(foodRadius, cfg.width - foodRadius),
      y: RandomFromTo(foodRadius, cfg.height - foodRadius),
    },
    radius: foodRadius,
  };
};

export class GameRoom {
  readonly id: RoomId = "";
  readonly clients: Record<PlayerId, Socket> = {};
  readonly arena: ArenaConfig = { width: 800, height: 800 };
  readonly players: Record<PlayerId, PlayerMeta> = {};
  readonly cells: Record<CellId, CellState> = {};
  readonly food: Record<FoodId, Food> = {};
  readonly capacity: number = 10;

  constructor(id: RoomId, arena?: ArenaConfig, capacity?: number) {
    this.id = id;
    this.arena = arena ?? this.arena;
    this.capacity = capacity ?? this.capacity;
    for (let i = 0; i < nFoodChunks; i += 1) {
      this.food[i] = makeFood(this.arena);
    }
  }

  readonly addPlayer = (
    id: PlayerId,
    socket: Socket,
    meta: PlayerMeta,
  ): boolean => {
    if (Object.keys(this.players).length >= this.capacity) return false;
    if (id in this.players) return true;
    this.players[id] = meta;
    return true;
  };
}

export const Rooms: Record<RoomId, GameRoom> = {};
