import { Component, ElementRef, OnDestroy, AfterViewInit, viewChild, inject } from '@angular/core';
import { GameSnapshot, ServerMessage } from '@transcendence/shared';
import { Socket } from 'socket.io-client';
import { PixiApp } from './render/pixi';
import { GameSocket } from './gamesocket';

@Component({
	imports: [],
	selector: 'app-game',
	providers: [GameSocket],
	styleUrl: './game.scss',
	templateUrl: './game.html',
})

export class Game implements AfterViewInit, OnDestroy {
	private readonly gameSocket = inject(GameSocket);
	private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('gameHost');
	private app?: PixiApp;
	private destroyed = false;

	async ngAfterViewInit(): Promise<void> {
		try
		{
			const app = await PixiApp.create(this.host().nativeElement, this.gameSocket);
			if (this.destroyed) {
				app.destroy();
				return;
			}
			this.app = app;
			this.gameSocket.connect((sm) => this.handleMessage(sm));
		}
		catch (error)
		{
			console.log(error);
			return;
		}
	}

	ngOnDestroy(): void {
		this.destroyed = true;
		this.app?.destroy();
	}

	private handleMessage(sm: ServerMessage): void {
		switch (sm.type) {
			case "announcement":
				console.log(sm);
				break;
			case "update":
				this.app?.update(sm);
				break;
			case "snapshot":
				this.app?.snapshot(sm);
				break;
			default:
				console.error("Invalid message received:", sm);
		}
	}
}
