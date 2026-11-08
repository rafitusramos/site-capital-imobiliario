import { describe, expect, test } from "vitest";
import { FILTROS_INICIAIS } from "@/lib/crm/filtros";
import { filtrosDaQuery, filtrosParaQuery, filtrosAtivos } from "@/lib/crm/filtros-url";

const UUID = "44444444-4444-4444-8444-444444444444";

describe("filtrosDaQuery", () => {
  test("query vazia devolve os filtros iniciais", () => {
    expect(filtrosDaQuery(new URLSearchParams(""))).toEqual(FILTROS_INICIAIS);
  });

  test("lê todos os parâmetros", () => {
    const q = new URLSearchParams(
      `q=jose&resp=${UUID}&tag=vip&fav=1&atrasados=1&parados=1&sem_lembrete=1&de=2026-07-01&ate=2026-07-31&ordem=maior-valor`,
    );
    expect(filtrosDaQuery(q)).toEqual({
      busca: "jose",
      responsavelId: UUID,
      tag: "vip",
      somenteFavoritos: true,
      somenteAtrasados: true,
      somenteParados: true,
      semLembrete: true,
      criadoDe: "2026-07-01",
      criadoAte: "2026-07-31",
      ordenacao: "maior-valor",
    });
  });

  test("resp=sem vira null (sem responsável)", () => {
    expect(filtrosDaQuery(new URLSearchParams("resp=sem")).responsavelId).toBeNull();
  });

  test("valores inválidos são ignorados em vez de quebrar a página", () => {
    const f = filtrosDaQuery(new URLSearchParams("resp=nao-e-uuid&de=ontem&ate=2026-02-31&ordem=xyz&fav=talvez"));
    expect(f).toEqual(FILTROS_INICIAIS);
  });
});

describe("filtrosParaQuery", () => {
  test("filtros iniciais não geram parâmetro nenhum", () => {
    expect(filtrosParaQuery(new URLSearchParams(), FILTROS_INICIAIS).toString()).toBe("");
  });

  test("ida e volta preserva o estado", () => {
    const estado = {
      ...FILTROS_INICIAIS,
      busca: "ana costa",
      responsavelId: null,
      somenteParados: true,
      semLembrete: true,
      criadoDe: "2026-07-01",
      ordenacao: "mais-recente" as const,
    };
    expect(filtrosDaQuery(filtrosParaQuery(new URLSearchParams(), estado))).toEqual(estado);
  });

  test("preserva parâmetros que não são filtro (lead, novo) e troca os de filtro", () => {
    const atual = new URLSearchParams("lead=abc&fav=1&q=velho");
    const novo = filtrosParaQuery(atual, { ...FILTROS_INICIAIS, busca: "novo" });
    expect(novo.get("lead")).toBe("abc");
    expect(novo.get("q")).toBe("novo");
    expect(novo.has("fav")).toBe(false);
  });
});

describe("filtrosAtivos", () => {
  test("ordenação sozinha não conta como filtro ativo", () => {
    expect(filtrosAtivos({ ...FILTROS_INICIAIS, ordenacao: "maior-valor" })).toBe(false);
  });
  test("qualquer filtro novo conta", () => {
    expect(filtrosAtivos({ ...FILTROS_INICIAIS, somenteParados: true })).toBe(true);
    expect(filtrosAtivos({ ...FILTROS_INICIAIS, semLembrete: true })).toBe(true);
    expect(filtrosAtivos({ ...FILTROS_INICIAIS, criadoAte: "2026-07-01" })).toBe(true);
  });
});
