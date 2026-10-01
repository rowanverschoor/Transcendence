import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { io, type Socket } from "socket.io-client";
import { MouseMove, SequencedFactoryFactory, ServerMessage } from "@transcendence/shared";

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

	@ViewChild("output", { static: true }) private readonly output!: ElementRef<HTMLDivElement>;
	@ViewChild("mousepos", { static: true }) private readonly mousepos!: ElementRef<HTMLDivElement>;

	private readonly onMouseMove = (event: MouseEvent): void => {
		this.mouseX = event.clientX;
		this.mouseY = event.clientY;
		this.mousepos.nativeElement.innerHTML = `X: ${this.mouseX} Y: ${this.mouseY}`;
		this.sendMessage(JSON.stringify(this.createMouseMove({ x: this.mouseX, y: this.mouseY })));
	};

	ngOnInit(): void {
		this.socket = io("ws://localhost:8080/");

		this.socket.on("connect", (): void => {
			this.writeToScreen("CONNECTED");
		});

		this.socket.on("disconnect", (): void => {
			this.writeToScreen("DISCONNECTED");
		});

		// The server emits the same JSON strings as before, just over the "message" event.
		this.socket.on("message", (data: string): void => {
			try {
				this.output.nativeElement.innerHTML = `RECEIVED: ${data}`;
				const msg = JSON.parse(data);
				console.log(msg);

				const sm: ServerMessage = ServerMessage.parse(msg);
				switch (sm.type) {
					case "forward":
						this.output.nativeElement.innerHTML = `Server forwarded client message: ${JSON.stringify(sm.msg)}`;
						break;
					case "announcement":
						this.output.nativeElement.innerHTML = `Server announcement: ${sm.text}`;
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
