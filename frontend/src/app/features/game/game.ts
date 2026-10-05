import { Component, DestroyRef, ElementRef, afterNextRender, inject, viewChild, OnInit, OnDestroy, signal } from '@angular/core';
import { PixiApp } from './render/pixi-app';
import { io, type Socket } from "socket.io-client";
import { ClientMessage, MouseMove, ServerMessage } from '@transcendence/shared';

export let socket: Socket | undefined;
export let enemyMouse = signal(MouseMove.parse({type: "mousemove", seq: 1, x: 1, y: 1}));

@Component({
	imports: [],
	selector: 'app-game',
	styleUrl: './game.scss',
	templateUrl: './game.html',
})
export class Game implements OnInit, OnDestroy {
	private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('gameHost');
	private app?: PixiApp;

	protected readonly connected = signal(false);
	protected readonly lastMessage = signal("");

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

	ngOnInit(): void {
		socket = io("/");

		socket.on("connect", (): void => {
			this.connected.set(true);
		})

		socket.on("disconnect", (): void => {
			this.connected.set(false);
		});

		socket.on("message", (data: string): void => {
			try {
				const msg = JSON.parse(data);
				console.log(msg);

				const sm: ServerMessage = ServerMessage.parse(msg);
				switch (sm.type) {
					case "forward":
						this.lastMessage.set(JSON.stringify(sm.msg));
						if (sm.msg.type === "mousemove") {
							enemyMouse.set(MouseMove.parse(sm.msg));
						}
						break;
					case "announcement":
						this.lastMessage.set(`Announcement: ${sm.text}`);
						break;

					default:
						break;
				}
			}
			catch (error) {
				console.error(error);
				return;
			}
		})

		socket.on("connect_error", (error: Error): void => {
			this.connected.set(false);
		});
	}

	ngOnDestroy(): void {
		socket?.close();
		socket = undefined;
		this.connected.set(false);
	}
}