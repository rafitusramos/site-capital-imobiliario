import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ICONES,
  ICONE_GENERICO,
  ROTULOS_ICONES,
  listaDeIcones,
  obterIcone,
  opcoesDeIcones,
} from "@/components/imoveis/icones";

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const NOVOS = [
  "torre",
  "delivery",
  "alto-padrao",
  "hall-privativo",
  "tomada-usb",
  "ar-condicionado",
  "planta-flexivel",
  "sala-estar",
  "lavabo",
  "lavanderia",
  "varanda",
  "piso-nivelado",
  "separacao-intima",
  "persiana",
  "deposito",
  "conveniencia",
  "mercado",
  "restaurante",
];

describe("catálogo de ícones de imóveis", () => {
  it("tem 36 ícones e inclui os 18 novos", () => {
    expect(listaDeIcones()).toHaveLength(36);
    for (const slug of NOVOS) expect(ICONES).toHaveProperty([slug]);
  });

  it("toda chave tem rótulo e todo rótulo tem chave", () => {
    expect(Object.keys(ROTULOS_ICONES).sort()).toEqual(Object.keys(ICONES).sort());
    for (const rotulo of Object.values(ROTULOS_ICONES)) expect(rotulo.trim()).not.toBe("");
  });

  it("chaves únicas e em kebab-case", () => {
    const chaves = Object.keys(ICONES);
    expect(new Set(chaves).size).toBe(chaves.length);
    for (const chave of chaves) expect(chave).toMatch(KEBAB);
  });

  it("rótulos são únicos (seletor sem opções repetidas)", () => {
    const rotulos = Object.values(ROTULOS_ICONES);
    expect(new Set(rotulos).size).toBe(rotulos.length);
  });

  it("obterIcone cai no genérico para slug desconhecido, vazio ou nulo", () => {
    expect(obterIcone("nao-existe")).toBe(ICONE_GENERICO);
    expect(obterIcone("")).toBe(ICONE_GENERICO);
    expect(obterIcone(null)).toBe(ICONE_GENERICO);
    expect(obterIcone(undefined)).toBe(ICONE_GENERICO);
    expect(obterIcone("piscina")).toBe(ICONES.piscina);
  });

  it("opcoesDeIcones vem em ordem alfabética do rótulo", () => {
    const rotulos = opcoesDeIcones().map((o) => o.rotulo);
    expect(rotulos).toEqual([...rotulos].sort((a, b) => a.localeCompare(b, "pt-BR")));
    expect(opcoesDeIcones()).toHaveLength(36);
  });

  it.each(Object.keys(ICONES))("%s renderiza um <svg viewBox 0 0 20 20> com formas", (slug) => {
    const html = renderToStaticMarkup(createElement(ICONES[slug]));
    expect(html.startsWith("<svg")).toBe(true);
    expect(html).toContain('viewBox="0 0 20 20"');
    expect(html).toContain('stroke="currentColor"');
    expect(html).toMatch(/<(path|rect|circle|line|polyline|polygon|ellipse)\b/);
  });
});
