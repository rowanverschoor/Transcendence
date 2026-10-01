import { Application, Assets } from 'pixi.js';
import { World } from '@transcendence/shared/game';
import { Scene } from './scene';

const BUNNY_URL = '/bunny.png';
const FOOD_COUNT = 10;
/** World is this many viewports wide/tall, measured when the app is created. */
const WORLD_SCALE = 3;

/** Owns the Pixi Application and wires input -> World -> Scene each tick. */
export class PixiApp {
	readonly app = new Application();
	private world!: World;
	private scene!: Scene;

	/**
	 * Async factory: `Application.init()` must resolve before the canvas exists.
	 * Callers must invoke `destroy()` (typically from DestroyRef) exactly once.
	 */
	static async create(host: HTMLElement): Promise<PixiApp> {
		const engine = new PixiApp();
		await engine.app.init({
			background: '#1099bb',
			// Track the host box, not the window; the host is layout-driven.
			resizeTo: host,
		});
		host.appendChild(engine.app.canvas);

		const texture = await Assets.load(BUNNY_URL);
		const { width, height } = engine.app.screen;
		engine.world = new World(width * WORLD_SCALE, height * WORLD_SCALE, texture.width, texture.height, FOOD_COUNT);
		engine.scene = new Scene(engine.world, texture);
		engine.app.stage.addChild(engine.scene.root);

		engine.startTicking();
		return engine;
	}

	private constructor() {}

	private startTicking(): void {
		const { app, world, scene } = this;
		app.ticker.add((time) => {
			const { width, height } = app.screen;
			const cam = world.cameraOrigin(width, height);
			const pointer = app.renderer.events.pointer.global;

			// Pointer is in screen space; the world works in world space.
			world.step({ x: pointer.x + cam.x, y: pointer.y + cam.y }, time.deltaTime);
			// Re-read the camera: the player moved this tick.
			scene.sync(world.cameraOrigin(width, height));
		});
	}

	destroy(): void {
		// texture: false — the Texture is cached by Assets and must survive for
		// the next engine instance; unload it explicitly through Assets.
		this.app.destroy(true, { children: true, texture: false });
		void Assets.unload(BUNNY_URL);
	}
}
