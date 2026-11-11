import type { Components } from "react-markdown";

/**
 * Componentes do ReactMarkdown no corpo do artigo.
 *
 * Tabela larga (4 ou 5 colunas com valores em R$) não cabe nos ~312px de texto
 * de um celular de 360px: sem contenção ela alargava a PÁGINA inteira, que
 * ganhava rolagem horizontal. O invólucro `.tabela-rolagem` rola só a tabela.
 *
 * Não é `display:block` na própria `<table>`: isso tira o papel de tabela no
 * Safari/VoiceOver. `role="region"` + `aria-label` + `tabIndex={0}` deixam a
 * área rolável alcançável e rolável pelo teclado (WCAG 2.1.1).
 */
export const componentesMarkdownArtigo: Components = {
  // `node` é o nó mdast: separado para não ir ao DOM como atributo.
  table: ({ node, ...props }) => (
    <div className="tabela-rolagem" role="region" aria-label="Tabela" tabIndex={0}>
      <table {...props} />
    </div>
  ),
};
