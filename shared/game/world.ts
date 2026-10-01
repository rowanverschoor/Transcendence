import { Food, FOOD_SIZE, grow, overlaps, Player, randomInt, STOP_RANGE, Vec } from './entities.js';

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** Game state and rules. Plain TS: no Pixi, no Angular, no DOM. */
export class World {
	readonly player: Player;
	readonly foods: Food[] = [];

	constructor(
		readonly width: number,
		readonly height: number,
		playerWidth: number,
		playerHeight: number,
		foodCount: number,
	) {
		this.player = {
			pos: { x: width / 2, y: height / 2 },
			width: playerWidth,
			height: playerHeight,
			speed: 5,
		};
		for (let i = 0; i < foodCount; i++) {
			const food: Food = { pos: { x: 0, y: 0 }, size: FOOD_SIZE };
			this.respawn(food);
			this.foods.push(food);
		}
	}

	/** Advance one tick toward `target` (world space). `dt` is Pixi's frame delta (1 at 60fps). */
	step(target: Vec, dt: number): void {
		const p = this.player;
		const dx = target.x - p.pos.x;
		const dy = target.y - p.pos.y;
		const dist = Math.hypot(dx, dy);

		if (dist > STOP_RANGE) {
			const step = p.speed * dt;
			p.pos.x = clamp(p.pos.x + (dx / dist) * step, p.width / 2, this.width - p.width / 2);
			p.pos.y = clamp(p.pos.y + (dy / dist) * step, p.height / 2, this.height - p.height / 2);
		}

		for (const food of this.foods) {
			if (!overlaps(p, food)) continue;
			grow(p);
			this.respawn(food);
		}
	}

	/** Top-left of the viewport in world space, kept inside the world. */
	cameraOrigin(viewW: number, viewH: number): Vec {
		return {
			x: clamp(this.player.pos.x - viewW / 2, 0, Math.max(0, this.width - viewW)),
			y: clamp(this.player.pos.y - viewH / 2, 0, Math.max(0, this.height - viewH)),
		};
	}

	private respawn(food: Food): void {
		food.pos.x = randomInt(0, this.width - food.size);
		food.pos.y = randomInt(0, this.height - food.size);
	}
}
