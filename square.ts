class Square {
	size: number;
	x: number;
	y: number;

	constructor(size: number, x: number, y: number) {
		this.size = size;
		this.x = x;
		this.y = y;
	}

	translate2D(x: number, y: number) {
		this.x += x;
		this.y += y;
	}
}