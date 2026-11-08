import { describe, expect, test } from "vitest";
import { novoLeadAdmin } from "@/lib/email/templates/novo-lead-admin";
import { novoLeadLead } from "@/lib/email/templates/novo-lead-lead";
import { etapaAdmin } from "@/lib/email/templates/etapa-admin";
import { etapaLead, etapasComTextoParaLead } from "@/lib/email/templates/etapa-lead";
import { escaparHtml } from "@/lib/email/templates/base";

const MALICIOSO = `<script>alert("x")</script> & "aspas"`;

describe("escaparHtml", () => {
  test("escapa os cinco caracteres perigosos", () => {
    expect(escaparHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});

describe("novoLeadAdmin", () => {
  const base = {
    nome: "Maria Silva",
    telefone: "(19) 99783-4187",
    email: "maria@example.com",
    origem: "financiamento" as const,
    protocolo: "RT-2026-0001",
    campos: [{ rotulo: "Cidade", valor: "Vinhedo" }],
  };

  test("traz os dados do lead, os campos e o link absoluto do quadro", () => {
    const { assunto, html, texto } = novoLeadAdmin(base);
    expect(assunto).toContain("Maria Silva");
    expect(assunto).toContain("Financiamento");
    for (const trecho of ["(19) 99783-4187", "maria@example.com", "RT-2026-0001", "Cidade", "Vinhedo"]) {
      expect(html).toContain(trecho);
      expect(texto).toContain(trecho);
    }
    expect(html).toContain("https://rtcapitalimobiliario.com.br/admin/crm/financiamento/");
    expect(texto).toContain("https://rtcapitalimobiliario.com.br/admin/crm/financiamento/");
  });

  test("escapa dados do visitante no HTML, mas não no texto puro", () => {
    const { html, texto } = novoLeadAdmin({
      ...base,
      nome: MALICIOSO,
      campos: [{ rotulo: "Obs", valor: MALICIOSO }],
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(texto).toContain(MALICIOSO);
  });
});

describe("novoLeadLead", () => {
  test("confirma com protocolo e próximos passos, sem linguagem de marketing", () => {
    const { assunto, html, texto } = novoLeadLead({ nome: "Maria Silva", origem: "home-equity", protocolo: "RT-1" });
    expect(assunto).toMatch(/recebemos/i);
    expect(html).toContain("RT-1");
    expect(texto).toContain("RT-1");
    expect(texto).toContain("Maria");
    expect(texto).toMatch(/próximos passos/i);
    expect(texto).not.toMatch(/imperdível|oferta|promoção|garant/i);
  });

  test("escapa o nome no HTML", () => {
    const { html } = novoLeadLead({ nome: MALICIOSO, origem: "imoveis", protocolo: "RT-1" });
    expect(html).not.toContain("<script>");
  });
});

describe("etapaAdmin", () => {
  const base = {
    nome: "Maria Silva",
    protocolo: "RT-1",
    origem: "consorcio" as const,
    de: "Criado",
    para: "Apresentação",
    quemMoveu: "Rafael",
  };

  test("mostra de -> para e quem moveu, sem motivo quando não há", () => {
    const { assunto, texto, html } = etapaAdmin(base);
    expect(assunto).toContain("Maria Silva");
    expect(assunto).toContain("Apresentação");
    expect(texto).toContain("Criado");
    expect(texto).toContain("Rafael");
    expect(texto).not.toMatch(/motivo/i);
    expect(html).toContain("https://rtcapitalimobiliario.com.br/admin/crm/consorcio/");
  });

  test("inclui o motivo quando houver, escapado", () => {
    const { html, texto } = etapaAdmin({ ...base, para: "Perdido", motivo: MALICIOSO });
    expect(texto).toContain(MALICIOSO);
    expect(html).not.toContain("<script>");
    expect(html).toMatch(/motivo/i);
  });
});

describe("etapaLead", () => {
  const positivas: Array<[string, string[]]> = [
    ["financiamento", ["simulacao", "pre-aprovacao", "vistoria", "contrato", "ganho"]],
    ["home-equity", ["simulacao", "pre-aprovacao", "vistoria", "contrato", "ganho"]],
    ["consorcio", ["apresentacao", "proposta", "contrato", "ganho"]],
    ["imoveis", ["qualificacao", "visita", "proposta", "contrato", "ganho"]],
  ];
  const casos = positivas.flatMap(([o, es]) => es.map((e) => [o, e] as const));

  test.each(casos)("há texto para %s / %s, com protocolo e sem prometer aprovação", (origem, etapa) => {
    const email = etapaLead({ nome: "Maria Silva", origem: origem as never, etapa: etapa as never, protocolo: "RT-9" });
    expect(email).not.toBeNull();
    expect(email!.texto).toContain("RT-9");
    expect(email!.texto).toContain("Maria");
    expect(email!.texto).not.toMatch(/garant|certeza|crédito aprovado|já está aprovado/i);
    expect(email!.html).toContain("RT-9");
  });

  test("os textos são distintos entre as etapas de um mesmo pipeline", () => {
    const textos = positivas[0][1].map(
      (e) => etapaLead({ nome: "Ana", origem: "financiamento", etapa: e as never, protocolo: "P" })!.assunto,
    );
    expect(new Set(textos).size).toBe(textos.length);
  });

  test.each([["financiamento", "criado"], ["financiamento", "perdido"], ["imoveis", "nao-qualificado"]])(
    "%s / %s não tem texto para o lead",
    (origem, etapa) => {
      expect(etapaLead({ nome: "A", origem: origem as never, etapa: etapa as never, protocolo: "P" })).toBeNull();
    },
  );

  test("etapasComTextoParaLead lista as etapas positivas do pipeline", () => {
    expect(etapasComTextoParaLead("consorcio")).toEqual(["apresentacao", "proposta", "contrato", "ganho"]);
  });

  test("escapa o nome no HTML", () => {
    const e = etapaLead({ nome: MALICIOSO, origem: "financiamento", etapa: "ganho", protocolo: "P" })!;
    expect(e.html).not.toContain("<script>");
  });
});
