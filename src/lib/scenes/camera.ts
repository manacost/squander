import { Scenes, use } from "#lib/core/scene.js";
import { Container, Assets, Sprite, Texture } from "pixi.js";

import { create_input_map } from "#lib/core/input.js";
import { mount_all } from "#lib/core/observable/utils.js";
import { create_ui } from "#lib/ui/ui.svelte.js";
import Camera from "./Camera.svelte";
import { as_draggable, create_viewport } from "#lib/create_viewport.js";
import { app } from "#lib/core/app.js";

export default Scenes.create(async () => {
  const container = new Container();
  let texture: Texture;

  const input = create_input_map({
    move_left: "arrowleft",
    move_right: "arrowright",
    move_up: "arrowup",
    move_down: "arrowdown",
  });

  const camera = create_viewport(
    app,
    {
      worldWidth: 2000,
      worldHeight: 2000,
    },
    as_draggable(),
  );

  const ui = create_ui(Camera, {
    title: "Camera Scene",
    onReset: () => {
      camera.moveCenter(container);
    },
  });

  return {
    name: "camera_demo",
    init: async () => {
      texture = await Assets.load("https://pixijs.com/assets/bunny.png");

      // Create a 5x5 grid of bunnies in the container
      for (let i = 0; i < 25; i++) {
        const bunny = new Sprite(texture);
        bunny.x = (i % 5) * 40;
        bunny.y = Math.floor(i / 5) * 40;
        container.addChild(bunny);
      }

      // Center the bunny sprites in local container coordinates
      container.pivot.x = container.width / 2;
      container.pivot.y = container.height / 2;
      camera.addChild(container);
      camera.moveCenter(container);
    },
    enter: async () => {
      // Create and add a container to the stage

      use(camera.mount());

      use(ui.mount());
      use(
        input.keyboard.on("keydown", (e) => {
          console.log("keydown", e, e.detail.key);
        }),
      );

      use(
        input.on("move_left", () => {
          console.log("input -> move_left");
          //   container.rotation += 2;
        }),
      );

      use(
        input.on("move_right", () => {
          console.log("input -> move_right");
          //   container.rotation += 2;
        }),
      );

      use(
        input.on("move_down", () => {
          console.log("input -> move_down");
          //   container.scale.x *= 0.9;
          //   container.scale.y *= 0.9;
        }),
      );

      use(
        input.on("move_up", () => {
          console.log("input -> move_up");
          //   container.scale.x *= 1.1;
          //   container.scale.y *= 1.1;
        }),
      );

      use(input.subscribe());

      return () => {};
    },
    update: (time) => {
      const px_per_sec = 8 * time.deltaTime;
      if (input.is_down("move_left")) {
        // camera.moveCorner(-1 * px_per_sec, 0);
        // container.rotation -= 0.01 * time.deltaTime;
      } else if (input.is_down("move_right")) {
        // camera.moveCorner(px_per_sec, 0);
        // container.rotation += 0.01 * time.deltaTime;
      }

      if (input.is_down("move_up")) {
        // camera.moveCorner(0, -1 * px_per_sec);
        // container.rotation -= 0.01 * time.deltaTime;
      } else if (input.is_down("move_down")) {
        // camera.moveCorner(0, px_per_sec);
        // container.rotation += 0.01 * time.deltaTime;
      }

      if (input.is_just_pressed("move_up")) {
        // console.log("Just pressed move_up");
        // container.scale.x *= 1.25;
      } else if (input.is_just_pressed("move_down")) {
        // console.log("Just pressed move_down");
        // container.scale.x *= 0.75;
      }
    },
  };
});
