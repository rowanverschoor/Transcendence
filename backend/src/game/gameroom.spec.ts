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

const socketOf = (id: string) => ({ id, emit: () => undefined }) as unknown as Socket;

const meta = (over: Partial<PlayerMeta> = {}): PlayerMeta => ({
  name: over.name,
  color: over.color,
});

describe("GameRoom.addPlayer", () => {
  it("registers the player under a 5-character id and populates both maps", () => {
    const room = makeRoom();
    const socket = socketOf("socket-1");
    const id = room.addPlayer(socket, meta({ name: "Alice", color: "#123456" }));
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

describe("GameRoom.resolveMeta", () => {
  it("honors a complete client proposal even if it duplicates an in-room color", () => {
    const room = makeRoom();
    room.addPlayer(socketOf("a"), meta({ name: "A", color: "#e6194b" }));
    expect(room.resolveMeta({ name: "A", color: "#e6194b" })).toEqual({
      name: "A",
      color: "#e6194b",
    });
  });

  it("fills a missing name with a Blob-* name and a missing color with an unused palette color", () => {
    const room = makeRoom();
    room.addPlayer(socketOf("a"), meta({ name: "A", color: "#e6194b" }));
    const resolved = room.resolveMeta(meta());
    const resolvedColor = resolved.color ?? "";
    expect(resolved.name).toMatch(/^Blob-/);
    expect(/^#[0-9a-fA-F]{6}$/.test(resolvedColor)).toBe(true);
    expect(resolvedColor).not.toBe("#e6194b");
    expect(resolvedColor).toBeTypeOf("string");
  });

  it("falls back to a random hex color only when the palette is exhausted", () => {
    // Palette holds 10 colors; occupy all 10 slots with distinct palette dups.
    const room = makeRoom(10);
    const paletteBefore = ["#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#008080"];
    paletteBefore.forEach((color, i) =>
      room.addPlayer(socketOf(`socket-${i}`), meta({ color })),
    );
    const colors = Object.values(room.players).map((m) => m.color);
    expect(paletteBefore.every((c) => colors.includes(c))).toBe(true);
    const resolved = room.resolveMeta(meta());
    expect(/^#[0-9a-fA-F]{6}$/.test(resolved.color ?? "")).toBe(true);
    expect(colors.includes(resolved.color ?? "")).toBe(false);
  });
});

describe("GameRoom.snapshotFor", () => {
  it("carries you, arena, tick 0, and the live records", () => {
    const room = makeRoom();
    const id = room.addPlayer(socketOf("s"), meta({ name: "Blob-a", color: "#000000" }));
    const snap = room.snapshotFor(id as string);
    expect(snap.type).toBe("snapshot");
    expect(snap.roomId).toBe("0123456789");
    expect(snap.you).toBe(id);
    expect(snap.arena).toEqual({ width: 800, height: 800 });
    expect(snap.tick).toBe(0);
    expect(snap.players[id as string]).toEqual({ name: "Blob-a", color: "#000000" });
    expect(Object.keys(snap.food)).toHaveLength(2);
    expect(snap.cells).toEqual({});
  });
});
