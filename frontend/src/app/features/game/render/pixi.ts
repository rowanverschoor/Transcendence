import { Application, Point, Rectangle, Graphics, Container } from 'pixi.js';
import { CellId, CellState, Coord, GameUpdate, PlayerId, PlayerMeta, FoodId, Food, GameSnapshot } from "@transcendence/shared/protocol";
import 'pixi.js/math-extras';

const MAX_RADIUS = 200;

function cssColor(name: string): string {
	return getComputedStyle(document.documentElement)
		.getPropertyValue(`--${name}`)
		.trim();
}

export class PixiApp {
	private destroyed = false;
	readonly app = new Application();
	private cam = new Rectangle();
	private cells: Record<CellId, CellState> = {
		"1": { owner: "1", pos: { x: 100, y: 100 }, radius: 25 },
		"2": { owner: "2", pos: { x: 400, y: 300 }, radius: 40 },
		"3": { owner: "1", pos: { x: 800, y: 800 }, radius: 50 },
	};
	private players: Record<PlayerId, PlayerMeta> = {
		"1": {name: "You", color: '#f08409'},
		"2": {name: "NotYou", color: '#0ee72b'},
	};
	private food: Record<FoodId, Food> = {
		"1": {pos: {x: 500, y: 500}, radius: 10},
		"2": {pos: {x: 900, y: 600}, radius: 10},
		"3": {pos: {x: 1000, y: 200}, radius: 10},
		"4": {pos: {x: 600, y: 200}, radius: 10},
		"5": {pos: {x: 300, y: 700}, radius: 10},
	};
	private cellGraphics: Record<CellId, Graphics> = {};
	private foodGraphics: Record<FoodId, Graphics> = {};
	private id: PlayerId = "1";

	private foodLayer = new Container();
	private cellLayer = new Container();


	private getCellGraphic(id: CellId): Graphics {
		let g = this.cellGraphics[id];
		if (!g) {
			g = new Graphics().circle(0, 0, 1).fill('#ffffff');
			this.cellLayer.addChild(g);
			this.cellGraphics[id] = g;
		}
		return g;
	}

	private getFoodGraphic(id: FoodId): Graphics {
		let g = this.foodGraphics[id];
		if (!g) {
			g = new Graphics().circle(0, 0, 1).fill('#ffffff');
			this.foodLayer.addChild(g);
			this.foodGraphics[id] = g;
		}
		return g;
	}

	static async create(host: HTMLElement): Promise<PixiApp> {
		const engine = new PixiApp();
		await engine.app.init({
			background: cssColor('game'),
			resizeTo: host,
		});
		host.appendChild(engine.app.canvas);
		engine.app.stage.addChild(engine.foodLayer, engine.cellLayer);
		engine.startTicking();
		return engine;
	}

	private constructor() {}

	private startTicking(): void {
		const { app } = this;
		app.ticker.add((time) => {
			if (this.destroyed) return;
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
							// move this logic to backend?
							food.pos = <Coord>{x: -100, y:  -100};
							cell.radius = Math.min(MAX_RADIUS, cell.radius + 1);
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

				const graph = this.getCellGraphic(id);
				graph.position.set(cell.pos.x, cell.pos.y);
				graph.scale.set(cell.radius);
				const color = this.players[cell.owner]?.color;
				graph.tint = color ?? '#ffffff';
			}
			for (const [id, f] of Object.entries(this.food))
			{
				const graph = this.getFoodGraphic(id);
				graph.position.set(f.pos.x, f.pos.y);
				graph.scale.set(f.radius);
			}
		});
	}

	public update(gu: GameUpdate): void {
		if (this.destroyed) return;
		for (const [id, cell] of Object.entries(gu.cells)) {
			if (cell == null) {
				delete this.cells[id];
				this.cellGraphics[id]?.destroy();
				delete this.cellGraphics[id];
			} else {
				this.cells[id] = cell;
			}
		}
		for (const [id, f] of Object.entries(gu.food)) {
			if (f === null) {
				delete this.food[id];
				this.foodGraphics[id]?.destroy();
				delete this.foodGraphics[id];
			} else {
				this.food[id] = f;
			}
		}
		for (const [id, p] of Object.entries(gu.players)) {
			if (p === null) delete this.players[id];
			else this.players[id] = p;
		}
	}

	public snapshot(snap: GameSnapshot): void {
		if (this.destroyed) return;
		this.id = snap.you;
		this.cells = snap.cells;
		this.players = snap.players;
		this.food = snap.food;
	}

	destroy(): void {
		if (this.destroyed) return ;
		this.destroyed = true;
		this.app.destroy(true, { children: true });
		this.cellGraphics = {};
		this.foodGraphics = {};
		this.cells = {};
		this.food = {};
		this.players = {};
	}
}

function CoordToPoint(c: Coord): Point {
	return (new Point(c.x, c.y));
}

function PointToCoord(p: Point): Coord {
	return ({x: p.x, y: p.y });
}