import { gameObject } from "./gameObject";

export class Player {
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

	transform2D(x: number, y: number) {
		if (x < this.x)
			this.x -= 5;
		else if (x > this.x)
			this.x += 5;
		if (y < this.y)
			this.y -= 5;
		else if (y > this.y)
			this.y += 5;
		this.sprite.moveObject(this.x, this.y);
	}
}