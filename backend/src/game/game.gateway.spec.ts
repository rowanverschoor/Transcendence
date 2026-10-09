import { describe, expect, it } from "vitest";
import type { Server, Socket } from "socket.io";
import type { GameSnapshot } from "@transcendence/shared";
import { ServerMessage } from "@transcendence/shared";
import { GameGateway } from "./game.gateway.js";
import { RoomRegistry } from "./gameroom.js";
import type { GameConfig } from "./game.config.js";

const config: GameConfig = {
  width: 800,
  height: 800,
  capacity: 3,
  foodRadius: 10,
  nFoodChunks: 2,
};

/**
 * Minimal socket.io stub: records messages delivered to this client both
 * directly (`emit`) and via `client.broadcast.emit` (to everyone except the
 * sender). Cast to Socket is the documented escape for an unexpressible
 * library type — the stub only ever satisfies the gateway's usage.
 */
const makeSocket = (id: string) => {
  const direct: ServerMessage[] = [];
  const broadcasted: ServerMessage[] = [];
  const record =
    (target: ServerMessage[]) =>
    (event: string, payload: string): void => {
      if (event !== "message") return;
      const parsed: unknown = JSON.parse(payload);
      const message = ServerMessage.safeParse(parsed);
      expect(message.success).toBe(true);
      if (message.success) target.push(message.data);
    };
  const socket = {
    id,
    emit: record(direct),
    broadcast: { emit: record(broadcasted) },
  } as unknown as Socket;
  return { socket, direct, broadcasted };
};

const makeGateway = (
  capacity = 3,
): {
  gateway: GameGateway;
  registry: RoomRegistry;
} => {
  const registry = new RoomRegistry({ ...config, capacity });
  const gateway = new GameGateway({ ...config, capacity }, registry);
  gateway.afterInit({} as unknown as Server);
  return { gateway, registry };
};

const snapshots = (messages: ServerMessage[]): GameSnapshot[] =>
  messages.filter((m) => m.type === "snapshot");

const joinPayload = (over: Record<string, unknown> = {}): string =>
  // ADR 0006: meta with a color is mandatory on every join.
  JSON.stringify({ type: "join", meta: { color: "#e6194b" }, ...over });

describe("GameGateway.afterInit", () => {
  it("creates a seed room so first joins have a fallback target", () => {
    const { registry } = makeGateway();
    expect(registry.first()).toBeDefined();
  });
});

describe("GameGateway.handleMessage", () => {
  it("join without roomId registers the player and emits a snapshot addressed to them", () => {
    const { gateway, registry } = makeGateway();
    const socket = makeSocket("s1");
    const meta = { name: "Alice", color: "#123456" };
    gateway.handleMessage(socket.socket, joinPayload({ meta }));
    const [snap] = snapshots(socket.direct);
    expect(snap).toBeDefined();
    expect(snap.arena).toEqual({ width: 800, height: 800 });
    expect(snap.players[snap.you]).toEqual(meta);
    expect(registry.get(snap.roomId)?.players[snap.you]).toEqual(meta);
  });

  it("join with an unknown roomId rejects with an announcement", () => {
    const { gateway } = makeGateway();
    const socket = makeSocket("s1");
    gateway.handleMessage(
      socket.socket,
      // Well-formed 10-char RoomId the registry does not contain.
      joinPayload({ roomId: "9999999999" }),
    );
    expect(socket.direct).toEqual([
      { type: "announcement", text: "Room not found" },
    ]);
    expect(snapshots(socket.direct)).toHaveLength(0);
  });

  it("repeat join is idempotent: resends the snapshot, no second player", () => {
    const { gateway, registry } = makeGateway();
    const socket = makeSocket("s1");
    gateway.handleMessage(socket.socket, joinPayload());
    const first = snapshots(socket.direct)[0];
    expect(Object.keys(first.players)).toHaveLength(1);
    socket.direct.length = 0;
    gateway.handleMessage(socket.socket, joinPayload());
    expect(snapshots(socket.direct)).toHaveLength(1);
    const room = registry.findForSocket("s1");
    expect(Object.keys(room?.players ?? {})).toHaveLength(1);
  });

  it("join into an exhausted room rejects with an announcement", () => {
    const { gateway } = makeGateway(1);
    const s1 = makeSocket("s1");
    const s2 = makeSocket("s2");
    gateway.handleMessage(s1.socket, joinPayload());
    gateway.handleMessage(s2.socket, joinPayload());
    expect(s2.direct).toEqual([{ type: "announcement", text: "Room is full" }]);
    expect(snapshots(s2.direct)).toHaveLength(0);
  });

  it("a second player joins the same fallback room and gets their own id", () => {
    const { gateway, registry } = makeGateway();
    const s1 = makeSocket("s1");
    const s2 = makeSocket("s2");
    gateway.handleMessage(s1.socket, joinPayload());
    gateway.handleMessage(s2.socket, joinPayload());
    const room = registry.first();
    expect(Object.keys(room?.players ?? {})).toHaveLength(2);
    expect(snapshots(s2.direct)[0].you).not.toBe(snapshots(s1.direct)[0].you);
  });

  it("an invalid payload is rejected before the handler runs", () => {
    const { gateway } = makeGateway();
    const socket = makeSocket("s1");
    expect(() =>
      gateway.handleMessage(
        socket.socket,
        joinPayload({ meta: { color: "red" } }),
      ),
    ).toThrow();
    expect(() => gateway.handleMessage(socket.socket, "not json")).toThrow();
    expect(snapshots(socket.direct)).toHaveLength(0);
  });

  it("a join without meta is rejected (ADR 0006: color is mandatory)", () => {
    const { gateway, registry } = makeGateway();
    const socket = makeSocket("s1");
    expect(() =>
      gateway.handleMessage(socket.socket, JSON.stringify({ type: "join" })),
    ).toThrow();
    expect(snapshots(socket.direct)).toHaveLength(0);
    expect(Object.keys(registry.first()?.players ?? {})).toHaveLength(0);
  });

  it("input broadcasts an announcement to everyone except the sender", () => {
    const { gateway } = makeGateway();
    const sender = makeSocket("s1");
    const other = makeSocket("s2");
    gateway.handleMessage(sender.socket, joinPayload());
    gateway.handleMessage(
      sender.socket,
      JSON.stringify({
        type: "input",
        seq: 1,
        mousepos: { x: 1, y: 2 },
      }),
    );
    expect(sender.broadcasted).toEqual([
      { type: "announcement", text: "Input received" },
    ]);
    expect(other.direct).toHaveLength(0);
  });
});

describe("GameGateway.handleDisconnect", () => {
  it("removes a joined client from its room so the slot frees up", () => {
    const { gateway, registry } = makeGateway(1);
    const s1 = makeSocket("s1");
    const s2 = makeSocket("s2");
    gateway.handleMessage(s1.socket, joinPayload());
    expect(registry.findForSocket("s1")).toBeDefined();
    gateway.handleDisconnect(s1.socket);
    expect(registry.findForSocket("s1")).toBeUndefined();
    gateway.handleMessage(s2.socket, joinPayload());
    expect(snapshots(s2.direct)).toHaveLength(1);
  });

  it("a socket that never joined disconnects harmlessly", () => {
    const { gateway, registry } = makeGateway();
    expect(() =>
      gateway.handleDisconnect(makeSocket("nobody").socket),
    ).not.toThrow();
    expect(registry.first()).toBeDefined();
  });
});
