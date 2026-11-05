<script lang="ts">
  import Prism from "prismjs";
  import "prismjs/components/prism-typescript.js";

  type Language = "typescript" | "svelte";
  type Props = { code: string; language?: Language };

  let { code, language = "typescript" }: Props = $props();
  const grammar = $derived(language === "svelte" ? Prism.languages.markup : (Prism.languages.typescript ?? Prism.languages.javascript));
  const highlighted_code = $derived(Prism.highlight(code, grammar, language));
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- Prism returns escaped markup for the trusted code sample. -->
<pre class={`language-${language}`}><code class={`language-${language}`}>{@html highlighted_code}</code></pre>
