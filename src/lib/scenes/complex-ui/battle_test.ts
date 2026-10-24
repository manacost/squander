import { Scenes } from "#lib/core/scene.js";
import { battle_system } from "./instance.js";
import { wait } from "./utils.js";

export default Scenes.create(async () => {
  return {
    name: "battle_test",
    enter: async () => {
      const looping = true; // currently this endlessly loops

      while (looping) {
        console.log("battle_test: enter");
        battle_system.random_foes();

        await battle_system.start_battle();
        await battle_system.outcome();
        await wait(5000);
      }
    },
    update(_t) {},
  };
});
