import { describe, expect, it } from "vitest";
import type { Socket, Server } from "socket.io";
import type { Coord, PlayerInput, PlayerMeta } from "@transcendence/shared";
import { GameRoom } from "./gameroom.js";
import type { GameConfig } from "./game.config.js";

const config: GameConfig = {
  width: 800,
  height: 800,
  capacity: 3,
  foodRadius: 10,
  playerRadius: 10,
  nFoodChunks: 2,
  maxVelocity: 10,
};

const makeRoom = (capacity = 3): GameRoom =>
  new GameRoom(
    { ...config, capacity },
    "0123456789",
    {} as unknown as Server,
    capacity,
  );

const socketOf = (id: string) =>
  ({ id, emit: () => undefined, join: () => undefined, leave: () => undefined }) as unknown as Socket;

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

  it("purges pending updates so doTick survives a disconnect before the next tick", () => {
    const room = makeRoom();
    room.addPlayer(socketOf("s1"), meta({ name: "Blob-a" }));
    room.addPlayer(socketOf("s2"), meta({ name: "Blob-b" }));
    room.removeClient("s2"); // spawn only: cell sits in this.updates.cells
    // Without the buffer purge, doTick's commit loop reads
    // this.cells[cid] for the removed player's cell and throws.
    expect(() => room.doTick()).not.toThrow();
    room.removeClient("s1");
    expect(() => room.doTick()).not.toThrow();
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
    // addPlayer now spawns the player's own start cell.
    expect(Object.keys(snap.cells)).toHaveLength(1);
    expect(Object.values(snap.cells)[0]?.owner).toBe(id);
  });
});

describe("GameRoom.processInput", () => {
  it("validates against the last committed tick pos, not the last accepted input", () => {
    // addPlayer spawns cell "0"; doTick is driven manually so no scheduler
    // runs in specs.
    const room = makeRoom();
    const id = room.addPlayer(socketOf("socket-1"), meta({ name: "Blob-a" }));
    const anchor = room.snapshotFor(id as string).cells["0"].pos;
    const input = (seq: number, pos: Coord): PlayerInput => ({
      type: "input",
      seq,
      cells: [{ id: "0", pos }],
    });

    // Budget is (tickPeriod_ms / 1000) * maxVelocity = 0.5 units per input.
    room.processInput(socketOf("socket-1"), input(1, { x: anchor.x + 0.4, y: anchor.y }));
    room.processInput(socketOf("socket-1"), input(2, { x: anchor.x + 0.8, y: anchor.y }));
    // The second move is accepted from the last *accepted* pos (0.8 -> 0.4)
    // but rejected from the tick anchor (0.8 > 0.5): seq stays at 1 and only
    // the first move is buffered.
    expect(room.PlayerSeqs[id as string]).toBe(1);
    expect(room.makeUpdate(id as string).cells["0"]?.pos).toEqual({
      x: anchor.x + 0.4,
      y: anchor.y,
    });

    room.doTick();
    // Commit makes the first move canonical; round Trips the buffer.
    expect(room.snapshotFor(id as string).cells["0"].pos).toEqual({
      x: anchor.x + 0.4,
      y: anchor.y,
    });
  });
});
