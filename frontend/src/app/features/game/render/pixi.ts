import { Application, Graphics, Container } from "pixi.js";
import {
  ArenaConfig,
  CellId,
  CellState,
  ClientMessage,
  Coord,
  Food,
  FoodId,
  GameSnapshot,
  GameUpdate,
  PlayerId,
  PlayerInput,
  PlayerMeta,
  SequencedFactoryFactory,
} from "@transcendence/shared/protocol";
import { clampCoord, moveCell } from "@transcendence/shared/game";

function cssColor(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--${name}`)
    .trim();
}

/** Send cadence: 20 Hz, matches the backend tickPeriod_ms. */
const SEND_INTERVAL_MS = 50;
/** Cap the unacknowledged buffer at 2 s in case updates stall. */
const MAX_PENDING_INPUTS = 40;
/** Mirrors the backend MAX_VELOCITY default (the snapshot does not carry it). */
const MAX_VELOCITY = 10;

export interface InputSink {
  send(msg: ClientMessage): void;
}

export class PixiApp {
  private destroyed = false;
  readonly app = new Application();
  private cells: Record<CellId, CellState> = {};
  private players: Record<PlayerId, PlayerMeta> = {};
  private food: Record<FoodId, Food> = {};
  /** Latest server-authoritative state for the cells this client owns. */
  private serverCells: Record<CellId, CellState> = {};
  /** Sent inputs not yet acknowledged by a GameUpdate (input.seq > gu.seq). */
  private pending: PlayerInput[] = [];
  /** Current pointer target in world coordinates. */
  private target: Coord = { x: 0, y: 0 };
  private arena?: ArenaConfig;
  private cellGraphics: Record<CellId, Graphics> = {};
  private foodGraphics: Record<FoodId, Graphics> = {};
  /** Empty until the first GameSnapshot: inputs are numbered from snap.seq. */
  private id: PlayerId = "";
  private sink!: InputSink;
  private sinceLastSend = 0;
  private makeInput = SequencedFactoryFactory(0, PlayerInput);
  private pendingSplit = false;
  private pendingEject = false;

  private foodLayer = new Container();
  private cellLayer = new Container();

  private keyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    const t = e.target as HTMLElement | null;
    if (
      t &&
      (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)
    )
      return;
    switch (e.code) {
      case "Space":
        e.preventDefault();
        this.pendingSplit = true;
        break;
      case "KeyW":
        this.pendingEject = true;
        break;
    }
  };

  private getCellGraphic(id: CellId): Graphics {
    let g = this.cellGraphics[id];
    if (!g) {
      g = new Graphics().circle(0, 0, 1).fill("#ffffff");
      this.cellLayer.addChild(g);
      this.cellGraphics[id] = g;
    }
    return g;
  }

  private getFoodGraphic(id: FoodId): Graphics {
    let g = this.foodGraphics[id];
    if (!g) {
      g = new Graphics().circle(0, 0, 1).fill("#ffffff");
      this.foodLayer.addChild(g);
      this.foodGraphics[id] = g;
    }
    return g;
  }

  static async create(host: HTMLElement, sink: InputSink): Promise<PixiApp> {
    const engine = new PixiApp();
    engine.sink = sink;
    await engine.app.init({
      background: cssColor("game"),
      resizeTo: host,
    });
    host.appendChild(engine.app.canvas);
    engine.app.stage.addChild(engine.foodLayer, engine.cellLayer);
    engine.startTicking();
    window.addEventListener("keydown", engine.keyDown);
    return engine;
  }

  private constructor() {}

  private startTicking(): void {
    const { app } = this;
    app.ticker.add((time) => {
      if (this.destroyed) return;
      const world = this.cellLayer.toLocal(app.renderer.events.pointer.global);
      this.target = { x: world.x, y: world.y };

      // Inputs are only numbered/sent once a snapshot has seeded this.id
      // and the sequenced input factory (makeInput starts at snap.seq).
      if (this.id !== "") {
        this.sinceLastSend = Math.min(
          this.sinceLastSend + time.deltaMS,
          SEND_INTERVAL_MS * 2,
        );
        if (this.sinceLastSend >= SEND_INTERVAL_MS) {
          this.sinceLastSend -= SEND_INTERVAL_MS;
          const input = this.makeInput({
            mouse: this.target,
            split: this.pendingSplit,
            eject: this.pendingEject,
          });
          this.pending.push(input);
          if (this.pending.length > MAX_PENDING_INPUTS) this.pending.shift();
          this.sink.send(input);
          this.pendingSplit = false;
          this.pendingEject = false;
        }
      }

      this.predict();

      for (const [id, cell] of Object.entries(this.cells)) {
        const graph = this.getCellGraphic(id);
        graph.position.set(cell.pos.x, cell.pos.y);
        graph.scale.set(cell.radius);
        const color = this.players[cell.owner]?.color;
        graph.tint = color ?? "#ffffff";
      }
      for (const [id, f] of Object.entries(this.food)) {
        const graph = this.getFoodGraphic(id);
        graph.position.set(f.pos.x, f.pos.y);
        graph.scale.set(f.radius);
      }
    });
  }

  /**
   * Replays unacknowledged inputs on top of the last server state for our own
   * cells, then advances by the in-progress frame (sinceLastSend). Total
   * simulated time is pending.length * SEND_INTERVAL_MS + sinceLastSend, so
   * sending or acknowledging an input never moves a cell.
   */
  private predict(): void {
    const arena = this.arena;
    if (arena === undefined) return;
    const stepSeconds = SEND_INTERVAL_MS / 1000;
    const partialSeconds = this.sinceLastSend / 1000;
    for (const [id, authority] of Object.entries(this.serverCells)) {
      let pos: Coord = authority.pos;
      for (const input of this.pending) {
        pos = clampCoord(
          moveCell(
            pos,
            authority.radius,
            input.mouse,
            MAX_VELOCITY,
            stepSeconds,
          ),
          arena,
          authority.radius,
        );
      }
      if (partialSeconds > 0) {
        pos = clampCoord(
          moveCell(
            pos,
            authority.radius,
            this.target,
            MAX_VELOCITY,
            partialSeconds,
          ),
          arena,
          authority.radius,
        );
      }
      this.cells[id] = { ...authority, pos };
    }
  }

  public update(gu: GameUpdate): void {
    if (this.destroyed) return;
    for (const [id, cell] of Object.entries(gu.cells)) {
      if (cell == null) {
        delete this.cells[id];
        delete this.serverCells[id];
        this.cellGraphics[id]?.destroy();
        delete this.cellGraphics[id];
      } else if (cell.owner === this.id) {
        this.serverCells[id] = cell;
        this.cells[id] = cell;
      } else {
        this.cells[id] = cell;
      }
    }
    for (const [id, f] of Object.entries(gu.food)) {
      if (f === null) {
        delete this.food[id];
        this.foodGraphics[id]?.destroy();
        delete this.foodGraphics[id];
      } else {
        this.food[id] = f;
      }
    }
    for (const [id, p] of Object.entries(gu.players)) {
      if (p === null) delete this.players[id];
      else this.players[id] = p;
    }
    // gu.seq is the last of our inputs the server has simulated; drop it and
    // everything older, then re-predict our cells from the new authority.
    this.pending = this.pending.filter((input) => input.seq > gu.seq);
    this.predict();
  }

  public snapshot(snap: GameSnapshot): void {
    if (this.destroyed) return;

    for (const id of Object.keys(this.cellGraphics)) {
      if (!(id in snap.cells)) {
        this.cellGraphics[id].destroy();
        delete this.cellGraphics[id];
      }
    }
    for (const id of Object.keys(this.foodGraphics)) {
      if (!(id in snap.food)) {
        this.foodGraphics[id].destroy();
        delete this.foodGraphics[id];
      }
    }

    this.id = snap.you;
    this.arena = snap.arena;
    // Number our inputs from the seq the server expects next.
    this.makeInput = SequencedFactoryFactory(snap.seq, PlayerInput);
    this.cells = structuredClone(snap.cells);
    this.serverCells = {};
    for (const [id, cell] of Object.entries(snap.cells)) {
      if (cell.owner === snap.you) this.serverCells[id] = structuredClone(cell);
    }
    this.pending = [];
    this.pendingSplit = false;
    this.pendingEject = false;
    this.sinceLastSend = 0;
    this.players = snap.players;
    this.food = structuredClone(snap.food);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.app.destroy(true, { children: true });
    this.cellGraphics = {};
    this.foodGraphics = {};
    this.cells = {};
    this.serverCells = {};
    this.pending = [];
    this.food = {};
    this.players = {};
    window.removeEventListener("keydown", this.keyDown);
  }
}
