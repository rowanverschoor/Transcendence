import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
} from "@angular/core";

interface Blob {
  x: number;
  y: number;
  r: number;
  c: string;
  name: string;
  a: number;
  s: number;
}

interface Food {
  x: number;
  y: number;
  c: string;
}

@Component({
  imports: [],
  selector: "app-home",
  styleUrl: "./home.scss",
  templateUrl: "./home.html",
})
export class Home implements AfterViewInit, OnDestroy {
  @ViewChild("game") private gameCanvas?: ElementRef<HTMLCanvasElement>;

  private ctx?: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private frameId?: number;
  private readonly onResize = () => this.resize();
  private readonly reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  private readonly blobs: Blob[] = [
    { x: 0.45, y: 0.5, r: 46, c: "primary", name: "rowan", a: 0, s: 0 },
    { x: 0.75, y: 0.3, r: 30, c: "secondary", name: "mossy", a: 0, s: 0 },
    { x: 0.2, y: 0.75, r: 22, c: "secondary", name: "kiwi", a: 0, s: 0 },
  ].map((b, i) => ({ ...b, a: Math.random() * 6, s: 0.0015 + i * 0.0007 }));

  private readonly food: Food[] = Array.from({ length: 40 }, () => ({
    x: Math.random(),
    y: Math.random(),
    c: Math.random() > 0.5 ? "primary" : "secondary",
  }));

  constructor(private readonly zone: NgZone) {}

  ngAfterViewInit(): void {
    const canvas = this.gameCanvas?.nativeElement;
    if (!canvas) return;
    this.ctx = canvas.getContext("2d") ?? undefined;
    if (!this.ctx) return;

    this.zone.runOutsideAngular(() => {
      this.resize();
      addEventListener("resize", this.onResize);
      this.frameId = requestAnimationFrame((t) => this.draw(t));
    });
  }

  ngOnDestroy(): void {
    removeEventListener("resize", this.onResize);
    if (this.frameId !== undefined) cancelAnimationFrame(this.frameId);
  }

  private resize(): void {
    const canvas = this.gameCanvas?.nativeElement;
    if (!canvas || !this.ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    this.ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    this.width = rect.width;
    this.height = rect.height;
  }

  private colorOf(name: string): string {
    return getComputedStyle(this.gameCanvas!.nativeElement)
      .getPropertyValue("--" + name)
      .trim();
  }

  private drawBlob(x: number, y: number, r: number, t: number): void {
    const ctx = this.ctx!;
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const k = r * (1 + 0.05 * Math.sin(a * 3 + t) + 0.03 * Math.cos(a * 5 - t));
      const px = x + Math.cos(a) * k;
      const py = y + Math.sin(a) * k;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  }

  private draw(time: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = time / 1000;
    ctx.clearRect(0, 0, this.width, this.height);

    this.food.forEach((f) => {
      ctx.fillStyle = this.colorOf(f.c);
      ctx.globalAlpha = 0.7;
      this.drawBlob(f.x * this.width, f.y * this.height, 4, t + f.x * 9);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    this.blobs.forEach((b) => {
      const x = (b.x + Math.cos(t * b.s * 400 + b.a) * 0.06) * this.width;
      const y = (b.y + Math.sin(t * b.s * 300 + b.a) * 0.06) * this.height;
      this.drawBlob(x, y, b.r, t * 1.5 + b.a);
      ctx.fillStyle = this.colorOf(b.c);
      ctx.fill();
      ctx.fillStyle = this.colorOf("page");
      ctx.font = "700 13px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(b.name, x, y);
    });

    if (!this.reducedMotion.matches) {
      this.frameId = requestAnimationFrame((next) => this.draw(next));
    }
  }
}
