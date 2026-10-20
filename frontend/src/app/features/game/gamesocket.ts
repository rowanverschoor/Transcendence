import { Injectable, OnDestroy } from "@angular/core";
import { ClientMessage, JoinRequest, PlayerMeta, ServerMessage } from "@transcendence/shared";
import { DisconnectDescription, io, Socket } from "socket.io-client";


@Injectable()
export class GameSocket implements OnDestroy {
	private socket?: Socket;
	private roomId?: string;

	connect(onMessage: (sm: ServerMessage) => void): void {
		const socket = (this.socket = io("/"));
		
		socket.on("connect", (): void => {
			console.log("connected");
			let jr: JoinRequest;
			// TEMP: Temporary player meta for testing purposes.
			// TODO: Fetch information from user account
			const pmeta: PlayerMeta  = {color: "#f38e09", name: "Player"};
			if (this.roomId)
				jr = {meta: pmeta, type: "join", roomId: this.roomId};
			else
				jr = {meta: pmeta, type: "join"};
			socket.send(jr);
		});

		this.socket.on("disconnect", (reason: Socket.DisconnectReason, description?: DisconnectDescription): void => {
			if (description)
				console.log("Disconnected: ", reason, description);
			else
				console.log("Disconnected: ", reason);
		});

		this.socket.on("message", (data: string): void => {
			try {
				const sm: ServerMessage = ServerMessage.parse(JSON.parse(data));
				if (sm.type === "snapshot")
						this.roomId = sm.roomId;
				onMessage(sm);
			}
			catch (error) {
				console.error(error);
			}
		})
	}

	send(msg: ClientMessage): void {
		this.socket?.send(msg);
	}

	ngOnDestroy(): void {
		this.socket?.disconnect();
	}
}