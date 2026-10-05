import { Component, DestroyRef, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { PixiApp } from './render/pixi-app';

@Component({
	imports: [],
	selector: 'app-game',
	styleUrl: './game.scss',
	templateUrl: './game.html',
})
export class Game {
	private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('gameHost');
	private app?: PixiApp;

	constructor() {
		const destroyRef = inject(DestroyRef);
		// afterNextRender: DOM host exists and (if SSR ever lands) we're in the browser.
		afterNextRender(async () => {
			let destroyed = false;
			destroyRef.onDestroy(() => {
				destroyed = true;
				this.app?.destroy();
			});
			this.app = await PixiApp.create(this.host().nativeElement);
			if (destroyed) this.app.destroy(); // left the page while create() was pending
		});
	}
}
