import { describe, expect, test } from "vitest";
import { CAMPOS_POR_ORIGEM } from "@/lib/crm/campos";
import type { LeadTipoSlug } from "@/types/database";

const TODOS_OS_TIPOS: LeadTipoSlug[] = ["financiamento", "home-equity", "imoveis", "consorcio"];

/**
 * Trava a invariante documentada em lib/crm/campos.ts (item 10a dos ajustes
 * de CRM): todo campo editável (nem somenteLeitura, nem calculado) precisa
 * de `bloco: "lead"` — desde que PainelOrigem.tsx perdeu o botão de salvar,
 * um campo editável esquecido lá seria impossível de gravar pela interface.
 */
describe("invariante bloco/editável de CAMPOS_POR_ORIGEM", () => {
  test.each(TODOS_OS_TIPOS)("todo campo editável de '%s' tem bloco === 'lead'", (tipo) => {
    const camposEditaveisSemBloco = CAMPOS_POR_ORIGEM[tipo].filter(
      (campo) => !campo.somenteLeitura && !campo.calculado && campo.bloco !== "lead",
    );
    expect(camposEditaveisSemBloco).toEqual([]);
  });

  test("consórcio não tem formulário do site: todos os campos são bloco 'lead'", () => {
    const semBloco = CAMPOS_POR_ORIGEM.consorcio.filter((campo) => campo.bloco !== "lead");
    expect(semBloco).toEqual([]);
  });
});
