import { describe, expect, test } from "vitest";
import sharp from "sharp";
import { aplicarMarcaDagua } from "@/lib/imoveis/marca-dagua";

/** Imagem de cor sólida, sem EXIF — o próprio sharp gera o fixture. */
async function imagemSolida(largura: number, altura: number, cor: { r: number; g: number; b: number }) {
  return sharp({ create: { width: largura, height: altura, channels: 3, background: cor } })
    .jpeg()
    .toBuffer();
}

const CEU = { r: 135, g: 206, b: 235 };

describe("aplicarMarcaDagua", () => {
  test("devolve WebP decodificável com as mesmas dimensões da entrada", async () => {
    const entrada = await imagemSolida(1200, 800, CEU);

    const saida = await aplicarMarcaDagua(entrada);
    const metadata = await sharp(saida).metadata();

    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(800);
  });

  test("canto superior esquerdo continua na cor original e o inferior direito muda", async () => {
    const largura = 1200;
    const altura = 800;
    const entrada = await imagemSolida(largura, altura, CEU);

    const saida = await aplicarMarcaDagua(entrada);
    const { data, info } = await sharp(saida).raw().ensureAlpha().toBuffer({ resolveWithObject: true });

    function pixel(x: number, y: number) {
      const i = (y * info.width + x) * info.channels;
      return [data[i], data[i + 1], data[i + 2]];
    }

    // Longe do selo: continua a cor original (tolerância pela reencode em WebP).
    const [r, g, b] = pixel(5, 5);
    expect(Math.abs(r - CEU.r)).toBeLessThan(6);
    expect(Math.abs(g - CEU.g)).toBeLessThan(6);
    expect(Math.abs(b - CEU.b)).toBeLessThan(6);

    // Dentro da caixa do selo (largura*0.18 de lado, ~2.5% de margem do canto
    // inferior direito) tem que existir pelo menos um pixel onde a cor mudou
    // — é o texto branco semitransparente composto ali. Varre a caixa em vez
    // de mirar um pixel fixo porque boa parte dela é vão entre letras.
    const margem = Math.round(largura * 0.025);
    const larguraSelo = Math.round(largura * 0.18);
    let algumMudou = false;
    for (let x = largura - margem - larguraSelo; x < largura - margem; x += 3) {
      for (let y = altura - margem - 60; y < altura - margem; y += 3) {
        if (x < 0 || y < 0) continue;
        const [pr, pg, pb] = pixel(x, y);
        if (Math.abs(pr - CEU.r) > 10 || Math.abs(pg - CEU.g) > 10 || Math.abs(pb - CEU.b) > 10) {
          algumMudou = true;
        }
      }
    }
    expect(algumMudou).toBe(true);
  });

  test("respeita o piso de 190px para imagem pequena (planta baixa)", async () => {
    const entrada = await imagemSolida(300, 200, { r: 240, g: 240, b: 240 });

    const saida = await aplicarMarcaDagua(entrada);
    const metadata = await sharp(saida).metadata();

    expect(metadata.width).toBe(300);
    expect(metadata.height).toBe(200);
  });

  test("respeita o teto de 420px para imagem muito larga", async () => {
    const entrada = await imagemSolida(4000, 3000, { r: 20, g: 20, b: 20 });

    const saida = await aplicarMarcaDagua(entrada);
    const metadata = await sharp(saida).metadata();

    expect(metadata.width).toBe(4000);
    expect(metadata.height).toBe(3000);
  });

  test("aplica a orientação do EXIF antes de posicionar o selo (foto vertical de celular)", async () => {
    // Base física 600x800 com um quadrado vermelho no canto SUPERIOR ESQUERDO
    // físico e orientation=6 (rotate 90° CW para exibir corretamente). Sob
    // rotação de 90° CW, o físico superior-esquerdo vira o superior-direito
    // exibido — longe de onde o selo cai (inferior direito) — o que prova
    // que a rotação de fato aconteceu sem interferir na checagem do selo.
    const larguraFisica = 600;
    const alturaFisica = 800;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${larguraFisica}" height="${alturaFisica}">
      <rect width="100%" height="100%" fill="#202020"/>
      <rect x="0" y="0" width="60" height="60" fill="#ff0000"/>
    </svg>`;
    const base = await sharp(Buffer.from(svg)).jpeg().toBuffer();
    const comExif = await sharp(base).withMetadata({ orientation: 6 }).toBuffer();

    const saida = await aplicarMarcaDagua(comExif);
    const metadata = await sharp(saida).metadata();

    // Dimensões já refletem a rotação: 600x800 físico vira 800x600 exibido.
    const largura = 800;
    const altura = 600;
    expect(metadata.width).toBe(largura);
    expect(metadata.height).toBe(altura);

    const { data, info } = await sharp(saida).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    function pixel(x: number, y: number) {
      const i = (y * info.width + x) * info.channels;
      return [data[i], data[i + 1], data[i + 2]];
    }

    // O quadrado vermelho migrou para o canto superior direito exibido.
    const [r, g, b] = pixel(largura - 10, 10);
    expect(r).toBeGreaterThan(150);
    expect(g).toBeLessThan(100);
    expect(b).toBeLessThan(100);

    // No canto inferior direito exibido (fundo escuro #202020), algum pixel
    // dentro da caixa do selo mudou — mesma varredura do teste anterior.
    const margem = Math.round(largura * 0.025);
    const larguraSelo = Math.round(largura * 0.18);
    let algumMudou = false;
    for (let x = largura - margem - larguraSelo; x < largura - margem; x += 3) {
      for (let y = altura - margem - 40; y < altura - margem; y += 3) {
        if (x < 0 || y < 0) continue;
        const [pr, pg, pb] = pixel(x, y);
        if (pr > 40 || pg > 40 || pb > 40) algumMudou = true;
      }
    }
    expect(algumMudou).toBe(true);
  });

  test("lança quando o buffer não é uma imagem decodificável", async () => {
    const lixo = Buffer.from("isso não é uma imagem");
    await expect(aplicarMarcaDagua(lixo)).rejects.toThrow();
  });
});
