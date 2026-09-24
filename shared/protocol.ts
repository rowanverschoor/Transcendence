import { z } from "zod";

const Sequenced = z.object({seq: z.number()});
const Typed = <T extends string>(type: T) => z.object({type:z.literal(type)});

export type Typed = z.infer<typeof Typed>;
export type Sequenced = z.infer<typeof Sequenced>;

const MouseMove = Typed("mousemove").extend(Sequenced.extend({ x: z.number(), y: z.number() }));
const JoinRequest = Typed("join").extend({type: z.literal("join"), roomId: z.string().optional()});

export const ClientMessage = z.discriminatedUnion("type", [
	MouseMove,
	JoinRequest
]);

export type MouseMove = z.infer<typeof MouseMove>;
export type JoinRequest = z.infer<typeof JoinRequest>;
export type ClientMessage = z.infer<typeof ClientMessage>;

const ServerAnnouncement = Typed("announcement").extend({ text: z.string() })

export const ServerMessage = z.discriminatedUnion("type", [
	ServerAnnouncement
])

export type ServerAnnouncement = z.infer<typeof ServerAnnouncement>;
export type ServerMessage = z.infer<typeof ServerMessage>;

