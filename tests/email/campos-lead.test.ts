import { describe, expect, test } from "vitest";
import { camposDoFormulario } from "@/lib/email/campos-lead";

describe("camposDoFormulario", () => {
  test("financiamento: valores monetários formatados em reais e booleano em Sim/Não", () => {
    const campos = camposDoFormulario("financiamento", {
      valorImovel: 500000,
      renda: 8000,
      usaFgts: true,
      cidade: "Vinhedo",
      tipoImovel: "Apartamento",
    });
    expect(campos).toContainEqual({ rotulo: "Cidade", valor: "Vinhedo" });
    expect(campos).toContainEqual({ rotulo: "Usa FGTS", valor: "Sim" });
    const valor = campos.find((c) => c.rotulo === "Valor do imóvel")!.valor;
    expect(valor.replace(/\s/g, " ")).toBe("R$ 500.000,00");
  });

  test("omite campos ausentes e vazios", () => {
    expect(camposDoFormulario("imoveis", { observacoes: "", prazoCompra: undefined })).toEqual([]);
  });

  test("ignora chaves que não são do formulário (nome, e-mail, telefone ficam fora)", () => {
    const campos = camposDoFormulario("imoveis", { nome: "A", email: "a@b.c", telefone: "1", observacoes: "Quero visitar" });
    expect(campos).toEqual([{ rotulo: "Observações", valor: "Quero visitar" }]);
  });

  test("home equity traz objetivo e valor de crédito estimado", () => {
    const campos = camposDoFormulario("home-equity", { objetivoCredito: "Consumo", valorCreditoEstimado: 300000 });
    expect(campos.map((c) => c.rotulo)).toEqual(["Objetivo do crédito", "Crédito estimado"]);
  });

  test("financiamento e home equity trazem data de nascimento com a idade", () => {
    const agora = new Date("2026-06-15T15:00:00Z");
    for (const tipo of ["financiamento", "home-equity"]) {
      const campos = camposDoFormulario(tipo, { dataNascimento: "1985-05-15" }, agora);
      expect(campos).toEqual([{ rotulo: "Data de nascimento", valor: "15/05/1985 (41 anos)" }]);
    }
  });

  test("imóveis não lista data de nascimento", () => {
    expect(camposDoFormulario("imoveis", { dataNascimento: "1985-05-15" })).toEqual([]);
  });
});
