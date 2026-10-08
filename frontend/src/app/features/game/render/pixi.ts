import { Application, Assets, Circle, Point, Rectangle, Graphics } from 'pixi.js';
import { CellId, CellState, Coord, GameUpdate, PlayerId } from "@transcendence/shared/protocol";
import 'pixi.js/math-extras';

export class PixiApp {
	readonly app = new Application();
	private cam = new Rectangle();
	private cells: Record<CellId, CellState> = {
		"1": { owner: "69", pos: { x: 100, y: 100 }, radius: 25 },
		"2": { owner: "70", pos: { x: 400, y: 300 }, radius: 40 },
	};
	private graphics: Record<CellId, Graphics> = {};
	private id: PlayerId = "69";

	// ... create(), constructor unchanged ...

	private getGraphic(id: CellId): Graphics {
		let g = this.graphics[id];
		if (!g) {
			g = new Graphics().circle(0, 0, 1).fill('#ffffff'); // white so tint = final color
			this.app.stage.addChild(g);
			this.graphics[id] = g;
		}
		return g;
	}

	static async create(host: HTMLElement): Promise<PixiApp> {
		const engine = new PixiApp();
		await engine.app.init({
			background: '#1099bb',
			resizeTo: host,
		});
		host.appendChild(engine.app.canvas);
		engine.startTicking();
		return engine;
	}

	private constructor() {}

	private startTicking(): void {
		// this.graph = new Graphics().circle(0, 0, this.cells[0].radius).fill('#e16c0d');
		const { app } = this;
		app.ticker.add((time) => {
			const mousePos = app.renderer.events.pointer.global;
			for (const [id, cell] of Object.entries(this.cells))
			{
				if (cell.owner === this.id)
				{
					let cellWorldPos = CoordToPoint(cell.pos);
					const distToMouse = mousePos.subtract(cellWorldPos);
					let t = Math.min(distToMouse.magnitude() / 100, 1) ** 2;
					const vel = distToMouse.normalize().multiplyScalar(t * time.deltaTime * 5);
					cellWorldPos = cellWorldPos.add(vel);
					// cell.radius = Math.min(cell.radius + 0.5, 500);
					let collides: boolean = false;
					for (const [otherId, otherCell] of Object.entries(this.cells)) {
						if (id === otherId) continue;
						let dist = cellWorldPos.subtract(CoordToPoint(otherCell.pos)).magnitude();
						if (dist < cell.radius + otherCell.radius)
							collides = true;
					}
					if (collides === false)
						cell.pos = PointToCoord(cellWorldPos);
				}

				const graph = this.getGraphic(id);
				graph.position.set(cell.pos.x, cell.pos.y);
				graph.scale.set(cell.radius);
			}
			// do caluclation here pewpew
		});
	}

	public update(gu: GameUpdate): void {
		
	}

	destroy(): void {
	}
}

function CoordToPoint(c: Coord): Point {
	return (new Point(c.x, c.y));
}

function PointToCoord(p: Point): Coord {
	return ({x: p.x, y: p.y });
}