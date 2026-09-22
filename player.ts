import { gameObject } from "./gameObject";

class Player {
	size: number;
	x: number;
	y: number;
	sprite: gameObject;

	constructor(size: number, x: number, y: number, sprite: gameObject) {
		this.size = size;
		this.x = x;
		this.y = y;
		this.sprite = sprite;
	}

	translate2D(x: number, y: number) {
		this.x += x;
		this.y += y;
	}
}