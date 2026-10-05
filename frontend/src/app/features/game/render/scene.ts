import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { Vec } from '@transcendence/shared/game';
import { World } from '@transcendence/shared/game';
import { socket, enemyMouse } from "../game";
import { createGrid } from './grid';
import { MouseMove, SequencedFactoryFactory, ServerMessage } from "@transcendence/shared/protocol";

const GRID_CELL = 50;
const FOOD_COLOR = '#f0610f';

/**
 * Turns world state into Pixi display objects. Everything lives under `root`,
 * which is offset by the camera, so objects are positioned in world space.
 */
export class Scene {
	readonly root = new Container();
	private readonly player: Sprite;
	private readonly enemy: Sprite;
	private readonly foods: Graphics[];
	private readonly createMouseMove = SequencedFactoryFactory(0, MouseMove);

	constructor(private readonly world: World, playerTexture: Texture, enemyTexture: Texture) {
		this.root.addChild(createGrid(world.width, world.height, GRID_CELL));

		this.foods = world.foods.map((food) => {
			const g = new Graphics().rect(0, 0, food.size, food.size).fill(FOOD_COLOR);
			this.root.addChild(g);
			return g;
		});

		this.player = new Sprite(playerTexture);
		this.player.anchor.set(0.5);
		this.root.addChild(this.player);
		this.enemy = new Sprite(enemyTexture);
		this.player.anchor.set(0.5);
		this.root.addChild(this.enemy);
	}

	sync(camera: Vec): void {
		const { player, foods, enemy } = this.world;
		this.root.position.set(-camera.x, -camera.y);
		this.player.position.set(player.pos.x, player.pos.y);
		this.player.setSize(player.width, player.height);
		foods.forEach((food, i) => this.foods[i].position.set(food.pos.x, food.pos.y));
		enemy.pos.x = enemyMouse().x;
		enemy.pos.y = enemyMouse().y;
		this.enemy.position.set(enemy.pos.x, enemy.pos.y);
		if (socket)
			socket.send(JSON.stringify(this.createMouseMove({x: player.pos.x, y: player.pos.y})));
	}
}
