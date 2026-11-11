import { describe, expect, it } from "vitest";
import { highlight_code } from "./highlight-code.js";

describe("highlight_code", () => {
  it("highlights TypeScript inside Svelte script blocks", () => {
    const highlighted_code = highlight_code(
      `<script lang="ts">\nconst ready: Promise<void> = async () => {};\n</script>\n\n<Game onReady={ready} />`,
      "svelte",
    );

    expect(highlighted_code).toContain('<span class="token keyword">const</span>');
    expect(highlighted_code).toContain('<span class="token builtin">Promise</span>');
    expect(highlighted_code).toContain('<span class="token punctuation">&lt;</span>Game');
  });

  it("highlights CSS and HTML samples", () => {
    expect(highlight_code(":root { color: red; }", "css")).toContain('class="token selector"');
    expect(highlight_code("<button>Start</button>", "html")).toContain('class="token tag"');
  });
});
