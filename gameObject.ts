export class gameObject {
	public id: string;
	public width: number;
	public height: number;
	public canvas: HTMLCanvasElement;
	public ctx: CanvasRenderingContext2D | null;

	public constructor(id: string, width: number, height: number) {
		this.id = id;
		this.width = width;
		this.height = height;
		this.canvas = <HTMLCanvasElement>document.createElement("canvas");
		this.canvas.id = id;
		this.ctx = this.canvas.getContext("2d");
		this.canvas.width = width;
		this.canvas.height = height;
		document.body.appendChild(this.canvas);
		if (this.ctx) {
			this.ctx.fillStyle = 'black';
			this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		}
		
		// this.ctx.drawImage(this.canvas, 0, 0);
	}

	public moveObject(x: number, y: number) {
		this.canvas.style.position = "absolute";
		this.canvas.style.left = `${x - this.width / 2}px`;
		this.canvas.style.top = `${y - this.height / 2}px`;
	}
}
