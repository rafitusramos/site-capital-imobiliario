export interface Limites {
  x0: number;
  y0: number;
  /** Exclusivos. */
  x1: number;
  y1: number;
}

/**
 * Caixa da tinta de um logo recortado do PDF (porta de `_logos()` do
 * creditas_parser.py). Pixel com tinta = soma das distâncias ao branco > 40.
 * Parte do topo, primeira linha com tinta, e acompanha linhas seguintes
 * enquanto o vão for de até `vaoMax` pixels (logos em duas partes, como o da
 * Caixa); o que vier depois é de outro elemento. `rgba` é o ImageData.data.
 */
export function limitesDaTinta(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number, vaoMax: number): Limites | null {
  const tem = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return Math.abs(rgba[i] - 255) + Math.abs(rgba[i + 1] - 255) + Math.abs(rgba[i + 2] - 255) > 40;
  };
  const linhas: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tem(x, y)) {
        linhas.push(y);
        break;
      }
    }
  }
  if (linhas.length === 0) return null;
  const y0 = linhas[0];
  let y1 = y0;
  for (let k = 1; k < linhas.length; k++) {
    if (linhas[k] - y1 > vaoMax) break;
    y1 = linhas[k];
  }
  let x0 = w;
  let x1 = -1;
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < w; x++) {
      if (tem(x, y)) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
      }
    }
  }
  return { x0, y0, x1: x1 + 1, y1: y1 + 1 };
}
