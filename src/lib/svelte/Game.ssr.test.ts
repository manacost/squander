import { render } from "svelte/server";
import { describe, expect, it } from "vitest";
import Game from "./Game.svelte";

describe("[scene-ui] Game SSR", () => {
  it("renders the canvas and private scene UI layer without running onReady", () => {
    const result = render(Game, {
      props: {
        onReady: () => {
          throw new Error("onReady must not run during SSR");
        },
      },
    });

    expect(result.body).toContain("<canvas");
    expect(result.body).toContain("scene-ui-layer");
  });
});
