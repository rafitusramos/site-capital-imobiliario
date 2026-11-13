import { describe, expect, test } from "vitest";
import {
  dataDeModificacao,
  dataDeRevisaoVisivel,
  diaDePublicacao,
  formatarDataRevisao,
  revisaoCoerente,
} from "@/lib/blog/revisao";

const PUBLICADO = "2026-11-10T12:00:00+00:00"; // 09h em São Paulo, dia 10
const ATUALIZADO = "2026-12-20T12:00:00+00:00";

function post(extra: Record<string, unknown> = {}) {
  return { published_at: PUBLICADO, updated_at: ATUALIZADO, ...extra } as {
    published_at: string | null;
    updated_at: string;
    revisado_em?: string | null;
  };
}

describe("diaDePublicacao", () => {
  test("usa o dia de São Paulo, não o de UTC", () => {
    // 01h UTC do dia 11 ainda é noite do dia 10 em São Paulo.
    expect(diaDePublicacao("2026-11-11T01:00:00+00:00")).toBe("2026-11-10");
    expect(diaDePublicacao(PUBLICADO)).toBe("2026-11-10");
  });
  test("nulo ou inválido devolve null", () => {
    expect(diaDePublicacao(null)).toBeNull();
    expect(diaDePublicacao("lixo")).toBeNull();
  });
});

describe("dataDeRevisaoVisivel", () => {
  test("revisado_em posterior à publicação aparece", () => {
    expect(dataDeRevisaoVisivel(post({ revisado_em: "2026-11-11" }))).toBe("2026-11-11");
  });
  test("no mesmo dia da publicação não aparece", () => {
    expect(dataDeRevisaoVisivel(post({ revisado_em: "2026-11-10" }))).toBeNull();
  });
  test("anterior à publicação não aparece", () => {
    expect(dataDeRevisaoVisivel(post({ revisado_em: "2026-11-09" }))).toBeNull();
  });
  test("null e undefined (coluna ainda inexistente) valem o mesmo", () => {
    expect(dataDeRevisaoVisivel(post({ revisado_em: null }))).toBeNull();
    expect(dataDeRevisaoVisivel(post())).toBeNull();
  });
  test("updated_at nunca vira revisão", () => {
    expect(dataDeRevisaoVisivel(post({ revisado_em: null }))).toBeNull();
  });
  test("formato inválido não aparece", () => {
    expect(dataDeRevisaoVisivel(post({ revisado_em: "11/11/2026" }))).toBeNull();
  });
  test("sem published_at (rascunho) aparece, pois não há o que comparar", () => {
    expect(dataDeRevisaoVisivel(post({ published_at: null, revisado_em: "2026-11-11" }))).toBe(
      "2026-11-11",
    );
  });
});

describe("dataDeModificacao", () => {
  test("revisado_em tem prioridade", () => {
    expect(dataDeModificacao(post({ revisado_em: "2026-11-15" }))).toBe("2026-11-15");
  });
  test("sem revisão, usa published_at e ignora updated_at", () => {
    expect(dataDeModificacao(post({ revisado_em: null }))).toBe(PUBLICADO);
    expect(dataDeModificacao(post())).toBe(PUBLICADO);
  });
  test("revisão anterior à publicação é ignorada", () => {
    expect(dataDeModificacao(post({ revisado_em: "2026-11-01" }))).toBe(PUBLICADO);
  });
  test("rascunho cai em updated_at e nunca devolve vazio", () => {
    expect(dataDeModificacao(post({ published_at: null }))).toBe(ATUALIZADO);
  });
});

describe("formatarDataRevisao", () => {
  test("data pura não volta um dia por causa do UTC", () => {
    // new Date("2026-11-10") é meia-noite UTC = dia 9 em São Paulo.
    expect(formatarDataRevisao("2026-11-10")).toBe("10-11-2026");
  });
  test("inválido vira vazio", () => {
    expect(formatarDataRevisao("")).toBe("");
    expect(formatarDataRevisao("2026-02-30")).toBe("");
  });
});

describe("revisaoCoerente", () => {
  test("vazia é sempre coerente", () => {
    expect(revisaoCoerente(null, PUBLICADO)).toBe(true);
  });
  test("sem publicação é coerente", () => {
    expect(revisaoCoerente("2020-01-01", null)).toBe(true);
  });
  test("igual ou posterior ao dia da publicação passa; anterior não", () => {
    expect(revisaoCoerente("2026-11-10", PUBLICADO)).toBe(true);
    expect(revisaoCoerente("2026-11-11", PUBLICADO)).toBe(true);
    expect(revisaoCoerente("2026-11-09", PUBLICADO)).toBe(false);
  });
});
