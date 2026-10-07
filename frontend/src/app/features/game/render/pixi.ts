import { Application, Assets } from 'pixi.js';
import { PlayerId, PlayerMeta } from "@transcendence/shared/protocol";

export class PixiApp {
	readonly app = new Application();
	private id: PlayerId = ""; 
	

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
		const { app } = this;
		app.ticker.add((time) => {
			console.log("yeet");
			
		});
	}

	destroy(): void {
	}
}
