/// <reference lib="dom" />

let websocket: WebSocket | undefined;
let mouseX = 0;
let mouseY = 0;

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

const playArea = (): HTMLElement => {
  const element = document.querySelector<HTMLElement>("#play-area");
  if (!element) {
    throw new Error("The #play-area element is missing");
  }
  return element;
};

const circle = (): HTMLElement => {
  const element = document.querySelector<HTMLElement>("#circle");
  if (!element) {
    throw new Error("The #circle element is missing");
  }
  return element;
};

// Put the circle's centre under the mouse, kept inside the play area.
const moveCircle = (clientX: number, clientY: number): void => {
  const area = playArea().getBoundingClientRect();
  const element = circle();
  const radius = element.offsetWidth / 2;
  const x = Math.min(Math.max(clientX - area.left, radius), area.width - radius);
  const y = Math.min(Math.max(clientY - area.top, radius), area.height - radius);
  element.style.left = `${x}px`;
  element.style.top = `${y}px`;
};

const writeToScreen = (message: string): void => {
  output().insertAdjacentHTML("afterbegin", `<p>${message}</p>`);
};

const sendMessage = (message: string): void => {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    return;
  }

//   writeToScreen(`SENT: ${message}`);
  websocket.send(message);
};

document.addEventListener("DOMContentLoaded", (): void => {
  websocket = new WebSocket("ws://127.0.0.1:8080/");

  websocket.onopen = (): void => {
    writeToScreen("CONNECTED");
    sendMessage("ping");
  };

  websocket.onclose = (): void => {
    writeToScreen("DISCONNECTED");
  };

  websocket.onmessage = (event: MessageEvent): void => {
    output().innerHTML = `RECEIVED: ${event.data}`;
  };

  websocket.onerror = (event: Event): void => {
    writeToScreen(`ERROR: ${event.type}`);
  };
});

document.addEventListener("mousemove", (event: MouseEvent): void => {
  mouseX = event.clientX;
  mouseY = event.clientY;
  mousePosition().innerHTML = `X: ${mouseX} Y: ${mouseY}`;
  moveCircle(mouseX, mouseY);
  sendMessage(`MOUSEPOS: X: ${mouseX} Y: ${mouseY}`);
});