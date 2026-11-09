import { describe, expect, it } from "vitest";
import {
  dataBrParaIso,
  dataNascimentoValida,
  formatarDataNascimento,
  idadeEmAnos,
  isoDataNascimentoValida,
  isoDataNaoFutura,
  hojeEmSaoPaulo,
} from "@/lib/data-nascimento";
import { mascaraData } from "@/lib/mascaras";

// 15/06/2026 12:00 em São Paulo (UTC-3) = 15:00Z
const HOJE = new Date("2026-06-15T15:00:00Z");

describe("mascaraData", () => {
  it("formata dd/mm/aaaa a partir dos dígitos", () => {
    expect(mascaraData("1")).toBe("1");
    expect(mascaraData("150")).toBe("15/0");
    expect(mascaraData("15051985")).toBe("15/05/1985");
    expect(mascaraData("15/05/1985999")).toBe("15/05/1985");
    expect(mascaraData("ab")).toBe("");
  });
});

describe("dataBrParaIso", () => {
  it("converte data real", () => {
    expect(dataBrParaIso("15/05/1985")).toBe("1985-05-15");
    expect(dataBrParaIso("29/02/2000")).toBe("2000-02-29");
  });
  it("rejeita incompleta e inexistente", () => {
    expect(dataBrParaIso("15/05/85")).toBeNull();
    expect(dataBrParaIso("31/02/1990")).toBeNull();
    expect(dataBrParaIso("29/02/1900")).toBeNull();
    expect(dataBrParaIso("00/05/1990")).toBeNull();
    expect(dataBrParaIso("15/13/1990")).toBeNull();
    expect(dataBrParaIso("")).toBeNull();
  });
});

describe("hojeEmSaoPaulo", () => {
  it("usa o fuso de São Paulo, não UTC", () => {
    // 01/01/2027 01:00Z ainda é 31/12/2026 em São Paulo
    expect(hojeEmSaoPaulo(new Date("2027-01-01T01:00:00Z"))).toEqual({ ano: 2026, mes: 12, dia: 31 });
  });
});

describe("idadeEmAnos", () => {
  it("conta aniversário só no dia", () => {
    expect(idadeEmAnos("1990-06-15", HOJE)).toBe(36);
    expect(idadeEmAnos("1990-06-16", HOJE)).toBe(35);
  });
  it("respeita o fuso: virada de ano em UTC ainda não é o novo dia em SP", () => {
    const quase = new Date("2027-01-01T01:00:00Z"); // 31/12/2026 SP
    expect(idadeEmAnos("1990-01-01", quase)).toBe(36); // em UTC já seria 37
  });
});

describe("dataNascimentoValida", () => {
  it("aceita de 18 a 100 anos", () => {
    expect(dataNascimentoValida("15/06/2008", HOJE)).toBe(true); // 18 hoje
    expect(dataNascimentoValida("15/06/1926", HOJE)).toBe(true); // 100 hoje
    expect(dataNascimentoValida("15/05/1985", HOJE)).toBe(true);
  });
  it("rejeita menor de 18, maior de 100, futura, inexistente e vazia", () => {
    expect(dataNascimentoValida("16/06/2008", HOJE)).toBe(false);
    expect(dataNascimentoValida("14/06/1925", HOJE)).toBe(false);
    expect(dataNascimentoValida("01/01/2030", HOJE)).toBe(false);
    expect(dataNascimentoValida("31/02/1990", HOJE)).toBe(false);
    expect(dataNascimentoValida("", HOJE)).toBe(false);
  });
});

describe("isoDataNascimentoValida", () => {
  it("valida ISO yyyy-mm-dd com a mesma regra", () => {
    expect(isoDataNascimentoValida("1985-05-15", HOJE)).toBe(true);
    expect(isoDataNascimentoValida("2020-05-15", HOJE)).toBe(false);
    expect(isoDataNascimentoValida("1985-02-30", HOJE)).toBe(false);
    expect(isoDataNascimentoValida("15/05/1985", HOJE)).toBe(false);
  });
});

describe("formatarDataNascimento", () => {
  it("ISO para dd/mm/aaaa sem passar por Date/fuso", () => {
    expect(formatarDataNascimento("1985-05-15")).toBe("15/05/1985");
    expect(formatarDataNascimento(null)).toBe("");
    expect(formatarDataNascimento("lixo")).toBe("");
  });
});

describe("isoDataNaoFutura (edição manual no CRM, sem faixa de idade)", () => {
  it("aceita data real até hoje, inclusive criança ou muito antiga", () => {
    expect(isoDataNaoFutura("2015-01-01", HOJE)).toBe(true);
    expect(isoDataNaoFutura("1900-01-01", HOJE)).toBe(true);
    expect(isoDataNaoFutura("2026-06-15", HOJE)).toBe(true);
  });
  it("rejeita futura, inexistente e formato errado", () => {
    expect(isoDataNaoFutura("2026-06-16", HOJE)).toBe(false);
    expect(isoDataNaoFutura("2026-02-30", HOJE)).toBe(false);
    expect(isoDataNaoFutura("15/05/1985", HOJE)).toBe(false);
  });
});
