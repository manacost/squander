declare module "prismjs" {
  type Grammar = Record<string, unknown>;

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
