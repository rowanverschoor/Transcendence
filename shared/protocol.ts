import { z } from "zod";

const Sequenced = z.compile(z.object({ seq: z.number() }));
const Typed = <T extends string>(type: T) => z.compile(z.object({ type: z.literal(type) }));

const SequencedSchema = <T extends string, F extends z.ZodRawShape>(type: T, fields: F) =>
	z.compile(z.object({ ...Typed(type).shape, ...Sequenced.shape, ...fields }));

type SchemaOutput<S extends { shape: z.ZodRawShape }> = {
	[K in keyof S["shape"]]: z.output<S["shape"][K]>
};

// Returns a factory for any message type that contains a seq field.
// This factory will increment the value of seq each time you call it.
// It's magic
export const SequencedFactoryFactory = <S extends { shape: z.ZodRawShape }>(startSeq: number, schema: S) => {
	let seq = startSeq;
	const type = [...(schema.shape.type as z.ZodLiteral).values][0];
	return (fields: Omit<SchemaOutput<S>, "type" | "seq">): SchemaOutput<S> =>
		({ ...fields, type, seq: seq++ }) as SchemaOutput<S>;
};

export const MouseMove = SequencedSchema("mousemove", { x: z.number(), y: z.number() });
export const JoinRequest = z.compile(z.object({ ...Typed("Join").shape, roomId: z.string().optional() }));

export const ClientMessage = z.compile(z.discriminatedUnion("type", [
	MouseMove,
	JoinRequest
]));

export type MouseMove = z.infer<typeof MouseMove>;
export type JoinRequest = z.infer<typeof JoinRequest>;
export type ClientMessage = z.infer<typeof ClientMessage>;

export const ServerAnnouncement = z.compile(Typed("announcement").extend({ text: z.string() }));
export const ForwardClient = z.compile(Typed("forward").extend({ msg: ClientMessage }));

export const ServerMessage = z.compile(z.discriminatedUnion("type", [
	ServerAnnouncement,
	ForwardClient
]));

export type ServerAnnouncement = z.infer<typeof ServerAnnouncement>;
export type ServerMessage = z.infer<typeof ServerMessage>;

// Early optimization is the root of all evil.
// I guess that makes me the villain 😎

