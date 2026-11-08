import { describe, expect, test } from "vitest";
import { rotuloArquivamento } from "@/lib/crm/arquivamento";

describe("rotuloArquivamento", () => {
  test("arquivado_por nulo = arquivamento automático (migration 023)", () => {
    expect(rotuloArquivamento({ arquivado_por: null })).toBe("Arquivado automaticamente");
  });

  test("arquivado por uma pessoa não ganha rótulo extra", () => {
    expect(rotuloArquivamento({ arquivado_por: "user-1" })).toBeNull();
  });
});
