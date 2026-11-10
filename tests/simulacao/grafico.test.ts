import { describe, expect, test } from "vitest";
import { grafico } from "@/lib/simulacao/grafico";
import type { BancoView } from "@/lib/simulacao/tipos";

const b = (nome: string, primeira: number, parcelas: (number | null)[], prazo = 360): BancoView => ({
  nome, taxa: 1, cet: 1, custo_total: 1, prazo, indexador: "TR", sistema: "SAC", primeira, ultima: 1,
  parcelas, logo: null, comparavel: true, melhor: false, cls: "", ast: "",
});

describe("grafico", () => {
  test("o primeiro banco leva a cor de destaque na legenda", () => {
    const { legenda } = grafico([b("A", 3000, [3000, 2000]), b("B", 3500, [3500, 2500])], [1, 360]);
    expect(legenda[0]).toMatchObject({ nome: "A", cor: "#1F6B4E", estilo: "solid" });
    expect(legenda[1].cor).toBe("#8A6C48");
  });
  test("eixo cobre a maior primeira parcela, arredondada para cima ao milhar", () => {
    const { svg } = grafico([b("A", 3050, [3050, 2000])], [1, 360]);
    expect(svg).toContain(">4.000<");
    expect(svg).toContain(">0<");
  });
  test("parcela nula interrompe a linha sem virar zero", () => {
    const { svg } = grafico([b("A", 3000, [3000, null, 2000])], [1, 100, 360]);
    const caminho = svg.match(/<path d="([^"]+)"/)?.[1] ?? "";
    expect(caminho.split("L")).toHaveLength(2);
  });
  test("o SVG não carrega nome de banco (só números)", () => {
    const { svg } = grafico([b("<script>", 3000, [3000])], [1]);
    expect(svg).not.toContain("<script>");
  });
});
