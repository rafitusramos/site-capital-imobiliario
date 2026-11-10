import { NEGOCIO_NODE } from "@/lib/seo/negocio";
import { CIDADES_ATENDIDAS, SITE_URL } from "@/lib/site";
import { normalizarTexto } from "@/lib/imoveis/seo";

// /llms.txt (proposta llmstxt.org). Construtor puro: a rota
// app/llms.txt/route.ts lê o banco e chama montarLlmsTxt. Travado em
// tests/unidade/llms.test.ts.

export interface ArtigoLlms {
  titulo: string;
  slug: string;
  resumo: string | null;
}

export interface ImovelLlms {
  titulo: string;
  slug: string;
  tipo: string | null;
  cidade: string | null;
}

export interface DadosLlms {
  artigos: ArtigoLlms[];
  imoveis: ImovelLlms[];
}

const limpar = (t: string) => normalizarTexto(t);
// Texto de link em Markdown não pode conter colchetes.
const rotulo = (t: string) => limpar(t).replace(/[[\]]/g, "");

function item(titulo: string, caminho: string, nota?: string | null): string {
  const base = `- [${rotulo(titulo)}](${SITE_URL}${caminho})`;
  const n = nota ? limpar(nota) : "";
  return n ? `${base}: ${n}` : base;
}

function cidadesPorExtenso(): string {
  const c = [...CIDADES_ATENDIDAS];
  return c.length > 1 ? `${c.slice(0, -1).join(", ")} e ${c[c.length - 1]}` : c.join("");
}

export function montarLlmsTxt({ artigos, imoveis }: DadosLlms): string {
  const partes: string[] = [
    `# ${NEGOCIO_NODE.name}`,
    `> ${limpar(NEGOCIO_NODE.description)}`,
    `Correspondente bancário e corretor de imóveis (CRECI-SP 283020-F) em Vinhedo/SP, atendendo ${cidadesPorExtenso()}. Contato: telefone ${NEGOCIO_NODE.telephone}, e-mail ${NEGOCIO_NODE.email}.`,
    [
      "## Serviços",
      item(
        "Financiamento imobiliário",
        "/financiamento/",
        "Financiamento imobiliário SBPE com cotação em vários bancos, simulador de parcelas e análise sem custo."
      ),
      item(
        "Home equity",
        "/home_equity/",
        "Crédito com garantia de imóvel, com simulador e comparação entre instituições."
      ),
    ].join("\n"),
    ["## Sobre", item("Sobre Rafael Teixeira", "/sobre/", "Quem é o corretor e correspondente bancário e como é o atendimento.")].join("\n"),
  ];

  if (artigos.length > 0) {
    partes.push(
      ["## Artigos", ...artigos.map((a) => item(a.titulo, `/blog/${a.slug}/`, a.resumo))].join("\n")
    );
  }

  if (imoveis.length > 0) {
    partes.push(
      [
        "## Imóveis",
        ...imoveis.map((i) => {
          const tipo = i.tipo ? limpar(i.tipo) : "";
          const cidade = i.cidade ? limpar(i.cidade) : "";
          const nota = tipo && cidade ? `${tipo} em ${cidade}` : tipo || cidade;
          return item(i.titulo, `/imoveis/${i.slug}/`, nota);
        }),
      ].join("\n")
    );
  }

  partes.push(
    [
      "## Opcional",
      item("Política de privacidade", "/politica-de-privacidade/"),
      item("Termos de uso", "/termos-de-uso/"),
    ].join("\n")
  );

  return partes.join("\n\n") + "\n";
}
