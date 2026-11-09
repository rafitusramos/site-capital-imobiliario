import { describe, expect, test } from "vitest";
import { brl, brl0, pct } from "@/lib/simulacao/formato";

describe("formato pt-BR", () => {
  test("brl com milhar e duas casas", () => {
    expect(brl(1234567.8)).toBe("1.234.567,80");
    expect(brl(650)).toBe("650,00");
  });
  test("brl de null é travessão", () => {
    expect(brl(null)).toBe("—");
  });
  test("brl0 sem casas", () => {
    expect(brl0(147556.55)).toBe("147.557");
    expect(brl0(0)).toBe("0");
  });
  test("pct com vírgula e duas casas", () => {
    expect(pct(11.6)).toBe("11,60%");
    expect(pct(9.99)).toBe("9,99%");
  });
});
