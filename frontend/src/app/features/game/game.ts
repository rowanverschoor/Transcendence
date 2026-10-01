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
			this.app = await PixiApp.create(this.host().nativeElement);
			// destroyRef.onDestroy inside afterNextRender avoids tearing down an
			// app whose init() was still pending when the user navigated away.
			destroyRef.onDestroy(() => this.app?.destroy());
		});
	}
}
