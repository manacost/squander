import { app } from "#lib/core/app.js";
import { create_input_map } from "#lib/core/input.js";
import { Scenes } from "#lib/core/scene.js";
import { create_ui } from "#lib/ui/ui.svelte.js";
import { Container, Application, Graphics } from "pixi.js";
import UI_Test from "#lib/scenes/UI_Test.svelte";

export default Scenes.create(async () => {
  const stage = new Container();
  const obj = new Graphics().rect(0, 0, 200, 100).fill(0xff0000);

  const input = create_input_map({
    move_left: "arrowleft",
    move_right: "arrowright",
    move_up: "arrowup",
    move_down: "arrowdown",
  });

  const ui = create_ui(UI_Test, {
    count: 0,
    title: "Hello World",
    onAdd(count) {
      console.log("onAdd", count);
    },
    onSubtract(count) {
      console.log("onSubtract", count);
    },
    onReset() {
      ui.props.count = 0;
    },
  });

  return {
    name: "test_id",

    enter: () => {
      ui.mount();
      app.stage.addChild(stage);
      stage.addChild(obj);
      const unsubscribe = input.subscribe();
      return unsubscribe;
    },

    exit: () => {
      app.stage.removeChild(stage);
    },

    update: function (t): void {},
  };
});
