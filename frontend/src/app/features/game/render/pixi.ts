import { Application, Point, Graphics, Container } from 'pixi.js';
import { CellId, CellState, Coord, GameUpdate, PlayerId, PlayerMeta, FoodId, Food, GameSnapshot, ClientMessage, SequencedFactoryFactory, PlayerInput, ArenaConfig } from "@transcendence/shared/protocol";
import 'pixi.js/math-extras';

function cssColor(name: string): string {
	return getComputedStyle(document.documentElement)
		.getPropertyValue(`--${name}`)
		.trim();
}

export interface InputSink {
	send(msg: ClientMessage): void;
}

export class PixiApp {
	private destroyed = false;
	readonly app = new Application();
	private arena: ArenaConfig = {width: 0, height: 0};
	private cells: Record<CellId, CellState> = {};
	private players: Record<PlayerId, PlayerMeta> = {};
	private food: Record<FoodId, Food> = {};
	private cellGraphics: Record<CellId, Graphics> = {};
	private foodGraphics: Record<FoodId, Graphics> = {};
	private id: PlayerId = "";
	private sink!: InputSink;
	private sinceLastSend = 0;
	private makeInput = SequencedFactoryFactory(0, PlayerInput);
	private pendingSplit : boolean = false;
	private pendingEject : boolean = false;

	private foodLayer = new Container();
	private cellLayer = new Container();

	private keyDown = (e: KeyboardEvent): void => {
		if (e.repeat)
			return ;
		const t = e.target as HTMLElement | null;
		if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable))
			return ;
		switch (e.code) {
			case 'Space':
				e.preventDefault();
				this.pendingSplit = true;
				break;
			case 'KeyW':
				this.pendingEject = true;
				break;
		}
	}

	private getCellGraphic(id: CellId): Graphics {
		let g = this.cellGraphics[id];
		if (!g) {
			g = new Graphics();
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

	static async create(host: HTMLElement, sink: InputSink): Promise<PixiApp> {
		const engine = new PixiApp();
		engine.sink = sink;
		await engine.app.init({
			background: cssColor('game'),
			resizeTo: host,
		});
		host.appendChild(engine.app.canvas);
		engine.app.stage.addChild(engine.foodLayer, engine.cellLayer);
		engine.startTicking();
		window.addEventListener('keydown', engine.keyDown);
		return engine;
	}

	private isBlocked(pos: Point, id: CellId): boolean {
		if (pos.x <= 0 || pos.x >= this.arena.width ||
			pos.y <= 0 || pos.y >= this.arena.height)
			return (true);

		for (const [otherId, otherCell] of Object.entries(this.cells)) {
			if (id === otherId) continue;
			let offset = pos.subtract(CoordToPoint(otherCell.pos));
			if (offset.magnitude() < otherCell.radius)
				return (true);
		}
		return (false);
	}

	private updateCell(cell: Graphics, radius: number, id: CellId) {
		const segments = 16;
		let points : Point[] = [];

		cell.clear();

		for (let i = 0; i < segments; i++) {
			const angle = (i / segments) * 2 * Math.PI;
			const dirX = Math.sin(angle);
			const dirY = -Math.cos(angle);

			const CONTACT_OVERLAP = 3;

			let hitDist = radius;
			for (let d = 1; d <= radius; d += 1) {
				const pos = new Point(
					cell.position.x + dirX * d,
					cell.position.y + dirY * d,
				);
				if (this.isBlocked(pos, id)) {
					hitDist = Math.min(d + CONTACT_OVERLAP, radius);
					break;
				}
			}
			points.push(new Point(dirX * hitDist, dirY * hitDist));
		}

		const mid = (a: Point, b: Point) => new Point((a.x + b.x) / 2, (a.y + b.y) / 2);
		const start = mid(points[segments - 1], points[0]);
		cell.moveTo(start.x, start.y);
		for (let i = 0; i < segments; i++) {
			const next = points[(i + 1) % segments];
			const m = mid(points[i], next);
			cell.quadraticCurveTo(points[i].x, points[i].y, m.x, m.y);
		}
		cell.closePath();
		cell.fill('#ffffff');
	}

	private constructor() {}

	private startTicking(): void {
		const { app } = this;
		app.ticker.add((time) => {
			if (this.destroyed) return;
			const mousePos = app.renderer.events.pointer.global;

			this.sinceLastSend += time.deltaMS;
			// TEMP?: In the PR19 draft ClientMessage takes cells changed instead of mousepos, adjustments have been made for the next PR
			// following if statement has been moved to the bottom of the ticker so I can collect all changed cell and send them over
			if (this.sinceLastSend >= 50) {
				this.sinceLastSend -= 50;
				this.sink.send(this.makeInput({
					mousepos: { x: mousePos.x, y: mousePos.y },
					split: this.pendingSplit,
					eject: this.pendingEject,
				}));
				this.pendingEject = false;
				this.pendingSplit = false;
			}
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
					// The following collision should eventually only work on friendly cells // they might still need some distortion
					// Upon collision enemy cells should either be eaten by the backend or a distortion should happen if neither is large enought ot eat the other
					//for (const [otherId, otherCell] of Object.entries(this.cells)) {
					//	if (id === otherId) continue;
					//	let offset = cellWorldPos.subtract(CoordToPoint(otherCell.pos));
					//	let dist = offset.magnitude();
					//	if (dist >= cell.radius + otherCell.radius)
					//		continue;
					//	const dir = dist < 1e-6 ? new Point(1, 0) : offset.multiplyScalar(1 / dist);
					//	cellWorldPos = CoordToPoint(otherCell.pos).add(dir.multiplyScalar(cell.radius + otherCell.radius));
					//}
					cell.pos = PointToCoord(cellWorldPos);
				}
			}
			for (const [id, cell] of Object.entries(this.cells)) {
				const graph = this.getCellGraphic(id);
				graph.position.set(cell.pos.x, cell.pos.y);
				this.updateCell(graph, cell.radius, id);
				graph.tint = this.players[cell.owner]?.color ?? '#ffffff';
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

		for (const id of Object.keys(this.cellGraphics)) {
		if (!(id in snap.cells)) {
			this.cellGraphics[id].destroy();
			delete this.cellGraphics[id];
		}
	}
	for (const id of Object.keys(this.foodGraphics)) {
		if (!(id in snap.food)) {
			this.foodGraphics[id].destroy();
			delete this.foodGraphics[id];
		}
	}

		this.id = snap.you;
		this.cells = structuredClone(snap.cells);
		this.players = snap.players;
		this.food = structuredClone(snap.food);
		this.arena = snap.arena;

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
		window.removeEventListener('keydown', this.keyDown);
	}
}

function CoordToPoint(c: Coord): Point {
	return (new Point(c.x, c.y));
}

function PointToCoord(p: Point): Coord {
	return ({x: p.x, y: p.y });
}