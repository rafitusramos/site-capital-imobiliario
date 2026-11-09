import { describe, expect, test } from "vitest";
import { diasUteisEntre } from "@/lib/crm/dias-uteis";

// 2026-07-13 é segunda-feira. SP é UTC-3 o ano todo (sem horário de verão desde 2019).
describe("diasUteisEntre", () => {
  test("mesmo dia vale 0, mesmo com horas de diferença", () => {
    expect(diasUteisEntre("2026-07-13T12:00:00.000Z", "2026-07-13T20:00:00.000Z")).toBe(0);
  });

  test("segunda para terça é 1 dia útil", () => {
    expect(diasUteisEntre("2026-07-13T13:00:00.000Z", "2026-07-14T13:00:00.000Z")).toBe(1);
  });

  test("sexta para segunda é 1 (sábado e domingo não contam)", () => {
    expect(diasUteisEntre("2026-07-17T13:00:00.000Z", "2026-07-20T13:00:00.000Z")).toBe(1);
  });

  test("sexta para o sábado seguinte é 0", () => {
    expect(diasUteisEntre("2026-07-17T13:00:00.000Z", "2026-07-18T13:00:00.000Z")).toBe(0);
  });

  test("sábado para segunda é 1 (o início em fim de semana não conta, a segunda sim)", () => {
    expect(diasUteisEntre("2026-07-18T13:00:00.000Z", "2026-07-20T13:00:00.000Z")).toBe(1);
  });

  test("duas semanas cheias são 10 dias úteis", () => {
    expect(diasUteisEntre("2026-07-13T13:00:00.000Z", "2026-07-27T13:00:00.000Z")).toBe(10);
  });

  test("fim antes do início vale 0", () => {
    expect(diasUteisEntre("2026-07-14T13:00:00.000Z", "2026-07-13T13:00:00.000Z")).toBe(0);
  });

  test("borda de fuso: 23h em SP já é o dia seguinte em UTC, e vale o dia de SP", () => {
    // Segunda 23:00 SP = terça 02:00 UTC; ainda é segunda em SP.
    expect(diasUteisEntre("2026-07-14T02:00:00.000Z", "2026-07-14T14:00:00.000Z")).toBe(1);
    // Mesmo dia civil em SP (seg 20:00 e seg 23:30), apesar de UTC virar o dia.
    expect(diasUteisEntre("2026-07-13T23:00:00.000Z", "2026-07-14T02:30:00.000Z")).toBe(0);
  });

  test("aceita Date e string", () => {
    expect(diasUteisEntre(new Date("2026-07-13T13:00:00.000Z"), new Date("2026-07-14T13:00:00.000Z"))).toBe(1);
  });
});
