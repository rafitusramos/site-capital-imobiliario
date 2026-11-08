import { describe, expect, it } from "vitest";
import { postsDaCategoria } from "@/lib/blog/blog";

const p = (id: string, cat: string | null, pub: string | null) => ({
  id,
  published_at: pub,
  categoria: cat ? { slug: cat, name: cat } : null,
});

describe("postsDaCategoria", () => {
  it("filtra pela categoria, ordena do mais recente e limita", () => {
    const posts = [
      p("a", "financiamento", "2026-01-01T00:00:00Z"),
      p("b", "home-equity", "2026-05-01T00:00:00Z"),
      p("c", "financiamento", "2026-04-01T00:00:00Z"),
      p("d", "financiamento", "2026-03-01T00:00:00Z"),
      p("e", "financiamento", "2026-02-01T00:00:00Z"),
      p("f", null, "2026-06-01T00:00:00Z"),
    ];
    expect(postsDaCategoria(posts, "financiamento", 3).map((x) => x.id)).toEqual(["c", "d", "e"]);
  });
  it("sem posts da categoria devolve vazio", () => {
    expect(postsDaCategoria([p("a", "imoveis", null)], "financiamento", 3)).toEqual([]);
  });
});
