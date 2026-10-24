import { app } from "#lib/core/app.js";
import { mount_all } from "#lib/core/observable/utils.js";
import { Scenes } from "#lib/core/scene.js";
import UI_Test from "../scenes/UI_Test.svelte";
import { create_ui } from "#lib/ui/ui.svelte.ts";
import { Assets, Container, Graphics, Sprite, Text, type Texture } from "pixi.js";

export default Scenes.create(async () => {
  const container = new Container();

  const basicText = new Text({ text: "" });

  const ui = create_ui(UI_Test, {
    title: "UI Test",
    count: 4,
    onCount(count) {
      basicText.text = `Renderer count: ${count}`;
    },
    onReset() {
      ui.props.count = 0;
    },
  });

  return {
    name: "ui_test",
    update: (time) => {
      container.rotation -= 0.01 * time.deltaTime;
    },
    enter: () => {
      app.stage.addChild(container);

      const unsub = mount_all(ui.mount());

      return () => {
        unsub();
        app.stage.removeChild(container);
      };
    },
    init: async () => {
      container.addChild(basicText);
      basicText.x = 0;
      basicText.y = -50;
      const texture = await Assets.load<Texture>("https://pixijs.com/assets/bunny.png");

      // Create a 5x5 grid of bunnies in the container
      for (let i = 0; i < 25; i++) {
        const bunny = new Sprite(texture);
        bunny.x = (i % 5) * 40;
        bunny.y = Math.floor(i / 5) * 40;
        container.addChild(bunny);
      }

      // Center the bunny sprites in local container coordinates
      container.pivot.x = container.width / 2;
      container.pivot.y = container.width / 2;

      // Move the container to the center
      container.x = app.screen.width / 2;
      container.y = app.screen.height / 2;
    },
  };
});
