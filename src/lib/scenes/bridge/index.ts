import { Scenes } from "#lib/core/scene.js";
import { create_ui } from "#lib/ui/ui.svelte.js";

import Bridge from "./Bridge.svelte";

export default Scenes.create(async () => {
  const ui = create_ui(Bridge, {
    count: 10,
    title: "Hello from Scene",
    mouse: { x: 0, y: 0 },
    onMouseMove(mouse) {
      ui.props.mouse = mouse;
    },
    onClick() {
      console.log("UI click received in scene");
    },
  });

  return {
    name: "bridge_scene",
    enter: () => {
      return ui.mount();
    },
    update: (t) => {},
  };
});
