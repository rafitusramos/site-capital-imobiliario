import { describe, expect, test } from "vitest";
import {
  aplicarFiltros,
  buscarLeads,
  filtrarAtrasados,
  filtrarFavoritos,
  filtrarPorResponsavel,
  filtrarPorTag,
  ordenarLeads,
  type LeadQuadroCRM,
} from "@/lib/crm/filtros";

/**
 * Fixture completo de propósito: `LeadQuadroCRM` é o tipo canônico derivado
 * de `vw_leads_crm` (lib/queries/admin-crm.ts) e carrega todas as colunas da
 * view, não só as que lib/crm/filtros.ts usa — omitir uma reprovaria sob o
 * tipo. Cada teste sobrescreve só os campos que importam para o caso.
 */
function lead(parcial: Partial<LeadQuadroCRM> & Pick<LeadQuadroCRM, "id">): LeadQuadroCRM {
  return {
    protocolo: "RT-2026-0001",
    nome: "Lead Padrão",
    email: "lead@example.com",
    telefone: "19999998888",
    cpf: null,
    tipo: "financiamento",
    tipo_label: "Financiamento",
    status: "criado",
    etapa_label: "Criado",
    cor_bg: "#E9E5DA",
    cor_texto: "#4A4437",
    etapa_ordem: 1,
    is_final: false,
    is_ganho: false,
    exige_motivo: false,
    sla_dias: 1,
    origem: null,
    pagina_url: null,
    imovel_id: null,
    imovel_titulo: null,
    corretor_id: null,
    corretor_nome: null,
    favorito: false,
    motivo_perda: null,
    utm: null,
    created_at: "2026-01-01T12:00:00.000Z",
    status_alterado_em: "2026-01-01T12:00:00.000Z",
    updated_at: "2026-01-01T12:00:00.000Z",
    dias_na_etapa: 0,
    ultima_interacao_em: null,
    proximo_lembrete_em: null,
    proximo_lembrete_desc: null,
    tags: [],
    total_interacoes: 0,
    valor_negocio: null,
    ...parcial,
  };
}

const AGORA = "2026-07-15T17:00:00.000Z";

describe("buscarLeads", () => {
  const leads = [
    lead({ id: "1", nome: "José da Silva", email: "jose@example.com", protocolo: "RT-2026-0001" }),
    lead({ id: "2", nome: "Marina Albuquerque", email: "marina@empresa.com.br", protocolo: "RT-2026-0014" }),
    lead({ id: "3", nome: "Ana Costa", email: "ana@example.com", telefone: "19998124477", protocolo: "RT-2026-0020" }),
  ];

  test("termo vazio devolve a lista inteira", () => {
    expect(buscarLeads(leads, "")).toEqual(leads);
    expect(buscarLeads(leads, "   ")).toEqual(leads);
  });

  test("busca por nome é insensível a acento e caixa", () => {
    expect(buscarLeads(leads, "jose")).toEqual([leads[0]]);
    expect(buscarLeads(leads, "JOSÉ")).toEqual([leads[0]]);
    expect(buscarLeads(leads, "josé")).toEqual([leads[0]]);
  });

  test("busca por parte do e-mail", () => {
    expect(buscarLeads(leads, "empresa.com.br")).toEqual([leads[1]]);
  });

  test("busca por protocolo", () => {
    expect(buscarLeads(leads, "0020")).toEqual([leads[2]]);
  });

  test("busca por telefone ignora máscara", () => {
    expect(buscarLeads(leads, "99812-4477")).toEqual([leads[2]]);
    expect(buscarLeads(leads, "19998124477")).toEqual([leads[2]]);
  });

  test("sem correspondência devolve lista vazia", () => {
    expect(buscarLeads(leads, "não existe ninguém assim")).toEqual([]);
  });
});

describe("filtrarPorResponsavel", () => {
  const leads = [
    lead({ id: "1", corretor_id: "corretor-a" }),
    lead({ id: "2", corretor_id: "corretor-b" }),
    lead({ id: "3", corretor_id: null }),
  ];

  test("undefined não filtra (mostra todos)", () => {
    expect(filtrarPorResponsavel(leads, undefined)).toEqual(leads);
  });

  test("null filtra 'sem responsável'", () => {
    expect(filtrarPorResponsavel(leads, null)).toEqual([leads[2]]);
  });

  test("id específico filtra só aquele responsável", () => {
    expect(filtrarPorResponsavel(leads, "corretor-a")).toEqual([leads[0]]);
  });
});

describe("filtrarPorTag", () => {
  const leads = [
    lead({ id: "1", tags: ["capital-de-giro", "urgente"] }),
    lead({ id: "2", tags: ["urgente"] }),
    lead({ id: "3", tags: [] }),
  ];

  test("sem tag não filtra", () => {
    expect(filtrarPorTag(leads, undefined)).toEqual(leads);
  });

  test("filtra leads que têm a tag", () => {
    expect(filtrarPorTag(leads, "capital-de-giro")).toEqual([leads[0]]);
    expect(filtrarPorTag(leads, "urgente")).toEqual([leads[0], leads[1]]);
  });
});

describe("filtrarFavoritos", () => {
  const leads = [lead({ id: "1", favorito: true }), lead({ id: "2", favorito: false })];

  test("false/undefined não filtra", () => {
    expect(filtrarFavoritos(leads, false)).toEqual(leads);
    expect(filtrarFavoritos(leads, undefined)).toEqual(leads);
  });

  test("true filtra só favoritos", () => {
    expect(filtrarFavoritos(leads, true)).toEqual([leads[0]]);
  });
});

describe("filtrarAtrasados", () => {
  const leads = [
    lead({ id: "1", proximo_lembrete_em: "2026-07-10T12:00:00.000Z" }), // passado
    lead({ id: "2", proximo_lembrete_em: "2026-08-01T12:00:00.000Z" }), // futuro
    lead({ id: "3", proximo_lembrete_em: null }), // sem lembrete
  ];

  test("desligado não filtra", () => {
    expect(filtrarAtrasados(leads, false, AGORA)).toEqual(leads);
  });

  test("ligado mostra só quem tem lembrete no passado", () => {
    expect(filtrarAtrasados(leads, true, AGORA)).toEqual([leads[0]]);
  });

  test("lead sem lembrete nunca é 'atrasado'", () => {
    expect(filtrarAtrasados(leads, true, AGORA)).not.toContainEqual(leads[2]);
  });
});

describe("aplicarFiltros", () => {
  test("combina busca, responsável, tag, favorito e atrasado", () => {
    const leads = [
      lead({
        id: "1",
        nome: "Marina Albuquerque",
        corretor_id: "corretor-a",
        tags: ["urgente"],
        favorito: true,
        proximo_lembrete_em: "2026-07-10T12:00:00.000Z",
      }),
      lead({ id: "2", nome: "Marina Ferreira", corretor_id: "corretor-a", tags: ["urgente"], favorito: false }),
      lead({ id: "3", nome: "João Marina", corretor_id: "corretor-b", tags: ["urgente"], favorito: true }),
    ];

    const resultado = aplicarFiltros(
      leads,
      { busca: "marina", responsavelId: "corretor-a", tag: "urgente", somenteFavoritos: true, somenteAtrasados: true },
      AGORA,
    );
    expect(resultado).toEqual([leads[0]]);
  });

  test("sem filtros devolve a lista inteira", () => {
    const leads = [lead({ id: "1" }), lead({ id: "2" })];
    expect(aplicarFiltros(leads, {}, AGORA)).toEqual(leads);
  });
});

describe("ordenarLeads", () => {
  test("'mais-recente' ordena por created_at decrescente", () => {
    const leads = [
      lead({ id: "1", created_at: "2026-01-01T00:00:00.000Z" }),
      lead({ id: "2", created_at: "2026-03-01T00:00:00.000Z" }),
      lead({ id: "3", created_at: "2026-02-01T00:00:00.000Z" }),
    ];
    expect(ordenarLeads(leads, "mais-recente").map((l) => l.id)).toEqual(["2", "3", "1"]);
  });

  test("'maior-valor' ordena por valor_negocio decrescente, nulos por último", () => {
    const leads = [
      lead({ id: "1", valor_negocio: 100 }),
      lead({ id: "2", valor_negocio: null }),
      lead({ id: "3", valor_negocio: 500 }),
    ];
    expect(ordenarLeads(leads, "maior-valor").map((l) => l.id)).toEqual(["3", "1", "2"]);
  });

  test("'proximo-lembrete' ordena por data crescente, sem lembrete por último", () => {
    const leads = [
      lead({ id: "1", proximo_lembrete_em: "2026-08-01T00:00:00.000Z" }),
      lead({ id: "2", proximo_lembrete_em: null }),
      lead({ id: "3", proximo_lembrete_em: "2026-07-20T00:00:00.000Z" }),
    ];
    expect(ordenarLeads(leads, "proximo-lembrete").map((l) => l.id)).toEqual(["3", "1", "2"]);
  });

  test("'tempo-na-etapa' ordena por dias decrescente usando o mapa auxiliar, sem entrada por último", () => {
    const leads = [
      lead({ id: "1", dias_na_etapa: null }),
      lead({ id: "2", dias_na_etapa: null }),
      lead({ id: "3", dias_na_etapa: null }),
    ];
    const dias = { "1": 2, "2": 15 };
    expect(ordenarLeads(leads, "tempo-na-etapa", dias).map((l) => l.id)).toEqual(["2", "1", "3"]);
  });

  test("'tempo-na-etapa' sem mapa auxiliar usa dias_na_etapa do próprio lead (vw_leads_crm)", () => {
    const leads = [
      lead({ id: "1", dias_na_etapa: 2 }),
      lead({ id: "2", dias_na_etapa: 15 }),
      lead({ id: "3", dias_na_etapa: null }),
    ];
    expect(ordenarLeads(leads, "tempo-na-etapa").map((l) => l.id)).toEqual(["2", "1", "3"]);
  });

  test("não modifica a lista original (devolve cópia)", () => {
    const leads = [lead({ id: "1", created_at: "2026-01-01T00:00:00.000Z" }), lead({ id: "2", created_at: "2026-02-01T00:00:00.000Z" })];
    const original = [...leads];
    ordenarLeads(leads, "mais-recente");
    expect(leads).toEqual(original);
  });
});
