# Transcendance

## Tech Spike - moving square
In order to familiarize the team with typescript and WebSockets we're starting simple.
Input from one client should show up on another client in real time.
We will make page with a square that a user can move. This movement should show up for all connected clients.
We can benchmark latency by adding a timestamp to all communications later.

## Progress so far
### Backend
A node backend that can accept websocket connections.
Each client gets it own connection.
When the backend receives a `MOUSEPOS` message the message is broadcasted.

### Frontend
Frontend requests a websocket connection and registers callbacks to socket events.
Frontend registers a callback on the mousemove event.
Callback sends the coordinates over the websocket.
When websocket receives a message, message is displayed through a callback.

## How to run
Easiest way to run is to install [mise](https://mise.jdx.dev/).  
From project repo root run `mise run start` to start the server.  
Open the page in 2 windows to see the effects.

### mise data directory
Run `mise run setup` after cloning or when changing locations. When `~/goinfre`
exists, the project uses `~/goinfre/mise` for mise data. Elsewhere, mise uses its
normal default location. The setup script only creates or removes the exact
project-generated override; it preserves custom `mise.local.toml` files and
stops if an existing file differs from the project template.
