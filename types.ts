/// <reference types="node" />

const WsEvent = {
	MouseMove: 1,
} as const;
 
interface MouseMove {
	type: WsEvent;
	mouseX: number;
	mouseY: number;
}

const defaultMouseMove: MouseMove = {
	type: WsEvent.MouseMove,
	mouseX: 0,
	mouseY: 0,
};

export type { MouseMove };
export type WsEvent = (typeof WsEvent)[keyof typeof WsEvent];

export { defaultMouseMove, WsEvent };
