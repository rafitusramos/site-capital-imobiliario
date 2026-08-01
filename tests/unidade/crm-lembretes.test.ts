import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ehHoje, estaAtrasado, rotuloRelativo } from "@/lib/crm/lembretes";

// "Agora" fixo: 15/07/2026 14:00 em São Paulo (UTC-3) = 17:00 UTC. Vitest
// mocka `Date`/`Date.now()` no fuso do PROCESSO (que já é UTC neste
// ambiente de teste) — por isso o instante de referência é sempre escrito
// aqui em UTC explícito, e as asserções conferem o que o módulo calcula em
// América/São_Paulo a partir dele.
const AGORA_UTC = "2026-07-15T17:00:00.000Z"; // 15/07 14:00 em SP

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(AGORA_UTC));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("estaAtrasado", () => {
  test("instante no passado está atrasado", () => {
    expect(estaAtrasado("2026-07-15T16:00:00.000Z")).toBe(true);
  });

  test("instante no futuro não está atrasado", () => {
    expect(estaAtrasado("2026-07-15T18:00:00.000Z")).toBe(false);
  });

  test("aceita `agora` explícito em vez do relógio do sistema", () => {
    expect(estaAtrasado("2026-01-01T12:00:00.000Z", "2026-01-01T13:00:00.000Z")).toBe(true);
    expect(estaAtrasado("2026-01-01T13:00:00.000Z", "2026-01-01T12:00:00.000Z")).toBe(false);
  });
});

describe("ehHoje — virada de dia no fuso de São Paulo", () => {
  test("mesmo dia em SP, embora datas UTC diferentes", () => {
    // 15/07 23:59 em SP é 16/07 02:59 em UTC — dia UTC diferente do "agora"
    // (15/07 17:00 UTC), mas ainda HOJE em São Paulo.
    expect(ehHoje("2026-07-16T02:59:00.000Z")).toBe(true);
  });

  test("logo depois da meia-noite de SP já é amanhã, mesmo com poucos minutos de diferença", () => {
    // 16/07 00:01 em SP é 16/07 03:01 em UTC — só 10h01 de distância do
    // "agora", mas já é o PRÓXIMO dia de calendário em São Paulo.
    expect(ehHoje("2026-07-16T03:01:00.000Z")).toBe(false);
  });

  test("um minuto antes da meia-noite de SP ainda é hoje", () => {
    // 15/07 23:59 em SP = 16/07 02:59 UTC (calculado acima); o limite exato
    // é a virada às 03:00 UTC (00:00 em SP).
    expect(ehHoje("2026-07-16T02:59:59.000Z")).toBe(true);
    expect(ehHoje("2026-07-16T03:00:00.000Z")).toBe(false);
  });

  test("dia diferente é false", () => {
    expect(ehHoje("2026-07-16T17:00:00.000Z")).toBe(false);
    expect(ehHoje("2026-07-14T17:00:00.000Z")).toBe(false);
  });
});

describe("rotuloRelativo", () => {
  test("hoje mostra a hora em São Paulo, não em UTC", () => {
    // 20:30 UTC no mesmo dia = 17:30 em SP.
    expect(rotuloRelativo("2026-07-15T20:30:00.000Z")).toBe("hoje 17:30");
  });

  test("amanhã mostra 'amanhã HH:mm'", () => {
    expect(rotuloRelativo("2026-07-16T12:00:00.000Z")).toBe("amanhã 09:00");
  });

  test("ontem mostra 'ontem HH:mm'", () => {
    expect(rotuloRelativo("2026-07-14T21:30:00.000Z")).toBe("ontem 18:30");
  });

  test("em 5 dias", () => {
    expect(rotuloRelativo("2026-07-20T17:00:00.000Z")).toBe("em 5 dias");
  });

  test("há 3 dias", () => {
    expect(rotuloRelativo("2026-07-12T17:00:00.000Z")).toBe("há 3 dias");
  });

  test("meia-noite em São Paulo não vira 'hoje 24:00' (quirk do hour12 no ICU)", () => {
    // 03:00 UTC do dia seguinte é exatamente 00:00 em São Paulo.
    expect(rotuloRelativo("2026-07-16T03:00:00.000Z")).toBe("amanhã 00:00");
  });

  test("respeita `agora` explícito em vez do relógio mockado", () => {
    expect(rotuloRelativo("2026-01-02T12:00:00.000Z", "2026-01-01T12:00:00.000Z")).toBe("amanhã 09:00");
  });
});
