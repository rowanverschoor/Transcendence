import { z } from "zod";

// ---------------------------------------------------------------------------
// Wire-format rules
//
// - Messages cross the wire as JSON strings (ADR 0005), so:
//   * collections are z.record, never z.map — Map does not survive JSON;
//   * every id is a string — JSON object keys are strings.
// - Deltas encode removal as a null value (tombstone) under the entity's id.
//   A snapshot carries the same fields but never tombstones.
// - The make* factories bound coordinates to the arena. Only the server uses
//   them: it distrusts clients, not itself. Clients parse with the unbounded
//   schemas (the arena arrives in the GameSnapshot).
// ---------------------------------------------------------------------------

const Sequenced = z.compile(z.object({ seq: z.number().int().min(0) }));
const Typed = <T extends string>(type: T) =>
  z.compile(z.object({ type: z.literal(type) }));

const SequencedSchema = <T extends string, F extends z.ZodRawShape>(
  type: T,
  fields: F,
) =>
  z.compile(z.object({ ...Typed(type).shape, ...Sequenced.shape, ...fields }));

type SchemaOutput<S extends { shape: z.ZodRawShape }> = {
  [K in keyof S["shape"]]: z.output<S["shape"][K]>;
};

// Returns a factory for any message type that contains a seq field.
// The factory increments seq on each call. The frontend uses it to number
// PlayerInput messages so the server can drop reordered/duplicate input.
export const SequencedFactoryFactory = <S extends { shape: z.ZodRawShape }>(
  startSeq: number,
  schema: S,
) => {
  let seq = startSeq;
  const type = [...(schema.shape["type"] as z.ZodLiteral).values][0];
  return (fields: Omit<SchemaOutput<S>, "type" | "seq">): SchemaOutput<S> =>
    ({ ...fields, type, seq: seq++ }) as SchemaOutput<S>;
};

// --- Arena ------------------------------------------------------------------

export const Arena = z.compile(
  z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
);
export type ArenaConfig = z.infer<typeof Arena>;

export const Coord = z.compile(
  z.object({
    x: z.number().min(0),
    y: z.number().min(0),
  }),
);
export type Coord = z.infer<typeof Coord>;

export const makeCoord = (cfg: ArenaConfig) =>
  z.compile(
    z.object({
      x: z.number().min(0).max(cfg.width),
      y: z.number().min(0).max(cfg.height),
    }),
  );

// --- Ids (server-assigned, opaque strings) ----------------------------------
// The server's id-generation scheme lands with the game logic; the wire only
// fixes PlayerId's and RoomId's lengths.

export const PlayerId = z.string().length(5);
export type PlayerId = z.infer<typeof PlayerId>;

export const RoomId = z.string().length(10);
export type RoomId = z.infer<typeof RoomId>;

export const CellId = z.string().min(1);
export type CellId = z.infer<typeof CellId>;

export const FoodId = z.string().min(1);
export type FoodId = z.infer<typeof FoodId>;

// --- Client -> server --------------------------------------------------------

export const JoinRequest = z.compile(
  z.object({
    ...Typed("join").shape,
    roomId: RoomId.optional(),
  }),
);

export const PlayerInput = z.compile(
  SequencedSchema("input", {
    mousepos: Coord,
    split: z.boolean().optional(),
    eject: z.boolean().optional(),
  }),
);

export const ClientMessage = z.compile(
  z.discriminatedUnion("type", [PlayerInput, JoinRequest]),
);

// Bounded variants: the server validates client input against the arena.
export const makePlayerInput = (cfg: ArenaConfig) =>
  z.compile(
    SequencedSchema("input", {
      mousepos: makeCoord(cfg),
      split: z.boolean().optional(),
      eject: z.boolean().optional(),
    }),
  );

export const makeClientMessage = (cfg: ArenaConfig) =>
  z.compile(z.discriminatedUnion("type", [makePlayerInput(cfg), JoinRequest]));

// --- Game state (shared between snapshot and deltas) --------------------------

/** Display-level info for one player; positions live on their cells. */
export const PlayerMeta = z.compile(
  z.object({
    name: z.string().min(1).max(32).optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
  }),
);

/** One blob: a player owns one cell before splitting, N after. */
export const CellState = z.compile(
  z.object({
    owner: PlayerId,
    pos: Coord,
    radius: z.number().positive(),
  }),
);

/** Pellets and ejected mass; the server treats both alike. */
export const Food = z.compile(
  z.object({
    pos: Coord,
    radius: z.number().positive(),
  }),
);

// --- Server -> client ---------------------------------------------------------

export const ServerAnnouncement = z.compile(
  Typed("announcement").extend({
    text: z.string(),
  }),
);

/** Full state: sent on join/reconnect so a client can resync from scratch. */
export const GameSnapshot = z.compile(
  Typed("snapshot").extend({
    roomId: RoomId,
    /** The receiving client's own player: which cells are yours. */
    you: PlayerId,
    arena: Arena,
    tick: z.number().int().min(0),
    players: z.record(PlayerId, PlayerMeta),
    cells: z.record(CellId, CellState),
    food: z.record(FoodId, Food),
  }),
);

/**
 * Delta: entities that changed since the last update the client handled.
 * seq: the last input seq from the receiving client that this update reflects.
 * A null value is a tombstone: the entity left / was eaten.
 */
export const GameUpdate = z.compile(
  SequencedSchema("update", {
    tick: z.number().int().min(0),
    players: z.record(PlayerId, z.union([PlayerMeta, z.null()])),
    cells: z.record(CellId, z.union([CellState, z.null()])),
    food: z.record(FoodId, z.union([Food, z.null()])),
  }),
);

export const ServerMessage = z.compile(
  z.discriminatedUnion("type", [ServerAnnouncement, GameSnapshot, GameUpdate]),
);

// --- Inferred message types ----------------------------------------------------

export type JoinRequest = z.infer<typeof JoinRequest>;
export type PlayerInput = z.infer<typeof PlayerInput>;
export type ClientMessage = z.infer<typeof ClientMessage>;
export type PlayerMeta = z.infer<typeof PlayerMeta>;
export type CellState = z.infer<typeof CellState>;
export type Food = z.infer<typeof Food>;
export type ServerAnnouncement = z.infer<typeof ServerAnnouncement>;
export type GameSnapshot = z.infer<typeof GameSnapshot>;
export type GameUpdate = z.infer<typeof GameUpdate>;
export type ServerMessage = z.infer<typeof ServerMessage>;
