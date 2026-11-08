<script lang="ts">
  import { highlight_code, type CodeLanguage } from "./highlight-code.js";

  type Props = { code: string; language?: CodeLanguage };

  let { code, language = "typescript" }: Props = $props();
  const highlighted_code = $derived(highlight_code(code, language));
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- Prism returns escaped markup for the trusted code sample. -->
<pre class={`language-${language}`}><code class={`language-${language}`}>{@html highlighted_code}</code></pre>
