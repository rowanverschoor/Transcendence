import { Application, Assets, Point, Sprite } from 'pixi.js';
import 'pixi.js/math-extras';

/** Distance within which the bunny is considered to have caught up to the pointer. */
const SNAP_RANGE = 3;
const MOVE_SPEED = 5;

function within(a: Point, b: Point, range: number): boolean {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return dx * dx + dy * dy <= range * range;
}

export class PixiEngine {
	readonly app = new Application();
	bunny!: Sprite;

	/**
	 * Async factory: `Application.init()` must resolve before the canvas exists.
	 * Callers must invoke `destroy()` (typically from DestroyRef) exactly once.
	 */
	static async create(host: HTMLElement): Promise<PixiEngine> {
		const engine = new PixiEngine();
		await engine.app.init({
			background: '#1099bb',
			// Track the host box, not the window; the host is layout-driven.
			resizeTo: host,
		});
		host.appendChild(engine.app.canvas);
		engine.bunny = await PixiEngine.loadBunny(engine.app);
		engine.startTicking();
		return engine;
	}

	private constructor() {}

	private static async loadBunny(app: Application): Promise<Sprite> {
		const texture = await Assets.load('/bunny.png');

		const bunny = new Sprite(texture);
		bunny.anchor.set(0.5);
		bunny.position.set(app.screen.width / 2, app.screen.height / 2);
		app.stage.addChild(bunny);

		app.stage.eventMode = 'static';
		app.stage.hitArea = app.screen;
		return bunny;
	}

	private startTicking(): void {
		this.app.ticker.add(() => {
			const mousePos = this.app.renderer.events.pointer.global;
			if (within(mousePos, this.bunny.position, SNAP_RANGE)) return;
			const vec = mousePos.subtract(this.bunny.position).normalize().multiplyScalar(MOVE_SPEED).add(this.bunny.position);
			this.bunny.position.set(vec.x, vec.y);
		});
	}

	destroy(): void {
		// texture: false — the Texture is cached by Assets and must survive for
		// the next engine instance; unload it explicitly through Assets.
		this.app.destroy(true, { children: true, texture: false });
		void Assets.unload('/bunny.png');
	}
}
