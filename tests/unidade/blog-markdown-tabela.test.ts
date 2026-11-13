import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { componentesMarkdownArtigo } from "@/components/blog/markdown";

function renderizar(md: string): string {
  return renderToStaticMarkup(
    createElement(ReactMarkdown, { remarkPlugins: [remarkGfm], components: componentesMarkdownArtigo }, md),
  );
}

describe("tabela do markdown do artigo", () => {
  const md = "| A | B |\n|---|---|\n| 1 | 2 |\n";

  it("sai dentro do invólucro rolável, alcançável pelo teclado", () => {
    const html = renderizar(md);
    expect(html).toMatch(
      /^<div class="tabela-rolagem" role="region" aria-label="Tabela" tabindex="0"><table>/,
    );
    expect(html).toContain("<td>1</td>");
    expect(html.endsWith("</table></div>")).toBe(true);
  });

  it("não vaza o nó mdast como atributo", () => {
    expect(renderizar(md)).not.toMatch(/node=/);
  });

  it("texto sem tabela não ganha invólucro", () => {
    expect(renderizar("Parágrafo simples.")).toBe("<p>Parágrafo simples.</p>");
  });
});
