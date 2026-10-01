import { Graphics } from 'pixi.js';

const FILL = '#0d7f7f';
const LINE = '#109797';
const BORDER = '#f0f0f0';

/** Static map grid, drawn once in world coordinates. */
export function createGrid(width: number, height: number, cell: number): Graphics {
	const g = new Graphics().rect(0, 0, width, height).fill(FILL);

	for (let x = cell; x < width; x += cell) g.moveTo(x, 0).lineTo(x, height);
	for (let y = cell; y < height; y += cell) g.moveTo(0, y).lineTo(width, y);
	g.stroke({ width: 1, color: LINE });

	// g.rect(0, 0, width, height).stroke({ width: 4, color: BORDER });
	return g;
}
