import { describe, expect, it } from "vitest";
import type { Socket, Server } from "socket.io";
import type { Coord, PlayerMeta } from "@transcendence/shared";
import { clampCoord, moveCell } from "@transcendence/shared/game";
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

const TICK_S = 0.05; // tickPeriod_ms / 1000 for the 20 Hz tick rate

/** Where the server must put a cell after one tick chasing `target`. */
const expectedPos = (from: Coord, target: Coord, radius: number): Coord =>
  clampCoord(
    moveCell(from, radius, target, config.maxVelocity, TICK_S),
    config,
    radius,
  );

describe("GameRoom.processInput", () => {
  it("accepts an out-of-arena mouse target clamped into the arena", () => {
    const room = makeRoom();
    const id = room.addPlayer(socketOf("socket-1"), meta({ name: "Blob-a" })) as string;
    const anchor = room.snapshotFor(id).cells["0"].pos;
    const mouse = { x: 9999, y: -50 };

    room.processInput(socketOf("socket-1"), { type: "input", seq: 1, mouse });

    expect(room.PlayerSeqs[id]).toBe(1);
    expect(room.mouseTargets[id]).toEqual({ x: config.width, y: 0 });

    room.doTick();
    expect(room.cells["0"].pos).toEqual(
      expectedPos(anchor, { x: config.width, y: 0 }, config.playerRadius),
    );
  });

  it("drops duplicate and reordered input so the newest target wins", () => {
    const room = makeRoom();
    const id = room.addPlayer(socketOf("socket-1"), meta({ name: "Blob-a" })) as string;
    const socket = socketOf("socket-1");

    room.processInput(socket, { type: "input", seq: 5, mouse: { x: 100, y: 100 } });
    // Same seq, different target: duplicate, dropped.
    room.processInput(socket, { type: "input", seq: 5, mouse: { x: 200, y: 200 } });
    // Older seq arriving late: dropped.
    room.processInput(socket, { type: "input", seq: 3, mouse: { x: 300, y: 300 } });

    expect(room.PlayerSeqs[id]).toBe(5);
    expect(room.mouseTargets[id]).toEqual({ x: 100, y: 100 });

    const anchor = room.snapshotFor(id).cells["0"].pos;
    room.doTick();
    expect(room.cells["0"].pos).toEqual(
      expectedPos(anchor, { x: 100, y: 100 }, config.playerRadius),
    );
  });

  it("accepts the first input numbered from the snapshot's seq", () => {
    const room = makeRoom();
    const id = room.addPlayer(socketOf("socket-1"), meta({ name: "Blob-a" })) as string;
    const first = room.snapshotFor(id).seq;

    room.processInput(socketOf("socket-1"), { type: "input", seq: first, mouse: { x: 0, y: 0 } });

    expect(room.PlayerSeqs[id]).toBe(first);
    expect(room.mouseTargets[id]).toEqual({ x: 0, y: 0 });
  });

  it("leaves a cell that never got input exactly where it spawned", () => {
    const room = makeRoom();
    const id = room.addPlayer(socketOf("socket-1"), meta({ name: "Blob-a" })) as string;
    const anchor = room.snapshotFor(id).cells["0"].pos;
    room.doTick(); // flush the spawn delta

    room.doTick();

    expect(room.cells["0"].pos).toEqual(anchor);
    expect(room.updates.cells).toEqual({});
  });

  it("clears the mouse target when the player leaves", () => {
    const room = makeRoom();
    const id = room.addPlayer(socketOf("socket-1"), meta({ name: "Blob-a" })) as string;
    room.processInput(socketOf("socket-1"), { type: "input", seq: 1, mouse: { x: 100, y: 100 } });
    expect(room.mouseTargets[id]).toBeDefined();

    room.removeClient("socket-1");

    expect(room.mouseTargets).toEqual({});
  });
});
