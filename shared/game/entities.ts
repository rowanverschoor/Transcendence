export interface Vec {
	x: number;
	y: number;
}

/** Centre-anchored; width/height are the world-space extent. */
export interface Player {
	pos: Vec;
	width: number;
	height: number;
	speed: number;
}

/** Top-left anchored square. */
export interface Food {
	pos: Vec;
	size: number;
}

export const FOOD_SIZE = 25;
export const GROWTH_FACTOR = 1.1;
export const SPEED_DECAY = 0.95;
export const MIN_SPEED = 3;
/** Distance within which the player counts as having reached the target. */
export const STOP_RANGE = 5;

export function randomInt(a: number, b: number): number {
	if (a > b) [a, b] = [b, a];
	return Math.floor(Math.random() * (b - a + 1)) + a;
}

export function overlaps(player: Player, food: Food): boolean {
	const px = player.pos.x - player.width / 2;
	const py = player.pos.y - player.height / 2;
	return (
		px < food.pos.x + food.size &&
		px + player.width > food.pos.x &&
		py < food.pos.y + food.size &&
		py + player.height > food.pos.y
	);
}

export function grow(player: Player): void {
	player.width *= GROWTH_FACTOR;
	player.height *= GROWTH_FACTOR;
	player.speed = Math.max(player.speed * SPEED_DECAY, MIN_SPEED);
}
