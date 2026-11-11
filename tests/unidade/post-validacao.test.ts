import { describe, expect, test } from "vitest";
import { postFormSchema } from "@/lib/validations/post";
import { hojeEmSaoPaulo } from "@/lib/data-nascimento";
import { revisaoDoEditor } from "@/lib/blog/revisao";

const BASE = {
  title: "Um artigo qualquer",
  slug: "um-artigo-qualquer",
  content: "Texto.",
  category_id: "11111111-1111-4111-8111-111111111111",
};

function resultado(revisado_em: unknown) {
  return postFormSchema.safeParse({ ...BASE, revisado_em });
}

function isoDeHoje(deslocamentoDias = 0) {
  const h = hojeEmSaoPaulo();
  const d = new Date(Date.UTC(h.ano, h.mes - 1, h.dia + deslocamentoDias));
  return d.toISOString().slice(0, 10);
}

describe("postFormSchema.revisado_em", () => {
  test("ausente, vazio, espaços e null viram null", () => {
    for (const v of [undefined, "", "  ", null]) {
      const r = resultado(v);
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.revisado_em).toBeNull();
    }
  });

  test("data real e não futura passa", () => {
    const r = resultado("2026-01-15");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.revisado_em).toBe("2026-01-15");
  });

  test("hoje (São Paulo) passa; amanhã não", () => {
    expect(resultado(isoDeHoje(0)).success).toBe(true);
    expect(resultado(isoDeHoje(1)).success).toBe(false);
  });

  test("formato inválido e dia inexistente são recusados", () => {
    expect(resultado("15/01/2026").success).toBe(false);
    expect(resultado("2026-02-30").success).toBe(false);
    expect(resultado("2026-13-01").success).toBe(false);
  });
});

describe("revisaoDoEditor", () => {
  test("converte dd/mm/aaaa em ISO, vazio em null e inválido em undefined", () => {
    expect(revisaoDoEditor("10/11/2026")).toBe("2026-11-10");
    expect(revisaoDoEditor("")).toBeNull();
    expect(revisaoDoEditor("31/02/2026")).toBeUndefined();
    expect(revisaoDoEditor("10/11")).toBeUndefined();
  });
});
