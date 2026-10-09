import { Component, ElementRef, OnDestroy, AfterViewInit, viewChild } from '@angular/core';
import { GameSnapshot, GameUpdate, JoinRequest, ServerMessage } from '@transcendence/shared';
import { DisconnectDescription, io, Socket } from 'socket.io-client';
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
	private destroyed = false;

	async ngAfterViewInit(): Promise<void> {
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

		socket.on("disconnect", (reason: Socket.DisconnectReason, description?: DisconnectDescription): void => {
			if (description)
				console.log("Disconnected: ", reason, description);
			else
				console.log("Disconnected: ", reason);
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
						this.app?.update(sm);
						break;
					case "snapshot":
						this.snap = sm;
						this.app?.snapshot(this.snap);
						break;
					default:
						console.error("Invalid message received: ", msg);
						break;
				}
			}
			catch (error) {
				console.error(error);
				return;
			}
		})
	}
}
