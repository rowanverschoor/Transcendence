import { Component, DestroyRef, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { PixiEngine } from './pixi-engine';

@Component({
	imports: [],
	selector: 'app-game',
	styleUrl: './game.scss',
	templateUrl: './game.html',
})
export class Game {
	private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('gameHost');
	private engine?: PixiEngine;

	constructor() {
		const destroyRef = inject(DestroyRef);
		// afterNextRender: DOM host exists and (if SSR ever lands) we're in the browser.
		afterNextRender(async () => {
			this.engine = await PixiEngine.create(this.host().nativeElement);
			// destroyRef.onDestroy inside afterNextRender avoids tearing down an
			// engine whose init() was still pending when the user navigated away.
			destroyRef.onDestroy(() => this.engine?.destroy());
		});
	}
}
