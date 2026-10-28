import { Application, Point, Rectangle, Graphics, Container } from 'pixi.js';
import { CellId, CellState, Coord, GameUpdate, PlayerId, PlayerMeta, FoodId, Food, GameSnapshot, ClientMessage, SequencedFactoryFactory, PlayerInput } from "@transcendence/shared/protocol";
import 'pixi.js/math-extras';

function cssColor(name: string): string {
	return getComputedStyle(document.documentElement)
		.getPropertyValue(`--${name}`)
		.trim();
}

export interface InputSink {
	send(msg: ClientMessage): void;
}

const MAX_STEP = 7.5;
const VEL_FACTOR = 5;

export class PixiApp {
	private destroyed = false;
	readonly app = new Application();
	//private cam = new Rectangle();
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
	private changedCells = new Map<CellId, Coord>();

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

	private constructor() {}

	private startTicking(): void {
		const { app } = this;
		app.ticker.add((time) => {
			if (this.destroyed) return;
			const mousePos = app.renderer.events.pointer.global;
			this.sinceLastSend += time.deltaMS;

			for (const [id, cell] of Object.entries(this.cells))
			{
				if (cell.owner === this.id)
				{
					let cellWorldPos = CoordToPoint(cell.pos);
					const distToMouse = mousePos.subtract(cellWorldPos);
					let t = Math.min(distToMouse.magnitude() / 100, 1) ** 2;
					const sizeFactor = 1 / Math.pow(cell.radius / 25, 0.45);
					let vel = distToMouse.normalize().multiplyScalar(t * time.deltaTime * VEL_FACTOR * sizeFactor);
					console.log(vel.magnitude());
					const speed = vel.magnitude();
					if (speed > MAX_STEP * time.deltaTime) {
						vel = vel.multiplyScalar((MAX_STEP * time.deltaTime) / speed);
					}
					cellWorldPos = cellWorldPos.add(vel);
					// The following collision should eventually only work on friendly cells // they might still need some distortion
					// Upon collision enemy cells should either be eaten by the backend or a distortion should happen if neither is large enought ot eat the other
					for (const [otherId, otherCell] of Object.entries(this.cells)) {
						if (id === otherId) continue;
						let offset = cellWorldPos.subtract(CoordToPoint(otherCell.pos));
						let dist = offset.magnitude();
						if (dist >= cell.radius + otherCell.radius)
							continue;
						const dir = dist < 1e-6 ? new Point(1, 0) : offset.multiplyScalar(1 / dist);
						cellWorldPos = CoordToPoint(otherCell.pos).add(dir.multiplyScalar(cell.radius + otherCell.radius));
					}
					cellWorldPos.x = Math.max(0 + cell.radius, Math.min(cellWorldPos.x, 800 - cell.radius));
					cellWorldPos.y = Math.max(0 + cell.radius, Math.min(cellWorldPos.y, 800 - cell.radius));
					cell.pos = PointToCoord(cellWorldPos);
					this.changedCells.set( id, { x: cell.pos.x, y: cell.pos.y } );
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
			if (this.sinceLastSend >= 1000 / 60) {
				this.sinceLastSend -= 1000 / 60;
				this.sink.send(this.makeInput({
					cells: [...this.changedCells].map(([id, pos]) => ({ id, pos })),
					split: this.pendingSplit,
					eject: this.pendingEject,
				}));
				this.pendingEject = false;
				this.pendingSplit = false;
				this.changedCells.clear();
			}
		});
		app.ticker.maxFPS = 60;
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
		console.log("id: ", this.id);
		this.cells = structuredClone(snap.cells);
		this.players = snap.players;
		this.food = structuredClone(snap.food);
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