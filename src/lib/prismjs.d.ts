declare module "prismjs" {
  type Grammar = Record<string, unknown>;

  // eslint-disable-next-line @typescript-eslint/naming-convention -- Prism is the external module's public name.
  const Prism: {
    languages: {
      javascript: Grammar;
      markup: Grammar;
      typescript?: Grammar;
    };
    highlight: (text: string, grammar: Grammar, language: string) => string;
  };

  export default Prism;
}
