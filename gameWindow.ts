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
		this.canvas = <HTMLCanvasElement>document.createElement(id);
		this.ctx = this.canvas.getContext("2d");
		this.canvas.width = width;
		this.canvas.height = height;
		document.body.appendChild(this.canvas);
	}
}

const w = new gameObject("canvas", 100, 100);
