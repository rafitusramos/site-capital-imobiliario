import { describe, expect, it } from "vitest";
import { ETAPAS_POR_TIPO } from "@/lib/crm/etapas";
import { etapasComTextoParaLead } from "@/lib/email/templates/etapa-lead";
import { linkDoNumeroOficial, respostaFixa } from "@/lib/whatsapp/mensagens";
import { payloadDeTemplate, TEMPLATES, templateDaEtapa, templateDeConfirmacao } from "@/lib/whatsapp/templates";
import type { LeadTipoSlug } from "@/types/database";

const TIPOS = Object.keys(ETAPAS_POR_TIPO) as LeadTipoSlug[];

describe("registro de templates", () => {
  it("variáveis contíguas e parametros confere", () => {
    for (const t of Object.values(TEMPLATES)) {
      const n = [...t.corpo.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
      const unicos = [...new Set(n)].sort((a, b) => a - b);
      expect(unicos).toEqual(Array.from({ length: unicos.length }, (_, i) => i + 1));
      expect(t.parametros).toBe(unicos.length);
    }
  });
  it("nomes válidos e chave igual ao nome", () => {
    for (const [k, t] of Object.entries(TEMPLATES)) {
      expect(t.nome).toBe(k);
      expect(k).toMatch(/^[a-z0-9_]+$/);
    }
  });
  it("copy neutra: sem promessa, promoção ou taxa", () => {
    for (const t of Object.values(TEMPLATES)) {
      expect(t.corpo).not.toMatch(/aprovad|garantid|%|taxa|parcela|promo|desconto|!!/i);
    }
  });
  it("corpo não começa nem termina com variável e cita o protocolo", () => {
    for (const t of Object.values(TEMPLATES)) {
      expect(t.corpo).not.toMatch(/^\{\{/);
      expect(t.corpo).not.toMatch(/\}\}[.!?\s]*$/);
      expect(t.corpo).toContain("protocolo");
    }
  });
  it("etapa sem texto devolve null; imóvel visita tem nome fixo", () => {
    expect(templateDaEtapa("financiamento", "criado")).toBeNull();
    expect(templateDaEtapa("imoveis", "visita")?.nome).toBe("rt_etapa_imovel_visita");
  });
  it("toda etapa com texto de e-mail tem template", () => {
    for (const tipo of TIPOS) {
      for (const etapa of etapasComTextoParaLead(tipo)) {
        expect(templateDaEtapa(tipo, etapa), `${tipo}/${etapa}`).not.toBeNull();
      }
    }
  });
  it("confirmação por tipo", () => {
    expect(templateDeConfirmacao("imoveis").nome).toBe("rt_confirmacao_imovel");
    expect(templateDeConfirmacao("financiamento").nome).toBe("rt_confirmacao_credito");
  });
});

describe("payloadDeTemplate", () => {
  it("monta o corpo da Graph", () => {
    expect(payloadDeTemplate(TEMPLATES.rt_confirmacao_credito, ["Ana", "RT-1"])).toEqual({
      type: "template",
      template: {
        name: "rt_confirmacao_credito",
        language: { code: "pt_BR" },
        components: [{ type: "body", parameters: [{ type: "text", text: "Ana" }, { type: "text", text: "RT-1" }] }],
      },
    });
  });
  it("lança com aridade errada", () => {
    expect(() => payloadDeTemplate(TEMPLATES.rt_confirmacao_credito, ["Ana"])).toThrow();
  });
});

describe("mensagens fixas", () => {
  it("link do número oficial", () => {
    expect(linkDoNumeroOficial("(19) 99999-8888")).toBe("https://wa.me/5519999998888");
    expect(linkDoNumeroOficial("abc")).toBeNull();
  });
  it("resposta com e sem link", () => {
    expect(respostaFixa("https://wa.me/5519999998888")).toContain("https://wa.me/5519999998888");
    expect(respostaFixa(null)).toContain("responda ao nosso e-mail");
  });
});
