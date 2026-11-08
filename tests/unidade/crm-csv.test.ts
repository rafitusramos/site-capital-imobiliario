import { describe, expect, test } from "vitest";
import { escaparCelula, montarCsv, csvDoQuadro, BOM } from "@/lib/crm/csv";
import type { LeadQuadroCRM } from "@/lib/queries/admin-crm";

describe("escaparCelula", () => {
  test("texto simples passa intacto", () => {
    expect(escaparCelula("Maria")).toBe("Maria");
  });
  test("null e undefined viram vazio", () => {
    expect(escaparCelula(null)).toBe("");
    expect(escaparCelula(undefined)).toBe("");
  });
  test("separador ; obriga aspas", () => {
    expect(escaparCelula("a;b")).toBe('"a;b"');
  });
  test("aspas são dobradas e o campo vai entre aspas", () => {
    expect(escaparCelula('disse "oi"')).toBe('"disse ""oi"""');
  });
  test("quebra de linha obriga aspas", () => {
    expect(escaparCelula("linha1\nlinha2")).toBe('"linha1\nlinha2"');
    expect(escaparCelula("a\r\nb")).toBe('"a\r\nb"');
  });
  test("fórmula de planilha é neutralizada com apóstrofo", () => {
    expect(escaparCelula("=SOMA(A1)")).toBe("'=SOMA(A1)");
    expect(escaparCelula("+55 19 99999")).toBe("'+55 19 99999");
    expect(escaparCelula("@x")).toBe("'@x");
  });
  test("número negativo de verdade não é tratado como fórmula", () => {
    expect(escaparCelula(-5)).toBe("-5");
  });
  test("número usa vírgula decimal e não tem separador de milhar", () => {
    expect(escaparCelula(1234567.5)).toBe("1234567,5");
    expect(escaparCelula(300000)).toBe("300000");
  });
  test("boolean vira Sim/Não", () => {
    expect(escaparCelula(true)).toBe("Sim");
    expect(escaparCelula(false)).toBe("Não");
  });
});

describe("montarCsv", () => {
  test("começa com BOM, separa por ; e termina linhas com CRLF", () => {
    const csv = montarCsv(["A", "B"], [["1", "2"], ["x;y", "z"]]);
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.slice(BOM.length)).toBe('A;B\r\n1;2\r\n"x;y";z\r\n');
  });
  test("sem linhas devolve só o cabeçalho", () => {
    expect(montarCsv(["A"], []).slice(BOM.length)).toBe("A\r\n");
  });
});

function lead(p: Partial<LeadQuadroCRM>): LeadQuadroCRM {
  return {
    id: "1", protocolo: "RT-2026-0001", nome: 'Maria; "Mimi" Souza', email: "m@x.com", telefone: "19999998888",
    cpf: null, tipo: "financiamento", tipo_label: "Financiamento", status: "criado", etapa_label: "Criado",
    cor_bg: "", cor_texto: "", etapa_ordem: 1, is_final: false, is_ganho: false, exige_motivo: false, sla_dias: 1,
    origem: null, pagina_url: null, imovel_id: null, imovel_titulo: null, corretor_id: null, corretor_nome: "Rafael",
    favorito: true, motivo_perda: null, utm: null,
    created_at: "2026-07-15T02:30:00.000Z", status_alterado_em: "2026-07-15T02:30:00.000Z", updated_at: "2026-07-15T02:30:00.000Z",
    dias_na_etapa: 3, ultima_interacao_em: null, proximo_lembrete_em: null, proximo_lembrete_desc: null,
    tags: ["vip", "urgente"], total_interacoes: 0, valor_negocio: 450000.5, ...p,
  };
}

describe("csvDoQuadro", () => {
  test("cabeçalho em português e uma linha por lead", () => {
    const csv = csvDoQuadro([lead({})]).slice(BOM.length);
    const [cab, linhaBruta] = csv.split("\r\n");
    // Versões de ICU divergem entre "14/07/2026 23:30" e "14/07/2026, 23:30".
    const linha = linhaBruta.replace(/(\d{4}), (\d{2}:)/g, "$1 $2");
    expect(cab).toBe(
      "Protocolo;Nome;E-mail;Telefone;Origem;Etapa;Responsável;Valor do negócio;Tags;Favorito;Dias na etapa;Próximo lembrete;Criado em;Atualizado em",
    );
    expect(linha).toBe(
      'RT-2026-0001;"Maria; ""Mimi"" Souza";m@x.com;19999998888;Financiamento;Criado;Rafael;450000,5;vip, urgente;Sim;3;;14/07/2026 23:30;14/07/2026 23:30',
    );
  });
  test("sem responsável e sem valor ficam vazios", () => {
    const linha = csvDoQuadro([lead({ corretor_nome: null, valor_negocio: null, favorito: false })]).split("\r\n")[1];
    expect(linha).toContain(";Criado;;;vip, urgente;Não;");
  });
});
