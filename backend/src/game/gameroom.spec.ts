import { describe, expect, it } from "vitest";
import type { Socket, Server } from "socket.io";
import type { PlayerMeta } from "@transcendence/shared";
import { GameRoom } from "./gameroom.js";
import type { GameConfig } from "./game.config.js";

const config: GameConfig = {
  width: 800,
  height: 800,
  capacity: 3,
  foodRadius: 10,
  nFoodChunks: 2,
};

const makeRoom = (capacity = 3): GameRoom =>
  new GameRoom(
    { ...config, capacity },
    "0123456789",
    {} as unknown as Server,
    capacity,
  );

const socketOf = (id: string) =>
  ({ id, emit: () => undefined }) as unknown as Socket;

const meta = (over: Partial<PlayerMeta> = {}): PlayerMeta => ({
  name: over.name,
  // ADR 0006: color is required on join, so specs always carry one.
  color: over.color ?? "#000000",
});

describe("GameRoom.addPlayer", () => {
  it("registers the player under a 5-character id and populates both maps", () => {
    const room = makeRoom();
    const socket = socketOf("socket-1");
    const id = room.addPlayer(
      socket,
      meta({ name: "Alice", color: "#123456" }),
    );
    expect(id).toBeTypeOf("string");
    expect(id).toHaveLength(5);
    const pid = id as string;
    expect(room.players[pid]).toEqual({ name: "Alice", color: "#123456" });
    expect(room.clients[pid]).toBe(socket);
    expect(room.clientIds["socket-1"]).toBe(pid);
  });

  it("refuses a new player at capacity", () => {
    const room = makeRoom(2);
    expect(room.addPlayer(socketOf("a"), meta())).toBeTypeOf("string");
    expect(room.addPlayer(socketOf("b"), meta())).toBeTypeOf("string");
    expect(room.addPlayer(socketOf("c"), meta())).toBeNull();
  });
});

describe("GameRoom.removeClient", () => {
  it("clears the player from all three maps", () => {
    const room = makeRoom();
    const id = room.addPlayer(socketOf("socket-1"), meta({ name: "Alice" }));
    const pid = id as string;
    room.removeClient("socket-1");
    expect(room.clientIds["socket-1"]).toBeUndefined();
    expect(room.clients[pid]).toBeUndefined();
    expect(room.players[pid]).toBeUndefined();
  });

  it("ignores an unknown socket id", () => {
    const room = makeRoom();
    room.addPlayer(socketOf("socket-1"), meta());
    expect(() => room.removeClient("stranger")).not.toThrow();
    expect(Object.keys(room.players)).toHaveLength(1);
  });
});

describe("GameRoom.snapshotFor", () => {
  it("carries you, arena, tick 0, and the live records", () => {
    const room = makeRoom();
    const id = room.addPlayer(
      socketOf("s"),
      meta({ name: "Blob-a", color: "#000000" }),
    );
    const snap = room.snapshotFor(id as string);
    expect(snap.type).toBe("snapshot");
    expect(snap.roomId).toBe("0123456789");
    expect(snap.you).toBe(id);
    expect(snap.arena).toEqual({ width: 800, height: 800 });
    expect(snap.tick).toBe(0);
    expect(snap.players[id as string]).toEqual({
      name: "Blob-a",
      color: "#000000",
    });
    expect(Object.keys(snap.food)).toHaveLength(2);
    expect(snap.cells).toEqual({});
  });
});
