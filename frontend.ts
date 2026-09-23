/// <reference lib="dom" />

import type { MouseMove } from "./types.ts"
import { defaultMouseMove, WsEvent } from "./types.ts";
import { gameObject } from "./gameObject.ts"
import { Player } from "./player.ts"

let websocket: WebSocket | undefined;
let mouseX = 0;
let mouseY = 0;
let player: Player | undefined;
// let object: gameObject | undefined;

// to have the player object follow mouse directly (its always accurate on both sides)
// uncomment everything related to "object" and comment everything related to the "player"
// variable. to fix desync between slowly following we need to initialize the "player"
// on the current position, dunno how to do that as of now.


const output = (): HTMLElement => {
  const element = document.querySelector<HTMLElement>("#output");
  if (!element) {
    throw new Error("The #output element is missing");
  }
  return element;
};

const mousePosition = (): HTMLElement => {
  const element = document.querySelector<HTMLElement>("#mousepos");
  if (!element) {
    throw new Error("The #mousepos element is missing");
  }
  return element;
};

const writeToScreen = (message: string): void => {
  output().insertAdjacentHTML("afterbegin", `<p>${message}</p>`);
};

const sendMessage = (message: string): void => {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    return;
  }

  websocket.send(message);
};

document.addEventListener("DOMContentLoaded", (): void => {
  websocket = new WebSocket("ws://127.0.0.1:8080/");

  websocket.onopen = (): void => {
    writeToScreen("CONNECTED");
	player = new Player(100, 0, 0, new gameObject("player", 100, 100));
	// object = new gameObject("object", 100, 100)
  };

  websocket.onclose = (): void => {
    writeToScreen("DISCONNECTED");
  };

  websocket.onmessage = (event: MessageEvent): void => {
    const data = JSON.parse(event.data.toString())
    if (data.type === WsEvent.MouseMove) {
      const mousemove: MouseMove = data;
      output().innerHTML = `Other pos: X: ${mousemove.mouseX} Y: ${mousemove.mouseY}`;
 	  player?.transform2D(mousemove.mouseX, mousemove.mouseY);
	  //object?.moveObject(mousemove.mouseX, mousemove.mouseY);
    }
  };

  websocket.onerror = (event: Event): void => {
    writeToScreen(`ERROR: ${event.type}`);
  };
});

document.addEventListener("mousemove", (event: MouseEvent): void => {
  mousePosition().innerHTML = `Own pos: X: ${event.clientX} Y: ${event.clientY}`;
  let mousemove: MouseMove = defaultMouseMove;
  mousemove.mouseX = event.clientX;
  mousemove.mouseY = event.clientY;
  player?.transform2D(mousemove.mouseX, mousemove.mouseY);
  //object?.moveObject(mousemove.mouseX, mousemove.mouseY);
  sendMessage(JSON.stringify(mousemove));
});
