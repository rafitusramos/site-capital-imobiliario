import { describe, expect, test } from "vitest";
import { limitesDaTinta } from "@/lib/simulacao/logo";

function imagem(w: number, h: number, tinta: Array<[number, number, number, number]>) {
  const d = new Uint8ClampedArray(w * h * 4).fill(255);
  for (const [x0, y0, x1, y1] of tinta)
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const i = (y * w + x) * 4;
        d[i] = d[i + 1] = d[i + 2] = 0;
      }
  return d;
}

describe("limitesDaTinta", () => {
  test("devolve a caixa da tinta", () => {
    const d = imagem(20, 20, [[5, 4, 12, 9]]);
    expect(limitesDaTinta(d, 20, 20, 1)).toEqual({ x0: 5, y0: 4, x1: 12, y1: 9 });
  });
  test("imagem toda branca não tem logo", () => {
    expect(limitesDaTinta(imagem(10, 10, []), 10, 10, 1)).toBeNull();
  });
  test("junta partes separadas por vão até a tolerância (logo em duas partes)", () => {
    const d = imagem(20, 30, [[2, 2, 10, 6], [2, 8, 10, 12]]);
    expect(limitesDaTinta(d, 20, 30, 3)).toEqual({ x0: 2, y0: 2, x1: 10, y1: 12 });
  });
  test("para no vão maior que a tolerância", () => {
    const d = imagem(20, 30, [[2, 2, 10, 6], [2, 20, 10, 24]]);
    expect(limitesDaTinta(d, 20, 30, 3)).toEqual({ x0: 2, y0: 2, x1: 10, y1: 6 });
  });
});
