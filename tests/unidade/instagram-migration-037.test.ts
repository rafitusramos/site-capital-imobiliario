import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { nomeDaAutomacao, ROTULO_AUTOMACAO_EXCLUIDA } from "@/lib/instagram/rotulos";

/** Trava da 037: excluir automação mantém o histórico (participações ficam com automacao_id nulo). */
const sql = readFileSync(
  join(process.cwd(), "supabase", "migrations", "037_ig_participacao_automacao_excluida.sql"),
  "utf8",
).replace(/--.*$/gm, "");

describe("037: participação sobrevive à automação excluída", () => {
  it("automacao_id deixa de ser not null", () =>
    expect(sql).toMatch(/alter table public\.ig_participacoes\s+alter column automacao_id drop not null/i));
  it("derruba a FK em cascade", () =>
    expect(sql).toMatch(/drop constraint ig_participacoes_automacao_id_fkey/i));
  it("recria a FK com on delete set null", () =>
    expect(sql).toMatch(
      /add constraint ig_participacoes_automacao_id_fkey\s+foreign key \(automacao_id\) references public\.ig_automacoes\(id\) on delete set null/i,
    ));
  it("não usa cascade nem begin/commit", () => {
    expect(sql).not.toMatch(/on delete cascade/i);
    expect(sql).not.toMatch(/^\s*(begin|commit);/im);
  });
});

describe("rótulo da automação na caixa de entrada", () => {
  it("sem automação (excluída): 'Automação excluída'", () => {
    expect(ROTULO_AUTOMACAO_EXCLUIDA).toBe("Automação excluída");
    expect(nomeDaAutomacao(null, null)).toBe("Automação excluída");
    expect(nomeDaAutomacao(null, "Nome velho")).toBe("Automação excluída");
  });
  it("com automação: o nome dela", () => expect(nomeDaAutomacao("uuid", "Financiamento")).toBe("Financiamento"));
  it("com id mas sem nome lido: vazio, não 'excluída'", () => expect(nomeDaAutomacao("uuid", null)).toBe(""));
});
