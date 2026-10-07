import { Component, ElementRef, OnDestroy, OnInit, viewChild } from '@angular/core';
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
export class Game implements OnInit, OnDestroy {
	private snap: GameSnapshot | undefined;
	private app?: PixiApp;
	private appPromise?: Promise<PixiApp>;

	ngOnInit(): void {
		// create pixi ?
		this.appPromise = PixiApp.create(viewChild.required<ElementRef<HTMLDivElement>>('gameHost')().nativeElement);
		

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

	ngOnDestroy(): void {
		//clean ?
	}
}
