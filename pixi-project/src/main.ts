import { Application, Assets, Point, Sprite } from "pixi.js";
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

(async () => {
  // Create a new application
  const app = new Application();

  // Initialize the application
  await app.init({ background: "#109797", width: 900, height: 600 });

  // Append the application canvas to the document body
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  const bgtexture = await Assets.load("/assets/background.png");
  const background = new Sprite(bgtexture);
  //background.anchor.set(0.5);

  if (app.screen.width > app.screen.height) {
	background.width = app.screen.width * 10;
		background.scale.y = background.scale.x;
  } else {
	background.height = app.screen.height * 10;
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

  // Add the bunny to the stage
  //app.stage.addChild(background);
  //app.stage.addChild(bunny);
  //const player = new Player(background.width / 2, background.height / 2, bunny);
  //app.stage.eventMode = 'static';
  //app.stage.hitArea = app.screen;

  // app.ticker.add((time) => {
  //  //iterations of movement by mouse -> player movement -> background movement -> background moving accordint to player position.
  //  const mousePos = app.renderer.events.pointer.global;
  //  const speed = 5;
	
    // const vec = mousePos.subtract(bunny.position).normalize().multiplyScalar(speed).add(bunny.position);
    //const vec = mousePos.subtract(bunny.position).normalize().multiply(new Point(5, 5)).add(bunny.position);
    // if (!within(mousePos, bunny, 3))
    //   bunny.position.set(vec.x, vec.y);

	/*const vec = bunny.position.subtract(mousePos).normalize().multiplyScalar(speed).add(background);
	if (!within(mousePos, bunny, 5))
  {
    if (vec.x > 0)
        vec.x = 0;
    else if (-vec.x > background.width - app.screen.width)
        vec.x = -(background.width - app.screen.width);
    console.log(vec.x, background.width, app.screen.width);
    if (vec.y > 0)
        vec.y = 0;
    else if (-vec.y > background.height - app.screen.height)
        vec.y = -(background.height - app.screen.height);
	  background.position.set(vec.x, vec.y);
  }*/

    //if (!within(mousePos, bunny, 5))
    //{
    //  const playerPos = bunny.position.subtract(mousePos).normalize().multiplyScalar(speed).add(player.pos);
    //  if (playerPos.x < background.width && playerPos.x > app.screen.width)
    //    background.x = playerPos.x - background.width;
    //  else if (background.width - playerPos.x <= app.screen.width / 2 && background.width - playerPos.x - bunny.width / 2 > 0)
    //    bunny.position.x = background.width - playerPos.x;
    //  else
    //    playerPos.x = player.pos.x;
    //  if (playerPos.y < background.height && playerPos.y > app.screen.height)
    //    background.y = playerPos.y - background.height;
    //  else if (background.height - playerPos.y <= app.screen.height / 2 && background.height - playerPos.y - bunny.height / 2 > 0)
    //    bunny.position.y = background.height - playerPos.y;
    //  else
    //    playerPos.y = player.pos.y;
    //  player.setPos(playerPos.x, playerPos.y);
    //};

  // });
  // clankerish version cuz I cba and it is kinda what I intended to do with version above but its late
  const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

app.stage.addChild(background);
app.stage.addChild(bunny);

const player = new Player(background.width / 2, background.height / 2, bunny);

const maxCamX = background.width - app.screen.width;
const maxCamY = background.height - app.screen.height;
const speed = 10;

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

  // Camera centers on the player, clamped to the world bounds
  const camX = clamp(player.pos.x - app.screen.width / 2, 0, maxCamX);
  const camY = clamp(player.pos.y - app.screen.height / 2, 0, maxCamY);

  background.position.set(-camX, -camY);
  bunny.position.set(player.pos.x - camX, player.pos.y - camY);
});
})();
