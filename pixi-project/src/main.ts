import { Application, Assets, Point, Rectangle, Sprite, Graphics } from "pixi.js";
import 'pixi.js/math-extras'

function within(a: {x: number; y: number}, b: {x: number; y: number}, range: number) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy <= range * range;
}

class Player {
  sprite: Sprite;
  pos: Point;

  constructor(x: number, y: number, sprite: Sprite) {
    this.sprite = sprite;
    this.pos = new Point(x, y);
  }
  
  setPos(x: number, y: number = x) {
    this.pos.set(x, y);
  }
}

function GetRandomInteger(a: number, b: number) {
  if (a > b) [a, b] = [b, a];
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

class Food {
  rect: Graphics;
  alive = true;
  pos: Point;
  size = 25;

  constructor(x: number, y: number) {
    this.rect = new Graphics().rect(0, 0, this.size, this.size).fill("#f0610f");
    this.pos = new Point(x, y);
  }

  respawn(maxX: number, maxY: number) {
    this.pos.set(
      GetRandomInteger(0, maxX - this.size),
      GetRandomInteger(0, maxY - this.size)
    );
    this.alive = true;
    this.rect.visible = true;
  }
}

(async () => {
  // Create a new application
  const app = new Application();

  // Initialize the application
  await app.init({ background: "#109797", resizeTo: window });

  // Append the application canvas to the document body
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  const bgtexture = await Assets.load("/assets/background.png");
  const background = new Sprite(bgtexture);
  //background.anchor.set(0.5);

  if (app.screen.width > app.screen.height) {
	background.width = app.screen.width * 2;
		background.scale.y = background.scale.x;
  } else {
	background.height = app.screen.height * 2;
	background.scale.x = background.scale.y;
  }

  //background.x = app.screen.width / 2;
  //background.y = app.screen.height / 2;

  // Load the bunny texture
  const bunnytexture = await Assets.load("/assets/bunny.png");

  
  // Create a bunny Sprite
  const bunny = new Sprite(bunnytexture);

  // Center the sprite's anchor point
  bunny.anchor.set(0.5);

  // Move the sprite to the center of the screen
  bunny.position.set(app.screen.width / 2, app.screen.height / 2);

  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

app.stage.addChild(background);
app.stage.addChild(bunny);

const player = new Player(background.width / 2, background.height / 2, bunny);

const maxCamX = background.width - app.screen.width;
const maxCamY = background.height - app.screen.height;
var speed: number = 5;

const foodarray: Food[] = [];
for (let i = 0; i < 10; i++) {
	const food = new Food(0, 0);
	food.respawn(background.width, background.height);
	foodarray.push(food);
	app.stage.addChild(food.rect);
}
app.stage.addChild(bunny);    

app.ticker.add((time) => {
const mouse = app.renderer.events.pointer.global;

// Both are in screen space, so this direction is valid
const toMouse = mouse.subtract(bunny.position);

if (toMouse.magnitude() > 5) {
	const step = toMouse.normalize().multiplyScalar(speed * time.deltaTime);

	// Move in world space, keeping the bunny fully inside the background
	player.setPos(
	clamp(player.pos.x + step.x, bunny.width / 2, background.width - bunny.width / 2),
	clamp(player.pos.y + step.y, bunny.height / 2, background.height - bunny.height / 2)
	);
}

const camX = clamp(player.pos.x - app.screen.width / 2, 0, maxCamX);
const camY = clamp(player.pos.y - app.screen.height / 2, 0, maxCamY);

for (let i = 0; i < 10; i++)
{
	const fx = foodarray[i].pos.x - camX;
	const fy = foodarray[i].pos.y - camY;
	foodarray[i].rect.position.set(fx, fy);

	const bx = player.pos.x - camX - bunny.width / 2;
	const by = player.pos.y - camY - bunny.height / 2;

	if (
		bx < fx + foodarray[i].size &&
		bx + bunny.width > fx &&
		by < fy + foodarray[i].size &&
		by + bunny.height > fy
	) {
		player.sprite.width *= 1.1;
		player.sprite.height *= 1.1;
		speed = Math.max(speed * 0.95, 3);
		foodarray[i].respawn(background.width, background.height);
		console.log(speed);
	}

}

background.position.set(-camX, -camY);
bunny.position.set(player.pos.x - camX, player.pos.y - camY);

  background.position.set(-camX, -camY);
  bunny.position.set(player.pos.x - camX, player.pos.y - camY);
});
})();
