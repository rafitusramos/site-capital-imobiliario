import { describe, expect, test } from "vitest";
import { estadoDaEtapa, estadoDaEtapaDoLead, formatarData } from "@/lib/crm/tempo";

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

// A barra de tempo compara dias ÚTEIS (seg-sex, fuso SP) com o SLA da 029.
describe("estadoDaEtapaDoLead", () => {
  const sexta = "2026-07-17T13:00:00.000Z"; // sexta 10:00 SP
  const segunda = new Date("2026-07-20T13:00:00.000Z");
  const quartaDepois = new Date("2026-07-22T13:00:00.000Z");

  test("fim de semana não consome SLA: sexta -> segunda é 1 dia útil, dentro do SLA de 1", () => {
    expect(estadoDaEtapaDoLead({ status_alterado_em: sexta, sla_dias: 1 }, segunda)).toBe("no-prazo");
  });

  test("passou do SLA em dias úteis vira atenção e depois parado", () => {
    expect(estadoDaEtapaDoLead({ status_alterado_em: sexta, sla_dias: 1 }, quartaDepois)).toBe("parado"); // 3 úteis > 2x1
    expect(estadoDaEtapaDoLead({ status_alterado_em: sexta, sla_dias: 2 }, quartaDepois)).toBe("atencao"); // 3 úteis
  });

  test("sem SLA (etapa final) ou sem data válida nunca conta como parado", () => {
    expect(estadoDaEtapaDoLead({ status_alterado_em: sexta, sla_dias: null }, quartaDepois)).toBe("no-prazo");
    expect(estadoDaEtapaDoLead({ status_alterado_em: null, sla_dias: 1 }, quartaDepois)).toBe("no-prazo");
    expect(estadoDaEtapaDoLead({ status_alterado_em: "lixo", sla_dias: 1 }, quartaDepois)).toBe("no-prazo");
  });
});
