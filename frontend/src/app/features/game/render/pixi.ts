import { Application, Point, Rectangle, Graphics } from 'pixi.js';
import { CellId, CellState, Coord, GameUpdate, PlayerId, PlayerMeta, FoodId, Food } from "@transcendence/shared/protocol";
import 'pixi.js/math-extras';

const MAX_RADIUS = 200;

export class PixiApp {
	readonly app = new Application();
	private cam = new Rectangle();
	private cells: Record<CellId, CellState> = {
		"1": { owner: "1", pos: { x: 100, y: 100 }, radius: 25 },
		"2": { owner: "2", pos: { x: 400, y: 300 }, radius: 40 },
		"3": { owner: "1", pos: { x: 800, y: 800 }, radius: 50 },
	};
	private players: Record<PlayerId, PlayerMeta> = {};
	private food: Record<FoodId, Food> = {};
	private graphics: Record<string, Graphics> = {};
	private id: PlayerId = "1";


	private getGraphic(id: CellId): Graphics {
		let g = this.graphics[id];
		if (!g) {
			g = new Graphics().circle(0, 0, 1).fill('#ffffff');
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
					const sizeFactor = 1 / Math.pow(cell.radius / 25, 0.45);
					const vel = distToMouse.normalize().multiplyScalar(t * time.deltaTime * 5 * sizeFactor);
					cellWorldPos = cellWorldPos.add(vel);
					for (const [foodId, food] of Object.entries(this.food)) {
						let dist = cellWorldPos.subtract(CoordToPoint(food.pos)).magnitude();
						if (dist < cell.radius + food.radius) {
							food.pos = <Coord>{x: -100, y:  -100};
							cell.radius = Math.min(MAX_RADIUS, cell.radius + 1);
							// TODO add food respawn logic by sending webpacket to server at the end?
						}
					}
					for (const [otherId, otherCell] of Object.entries(this.cells)) {
						if (id === otherId) continue;
						let offset = cellWorldPos.subtract(CoordToPoint(otherCell.pos));
						let dist = offset.magnitude();
						if (dist >= cell.radius + otherCell.radius)
							continue;
						const dir = dist < 1e-6 ? new Point(1, 0) : offset.multiplyScalar(1 / dist);
						cellWorldPos = CoordToPoint(otherCell.pos).add(dir.multiplyScalar(cell.radius + otherCell.radius));
					}
					cell.pos = PointToCoord(cellWorldPos);
				}

				const graph = this.getGraphic(id);
				graph.position.set(cell.pos.x, cell.pos.y);
				graph.scale.set(cell.radius);
				// TODO MAKE COLORS NOT HARDCODED EXTRACT FROM OWNER / PLAYERMETA
				graph.tint = cell.owner == "1" ? '#f08409' : "#0ee72b";
			}
		});
	}

	public update(gu: GameUpdate): void {
		for (const [id, cell] of Object.entries(gu.cells)) {
			if (cell == null) {
				delete this.cells[id];
				this.graphics[id]?.destroy();
				delete this.graphics[id];
			} else {
				this.cells[id] = cell;
			}
		}
		for (const [id, f] of Object.entries(gu.food)) {
			if (f === null) delete this.food[id];
			else this.food[id] = f;
		}
		for (const [id, p] of Object.entries(gu.players)) {
			if (p === null) delete this.players[id];
			else this.players[id] = p;
		}
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