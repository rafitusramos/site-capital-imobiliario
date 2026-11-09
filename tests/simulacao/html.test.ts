import { describe, expect, test } from "vitest";
import { CONFIG_SIMULACAO } from "@/lib/simulacao/config";
import { gerarHtmlSimulacao } from "@/lib/simulacao/html";
import { montarSimulacao } from "@/lib/simulacao/regras";
import type { BancoCreditas, DadosCreditas } from "@/lib/simulacao/tipos";

const FONTES = { caslon: "AAA", archivo: "BBB", plex: "CCC", plex500: "DDD" };
function banco(nome: string, o: Partial<BancoCreditas> = {}): BancoCreditas {
  return { nome, taxa: 12, cet: 13, custo_total: 800000, prazo: 420, indexador: "TR", sistema: "SAC", primeira: 3000, ultima: 650, parcelas: [3000, 2900], logo: null, ...o };
}
function html(cliente: string, bancos = [banco("Banco Alfa")], extra: Partial<DadosCreditas> = {}, ref = "RT-2026-0001") {
  const dados: DadosCreditas = { data: "06/11/2026", valor_imovel: 400000, valor_financiamento: 260000, renda_media: 9000, meses: [1, 12], bancos, ...extra };
  return gerarHtmlSimulacao(montarSimulacao(dados, CONFIG_SIMULACAO, { cliente, referencia: ref }), FONTES);
}

describe("gerarHtmlSimulacao", () => {
  test("nome do cliente com HTML, aspas e & é escapado", () => {
    const h = html("<script>alert(1)</script> \"x\" & 'y'");
    expect(h).not.toContain("<script>alert");
    expect(h).toContain("&lt;script&gt;alert(1)&lt;/script&gt; &quot;x&quot; &amp; &#39;y&#39;");
  });
  test("nome de banco e referência escapados", () => {
    const h = html("Maria", [banco("<img src=x onerror=1>")], {}, "<b>ref</b>");
    expect(h).not.toContain("<img src=x");
    expect(h).not.toContain("<b>ref</b>");
  });
  test("logo só entra como data:image/png", () => {
    const ok = html("Maria", [banco("A", { logo: "data:image/png;base64,AAAA" })]);
    expect(ok).toContain('src="data:image/png;base64,AAAA"');
    const mau = html("Maria", [banco("A", { logo: 'javascript:alert(1)" onerror="x' })]);
    expect(mau).not.toContain("javascript:");
  });
  test("duas páginas A4 numeradas", () => {
    const h = html("Maria");
    expect(h.match(/<section class="page">/g)).toHaveLength(2);
    expect(h).toContain("Página 1 de 2");
    expect(h).toContain("Página 2 de 2");
    expect(h).toContain("@page { size:A4; margin:0; }");
  });
  test("seis etapas, a primeira marcada como atual", () => {
    const h = html("Maria");
    expect(h.match(/<li class="[^"]*"><div class="bar">/g)).toHaveLength(6);
    expect(h).toContain("Você está aqui");
    expect(h).toContain("Registro e liberação");
  });
  test("fontes embutidas em base64 e Archivo no lugar de Inter", () => {
    const h = html("Maria");
    expect(h).toContain("base64,BBB");
    expect(h).toContain("font-family:'Archivo'");
    expect(h).not.toContain("Inter");
  });
  test("contato vem do config", () => {
    const h = html("Maria");
    expect(h).toContain("rafael@rtcapitalimobiliario.com.br");
    expect(h).toContain("(19) 99783-4187");
  });
  test("banco fora do comparativo ganha nota de rodapé; sem ele, não", () => {
    expect(html("M", [banco("A"), banco("I", { indexador: "IPCA" })])).toContain("fora do comparativo");
    expect(html("M")).not.toContain("fora do comparativo");
  });
  test("parcela nula aparece como travessão", () => {
    expect(html("M", [banco("A", { parcelas: [3000, null] })])).toContain(">—<");
  });
  test("data e referência no cabeçalho", () => {
    expect(html("M")).toContain("RT-2026-0001 · 06/11/2026");
  });
});
