import { describe, expect, test } from "vitest";
import { estadoDaEtapa, formatarData } from "@/lib/crm/tempo";

// Testes de caracterização de código existente (docs/crm-spec.md §4, barra
// de tempo do card): passam de primeira por definição.
describe("estadoDaEtapa", () => {
  test("SLA nulo (etapa final) é sempre no-prazo, por mais dias que passem", () => {
    expect(estadoDaEtapa(0, null)).toBe("no-prazo");
    expect(estadoDaEtapa(9999, null)).toBe("no-prazo");
  });

  test("até o SLA, inclusive, é no-prazo", () => {
    expect(estadoDaEtapa(0, 3)).toBe("no-prazo");
    expect(estadoDaEtapa(3, 3)).toBe("no-prazo");
  });

  test("um dia acima do SLA vira atencao, até 2x o SLA inclusive", () => {
    expect(estadoDaEtapa(4, 3)).toBe("atencao");
    expect(estadoDaEtapa(6, 3)).toBe("atencao");
  });

  test("acima de 2x o SLA é parado", () => {
    expect(estadoDaEtapa(7, 3)).toBe("parado");
    expect(estadoDaEtapa(100, 3)).toBe("parado");
  });

  test("SLA zero: qualquer dia a mais já é parado, dia zero ainda é no-prazo", () => {
    expect(estadoDaEtapa(0, 0)).toBe("no-prazo");
    expect(estadoDaEtapa(1, 0)).toBe("parado");
  });
});

// A vírgula entre data e hora depende do ICU do Node ("13/07/2026, 14:32"); o regex aceita as duas formas.
describe("formatarData", () => {
  test("converte UTC para o horário de São Paulo (UTC-3)", () => {
    expect(formatarData("2026-07-13T17:32:00Z")).toMatch(/^13\/07\/2026,? 14:32$/);
  });

  test("cruza a meia-noite para o dia anterior em São Paulo", () => {
    expect(formatarData("2026-07-13T01:30:00Z")).toMatch(/^12\/07\/2026,? 22:30$/);
  });

  test("aceita o deslocamento +00:00 que o PostgREST devolve", () => {
    expect(formatarData("2026-07-13T17:32:00+00:00")).toMatch(/^13\/07\/2026,? 14:32$/);
  });
});
