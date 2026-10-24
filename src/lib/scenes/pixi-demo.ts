import { Scenes } from "#lib/core/scene.js";
import { Container, Assets, Sprite, Texture } from "pixi.js";
import { app } from "../core/app.js";

export default Scenes.create(async () => {
  const container = new Container();
  let texture: Texture;

  return {
    name: "pixi_demo",
    init: async () => {
      texture = await Assets.load("https://pixijs.com/assets/bunny.png");

      // Create a 5x5 grid of bunnies in the container
      for (let i = 0; i < 25; i++) {
        const bunny = new Sprite(texture);
        bunny.x = (i % 5) * 40;
        bunny.y = Math.floor(i / 5) * 40;
        container.addChild(bunny);
      }

      // Move the container to the center
      container.x = app.screen.width / 2;
      container.y = app.screen.height / 2;

      // Center the bunny sprites in local container coordinates
      container.pivot.x = container.width / 2;
      container.pivot.y = container.height / 2;
    },
    enter: async () => {
      // Create and add a container to the stage

      app.stage.addChild(container);
    },
    update: (time) => {
      container.rotation -= 0.01 * time.deltaTime;
    },
  };
});
