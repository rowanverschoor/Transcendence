import { Component, ElementRef, OnDestroy, AfterViewInit, viewChild } from '@angular/core';
import { GameSnapshot, JoinRequest, ServerMessage } from '@transcendence/shared';
import { io, Socket } from 'socket.io-client';
import { PixiApp } from './render/pixi';

export let socket: Socket;

@Component({
	imports: [],
	selector: 'app-game',
	styleUrl: './game.scss',
	templateUrl: './game.html',
})
export class Game implements AfterViewInit, OnDestroy {
	private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('gameHost');
	private snap: GameSnapshot | undefined;
	private app?: PixiApp;
	private appPromise?: Promise<PixiApp>;
	private destroyed = false;

	async ngAfterViewInit(): Promise<void> {
		// create pixi ?
		const app = await PixiApp.create(this.host().nativeElement);

		if (this.destroyed) {
			app.destroy();
			return;
		}
		this.app = app;
		this.connect();
	}

	ngOnDestroy(): void {
		this.destroyed = true;
		socket?.disconnect();
		this.app?.destroy();
	}

	connect(): void {
		socket = io("/");

		socket.on("connect", (): void => {
			console.log("connected");
			let jr: JoinRequest;
			if (this.snap)
				jr = {type: "join", roomId: this.snap.roomId};
			else
				jr = {type: "join"};
			socket.send(jr);
		});

		socket.on("disconnect", (): void => {
			console.log("disconnected");
		});

		socket.on("message", (data: string): void => {
			try {
				const msg = JSON.parse(data);

				const sm: ServerMessage = ServerMessage.parse(msg);
				switch (sm.type) {
					case "announcement":
						console.log(msg);
						break;
					case "update":
						// do update stuff
						break;
					case "snapshot":
						this.snap = GameSnapshot.parse(sm);
						break;
					default:
						break;
			}
			}
			catch (error)
			{
				console.error(error);
				return;
			}
		})
	}
}
