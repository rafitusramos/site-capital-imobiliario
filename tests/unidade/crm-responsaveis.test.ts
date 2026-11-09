import { describe, expect, test } from "vitest";
import { responsaveisVisiveis } from "@/lib/crm/responsaveis";

const base = { id: "a", full_name: "Ana", avatar_url: null, role: "corretor" as const };

describe("responsaveisVisiveis", () => {
  test("tira quem tem oculto_no_crm = true", () => {
    const r = responsaveisVisiveis([base, { ...base, id: "qa", full_name: "QA Automação", oculto_no_crm: true }]);
    expect(r.map((p) => p.id)).toEqual(["a"]);
  });

  test("coluna ausente (migration ainda não aplicada) não esconde ninguém", () => {
    expect(responsaveisVisiveis([base])).toHaveLength(1);
  });

  test("devolve só id, full_name, avatar_url e role (nada mais chega ao cliente)", () => {
    const [p] = responsaveisVisiveis([{ ...base, oculto_no_crm: false, phone: "1999", creci: "123" } as never]);
    expect(Object.keys(p).sort()).toEqual(["avatar_url", "full_name", "id", "role"]);
  });
});
