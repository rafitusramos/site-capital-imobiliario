import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { POLITICA_ATUALIZADA_EM, TEXTO_CONSENTIMENTO } from "@/lib/legal";

const pagina = readFileSync(
  join(process.cwd(), "app/(site)/politica-de-privacidade/page.tsx"),
  "utf8",
);

describe("consentimento e política (WhatsApp)", () => {
  it("TEXTO_CONSENTIMENTO é a frase exata com o WhatsApp", () => {
    expect(TEXTO_CONSENTIMENTO).toBe(
      "Autorizo o uso dos meus dados para a pré-qualificação de crédito e o encaminhamento às instituições financeiras parceiras, e aceito receber o atendimento da RT Capital Imobiliário pelo WhatsApp.",
    );
  });

  it("a política continua renderizando TEXTO_CONSENTIMENTO", () => {
    expect(pagina).toContain("{TEXTO_CONSENTIMENTO}");
  });

  it("índice e seção 'conversas-no-whatsapp' vêm logo depois do Instagram", () => {
    expect(pagina).toContain('id: "conversas-no-whatsapp"');
    expect(pagina).toContain('<section id="conversas-no-whatsapp">');
    const ig = pagina.indexOf('id: "conversas-no-instagram"');
    const wa = pagina.indexOf('id: "conversas-no-whatsapp"');
    const alt = pagina.indexOf('id: "alteracoes-nesta-politica"');
    expect(ig).toBeGreaterThan(-1);
    expect(wa).toBeGreaterThan(ig);
    expect(alt).toBeGreaterThan(wa);
  });

  it("a seção usa EMAIL_LGPD e não menciona IA", () => {
    const ini = pagina.indexOf('<section id="conversas-no-whatsapp">');
    const fim = pagina.indexOf("</section>", ini);
    const secao = pagina.slice(ini, fim);
    expect(secao).toContain("{EMAIL_LGPD}");
    expect(secao).not.toMatch(/intelig[êe]ncia artificial|\bIA\b/);
  });

  it("a Meta (WhatsApp Business Platform) aparece em compartilhamento e transferência internacional", () => {
    const trecho = (id: string) => {
      const ini = pagina.indexOf(`<section id="${id}">`);
      return pagina.slice(ini, pagina.indexOf("</section>", ini));
    };
    expect(trecho("com-quem-compartilhamos")).toContain("Meta Platforms");
    expect(trecho("transferencia-internacional")).toContain("Meta Platforms");
  });

  it("a retenção do WhatsApp remete à seção 7 e não promete avisos vagos", () => {
    const ini = pagina.indexOf('<section id="conversas-no-whatsapp">');
    const secao = pagina.slice(ini, pagina.indexOf("</section>", ini));
    expect(secao).toContain("seção 7");
    expect(secao).not.toContain("acompanham o seu");
    expect(secao).not.toContain("avisa você sobre o andamento");
    expect(secao.match(/<p>/g)?.length).toBe(2);
  });

  it("a data da política não mudou", () => {
    expect(POLITICA_ATUALIZADA_EM).toBe("13 de novembro de 2026");
  });
});
