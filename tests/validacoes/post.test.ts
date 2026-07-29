import { describe, expect, test } from "vitest";
import { postFormSchema } from "@/lib/validations/post";

const UUID_VALIDO = "123e4567-e89b-12d3-a456-426614174000";

function base() {
  return {
    title: "Home Equity: como funciona",
    slug: "home-equity-como-funciona",
    content: "Conteúdo completo do artigo.",
    category_id: UUID_VALIDO,
  };
}

describe("postFormSchema", () => {
  test("entrada válida passa", () => {
    const parsed = postFormSchema.safeParse(base());
    expect(parsed.success).toBe(true);
  });

  test("title curto reprova", () => {
    const parsed = postFormSchema.safeParse({ ...base(), title: "Ei" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("Informe um título.");
    }
  });

  test("slug em kebab-case válido aprova", () => {
    const parsed = postFormSchema.safeParse({ ...base(), slug: "melhor-taxa-2024" });
    expect(parsed.success).toBe(true);
  });

  test("slug com letra maiúscula reprova", () => {
    const parsed = postFormSchema.safeParse({ ...base(), slug: "Home-Equity" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe(
        "Use apenas letras minúsculas, números e hífens (kebab-case).",
      );
    }
  });

  test("slug com espaço reprova", () => {
    const parsed = postFormSchema.safeParse({ ...base(), slug: "home equity" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe(
        "Use apenas letras minúsculas, números e hífens (kebab-case).",
      );
    }
  });

  test("slug com underscore reprova", () => {
    const parsed = postFormSchema.safeParse({ ...base(), slug: "home_equity" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe(
        "Use apenas letras minúsculas, números e hífens (kebab-case).",
      );
    }
  });

  test("slug com hífens duplicados reprova", () => {
    const parsed = postFormSchema.safeParse({ ...base(), slug: "home--equity" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe(
        "Use apenas letras minúsculas, números e hífens (kebab-case).",
      );
    }
  });

  test("content vazio reprova", () => {
    const parsed = postFormSchema.safeParse({ ...base(), content: "" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("O conteúdo não pode ficar vazio.");
    }
  });

  test("content só com espaços reprova", () => {
    const parsed = postFormSchema.safeParse({ ...base(), content: "   " });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("O conteúdo não pode ficar vazio.");
    }
  });

  test("category_id que não é UUID reprova", () => {
    const parsed = postFormSchema.safeParse({ ...base(), category_id: "não-é-um-uuid" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toBe("Selecione uma categoria.");
    }
  });

  describe("campos opcionais (excerpt, cover_image, rotulo, cta_pagina, seo_title, seo_description)", () => {
    test("string vazia vira null", () => {
      const parsed = postFormSchema.safeParse({ ...base(), excerpt: "" });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.excerpt).toBeNull();
      }
    });

    test("string com espaços em volta é trimada", () => {
      const parsed = postFormSchema.safeParse({ ...base(), seo_title: "  Título de SEO  " });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.seo_title).toBe("Título de SEO");
      }
    });

    test("campo ausente vira null", () => {
      const parsed = postFormSchema.safeParse(base());
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.cover_image).toBeNull();
        expect(parsed.data.rotulo).toBeNull();
        expect(parsed.data.cta_pagina).toBeNull();
        expect(parsed.data.seo_description).toBeNull();
      }
    });
  });
});
