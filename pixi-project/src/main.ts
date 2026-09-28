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
  await app.init({ background: "#1099bb", resizeTo: window });

  // Append the application canvas to the document body
  document.getElementById("pixi-container")!.appendChild(app.canvas);

  // Load the bunny texture
  const texture = await Assets.load("/assets/bunny.png");

  // Create a bunny Sprite
  const bunny = new Sprite(texture);

  // Center the sprite's anchor point
  bunny.anchor.set(0.5);

  // Move the sprite to the center of the screen
  bunny.position.set(app.screen.width / 2, app.screen.height / 2);

  // Add the bunny to the stage
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
    const vec = mousePos.subtract(bunny.position).normalize().multiplyScalar(speed).add(bunny.position);
    //const vec = mousePos.subtract(bunny.position).normalize().multiply(new Point(5, 5)).add(bunny.position);
    if (!within(mousePos, bunny, 3))
      bunny.position.set(vec.x, vec.y);
   });
})();
