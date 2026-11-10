import { describe, expect, test } from "vitest";
import robots from "@/app/robots";
import { ROBOS_IA } from "@/lib/seo/robos-ia";
import { SITE_URL } from "@/lib/site";

function grupos() {
  const r = robots().rules;
  return Array.isArray(r) ? r : [r];
}
const lista = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

describe("robots.txt", () => {
  test("todo robô de IA da lista aparece em algum grupo", () => {
    const agentes = grupos().flatMap((g) => lista(g.userAgent));
    expect(ROBOS_IA.length).toBeGreaterThan(0);
    for (const robo of ROBOS_IA) expect(agentes).toContain(robo);
  });

  test("a lista cobre busca, leitura sob demanda e treino", () => {
    for (const nome of ["OAI-SearchBot", "ChatGPT-User", "GPTBot", "ClaudeBot", "Google-Extended"]) {
      expect(ROBOS_IA).toContain(nome);
    }
  });

  test("todo grupo, inclusive o *, bloqueia /admin", () => {
    const todos = grupos();
    expect(todos.length).toBeGreaterThan(1);
    expect(todos.some((g) => lista(g.userAgent).includes("*"))).toBe(true);
    for (const g of todos) expect(lista(g.disallow)).toContain("/admin");
  });

  test("nenhum grupo bloqueia o site inteiro", () => {
    for (const g of grupos()) expect(lista(g.disallow)).not.toContain("/");
  });

  test("sitemap aponta para o domínio canônico", () => {
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});
