import { Application, Assets, Point, Sprite } from "pixi.js";
import 'pixi.js/math-extras'

function within(a: {x: number; y: number}, b: {x: number; y: number}, range: number) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy <= range * range;
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
  background.anchor.set(0.5);

  if (app.screen.width > app.screen.height) {
	background.width = app.screen.width * 1.2;
		background.scale.y = background.scale.x;
  } else {
	background.height = app.screen.height * 1.2;
	background.scale.x = background.scale.y;
  }

  background.x = app.screen.width / 2;
  background.y = app.screen.height / 2;

  // Load the bunny texture
  const bunnytexture = await Assets.load("/assets/bunny.png");

  // Create a bunny Sprite
  const bunny = new Sprite(bunnytexture);

  // Center the sprite's anchor point
  bunny.anchor.set(0.5);

  // Move the sprite to the center of the screen
  bunny.position.set(app.screen.width / 2, app.screen.height / 2);

  // Add the bunny to the stage
  app.stage.addChild(background);
  app.stage.addChild(bunny);
  
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;

  //app.stage.addEventListener('pointermove', (event) => {
	//	const mousePos = event.global;
  //  const vec = mousePos.subtract(bunny.position).normalize().multiply(new Point(5, 5)).add(bunny.position);
  //  bunny.position.set(vec.x, vec.y);
  //});

  // Listen for animate update
   app.ticker.add((time) => {
     // Just for fun, let's rotate mr rabbit a little.
     // * Delta is 1 if running at 100% performance *
     // * Creates frame-independent transformation *
     // bunny.rotation += 0.1 * time.deltaTime;
    const mousePos = app.renderer.events.pointer.global;
    const speed = 5;
	
	const vec = bunny.position.subtract(mousePos).normalize().multiplyScalar(speed).add(background);
	if (!within(mousePos, bunny, 5))
	  background.position.set(vec.x, vec.y);

    // const vec = mousePos.subtract(bunny.position).normalize().multiplyScalar(speed).add(bunny.position);
    //const vec = mousePos.subtract(bunny.position).normalize().multiply(new Point(5, 5)).add(bunny.position);
    // if (!within(mousePos, bunny, 3))
    //   bunny.position.set(vec.x, vec.y);
   });
})();
