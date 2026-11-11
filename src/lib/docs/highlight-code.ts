import Prism from "prismjs";
import "prismjs/components/prism-css.js";
import "prismjs/components/prism-markup.js";
import "prismjs/components/prism-typescript.js";
import "prism-svelte";

export type CodeLanguage = "typescript" | "svelte" | "css" | "html";

Prism.languages.svelte.tag.addInlined("script", "typescript");
const svelte_grammar = Prism.languages.svelte;

export function highlight_code(code: string, language: CodeLanguage): string {
  if (language === "svelte") return Prism.highlight(code, svelte_grammar, language);
  if (language === "css") return Prism.highlight(code, Prism.languages.css ?? Prism.languages.javascript, language);
  if (language === "html") return Prism.highlight(code, Prism.languages.markup, language);
  return Prism.highlight(code, Prism.languages.typescript ?? Prism.languages.javascript, language);
}
