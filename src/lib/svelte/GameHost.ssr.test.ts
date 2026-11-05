import { render } from "svelte/server";
import { describe, expect, it } from "vitest";
import GameHost from "./GameHost.svelte";

describe("[svelte-bridge] GameHost SSR", () => {
  it("renders the loading snapshot without browser globals", () => {
    const result = render(GameHost, {
      props: {
        initial_state: { score: 7 },
        commands: { reset: () => undefined },
        create: () => {
          throw new Error("create must not run during SSR");
        },
      },
    });

    expect(result.body).toContain("<canvas></canvas>");
  });
});
