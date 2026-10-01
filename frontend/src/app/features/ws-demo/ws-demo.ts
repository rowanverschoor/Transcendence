import { Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from "@angular/core";
import { io, type Socket } from "socket.io-client";
import { MouseMove, SequencedFactoryFactory, ServerMessage } from "@transcendence/shared/protocol";

@Component({
	imports: [],
	selector: "app-ws-demo",
	styleUrl: "./ws-demo.scss",
	templateUrl: "./ws-demo.html",
})
export class WsDemo implements OnInit, OnDestroy {
	private socket: Socket | undefined;
	private mouseX = 0;
	private mouseY = 0;
	private readonly createMouseMove = SequencedFactoryFactory(0, MouseMove);

	protected readonly connected = signal(false);
	protected readonly lastMessage = signal("");

	@ViewChild("output", { static: true }) private readonly output!: ElementRef<HTMLDivElement>;
	@ViewChild("mousepos", { static: true }) private readonly mousepos!: ElementRef<HTMLDivElement>;

	private readonly onMouseMove = (event: MouseEvent): void => {
		this.mouseX = event.clientX;
		this.mouseY = event.clientY;
		this.mousepos.nativeElement.innerHTML = `X: ${this.mouseX} Y: ${this.mouseY}`;
		// Check before constructing the message: seq must only count sent messages.
		if (!this.socket || !this.socket.connected) {
			return;
		}
		this.sendMessage(JSON.stringify(this.createMouseMove({ x: this.mouseX, y: this.mouseY })));
	};

	ngOnInit(): void {
		// Same-origin: /socket.io is proxied to the backend (Angular dev-server
		// proxy in dev, nginx in the container). No host in code, works behind the tunnel.
		this.socket = io("/");

		this.socket.on("connect", (): void => {
			this.connected.set(true);
			this.writeToScreen("CONNECTED");
		});

		this.socket.on("disconnect", (): void => {
			this.connected.set(false);
			this.writeToScreen("DISCONNECTED");
		});

		// The server emits the same JSON strings as before, just over the "message" event.
		this.socket.on("message", (data: string): void => {
			try {
				const msg = JSON.parse(data);
				console.log(msg);

				const sm: ServerMessage = ServerMessage.parse(msg);
				switch (sm.type) {
					case "forward":
						this.lastMessage.set(JSON.stringify(sm.msg));
						break;
					case "announcement":
						this.lastMessage.set(`Announcement: ${sm.text}`);
						break;

					default:
						break;
				}
			} catch (error) {
				console.error(error);
				return;
			}
		});

		this.socket.on("connect_error", (error: Error): void => {
			this.connected.set(false);
			this.writeToScreen(`ERROR: ${error.message}`);
		});

		document.addEventListener("mousemove", this.onMouseMove);
	}

	ngOnDestroy(): void {
		document.removeEventListener("mousemove", this.onMouseMove);
		this.socket?.close();
		this.socket = undefined;
	}

	private writeToScreen(message: string): void {
		this.output.nativeElement.insertAdjacentHTML("afterbegin", `<p>${message}</p>`);
	}

	private sendMessage(message: string): void {
		if (!this.socket || !this.socket.connected) {
			return;
		}
		this.socket.send(message);
	}
}
