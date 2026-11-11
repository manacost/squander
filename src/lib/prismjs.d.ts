declare module "prismjs" {
  type Grammar = Record<string, unknown>;
  type MarkupGrammar = Grammar & {
    tag: {
      addInlined: (tag_name: string, language: string) => void;
    };
  };

  // eslint-disable-next-line @typescript-eslint/naming-convention -- Prism is the external module's public name.
  const Prism: {
    languages: {
      javascript: Grammar;
      css?: Grammar;
      markup: MarkupGrammar;
      svelte: MarkupGrammar;
      typescript?: Grammar;
    };
    highlight: (text: string, grammar: Grammar, language: string) => string;
  };

  export default Prism;
}

declare module "prism-svelte";
