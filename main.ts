import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { WebSocketServer, WebSocket } from "ws";

import { WsEvent, type MouseMove } from "./types.ts";

// ============================ BORING BOILERPLATE =============================

const files: Record<string, { path: string; contentType: string }> = {
  "/": { path: "./index.html", contentType: "text/html" },
  "/index.html": { path: "./index.html", contentType: "text/html" },
  "/frontend.js": {
    path: "./dist/frontend.js",
    contentType: "text/javascript",
  },
  "/rowan.png": { path: "./rowan.png", contentType: "image/png"}, 
};

const server = http.createServer(async (request, response) => {
  if (request.headers.upgrade === "websocket") {
    return; // handled by the WebSocketServer below
  }

  const fileToServe =
    files[new URL(request.url ?? "/", "http://localhost").pathname];
  if (!fileToServe) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  try {
    const content = await readFile(path.resolve(fileToServe.path));
    response.writeHead(200, { "content-type": fileToServe.contentType });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});


// =========================== WEBSOCKET SHENANIGANS ===========================

const sockets = new Set<WebSocket>();

const wss = new WebSocketServer({ server });

// Register a callback for the WebSocket Server
wss.on("connection", (socket: WebSocket) => {
  // Save the socket to the shared set so other callbacks have access to it.
  sockets.add(socket);

  // Register callback for message recieved events.
  socket.on("message", (data, isBinary) => {
    // Binary messages might be interesting in a later stage.
    // Could reduce overhead.
    if (isBinary) {
      return;
    }
    let eventJson: MouseMove;
    try {
      eventJson = JSON.parse(data.toString());
    } catch (error) {
      console.error(error);
      return;
    }
    switch (eventJson.type) {
      case WsEvent.MouseMove:
        for (const s of sockets) {
          if (s !== socket) s.send(data.toString());
        }
        break;

      default:
        console.error("Unknown event type")
        break;
    }
  });

  // Callback for close events.
  socket.on("close", () => {
    sockets.delete(socket);
    console.log("DISCONNECTED");
  });

  // jada jada you get it.
  socket.on("error", (error) => {
    console.error("ERROR:", error);
  });

  console.log("CONNECTED");
});

server.listen(8080, () => {
  console.log("Listening on http://127.0.0.1:8080");
});
