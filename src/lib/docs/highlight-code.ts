import Prism from "prismjs";
import "prismjs/components/prism-typescript.js";
import "prism-svelte";

export type CodeLanguage = "typescript" | "svelte";

Prism.languages.svelte.tag.addInlined("script", "typescript");
const svelte_grammar = Prism.languages.svelte;

export function highlight_code(code: string, language: CodeLanguage): string {
  const grammar = language === "svelte" ? svelte_grammar : (Prism.languages.typescript ?? Prism.languages.javascript);
  return Prism.highlight(code, grammar, language);
}
