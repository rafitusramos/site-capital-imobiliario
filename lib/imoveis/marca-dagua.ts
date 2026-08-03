import "server-only";
import sharp from "sharp";
import { MARCA_DAGUA_BASE64 } from "./marca-dagua-asset";

/**
 * Selo aplicado no canto inferior direito de toda imagem de imóvel enviada
 * pelo admin (galerias + plantas da aba Tipologias). É a única proteção real
 * contra reuso: overlay em CSS ou bloqueio de clique direito somem no
 * devtools, isso não — a marca é pixel da imagem publicada.
 */

const OPACIDADE = 0.55;
const ESCALA_SELO = 0.18;
// Piso alto de propósito: o selo é um lockup de três linhas, e a linha do
// domínio vira borrão abaixo de ~190px de largura. Numa imagem pequena ele
// ocupa uma fatia grande da foto — preferível a uma marca ilegível, que não
// serve nem para atribuir origem.
const LARGURA_MINIMA_SELO = 190;
const LARGURA_MAXIMA_SELO = 420;
const MARGEM_RELATIVA = 0.025;

/**
 * O selo vem de uma string base64 embutida no bundle, e NÃO de
 * `readFile(process.cwd() + "/public/marca-dagua.png")`.
 *
 * `public/` é publicado na CDN mas não entra no bundle da função serverless da
 * Vercel: aquela leitura funcionava no `next dev` e falhava em produção, com o
 * `catch` de `enviarImagem` transformando o ENOENT na mensagem genérica "Não
 * foi possível processar a imagem." — todo upload do admin em produção morria
 * assim, sem deixar rastro no log.
 *
 * `lib/imoveis/marca-dagua-asset.ts` é gerado por `scripts/gerar-asset-marca.mjs`
 * a partir do PNG, que segue sendo a fonte da verdade. Mudou o PNG, rode o
 * script.
 */
let marcaCache: Buffer | null = null;

function carregarMarca(): Buffer {
  if (!marcaCache) marcaCache = Buffer.from(MARCA_DAGUA_BASE64, "base64");
  return marcaCache;
}

/**
 * Recebe o buffer bruto de uma imagem enviada no admin e devolve o WebP já
 * com o selo queimado. Lança se o `sharp` não conseguir decodificar `entrada`
 * — subir a imagem sem marca por engolir o erro seria justamente o silêncio
 * que esta função existe para evitar.
 */
export async function aplicarMarcaDagua(entrada: Buffer): Promise<Buffer> {
  // `.rotate()` sem argumento aplica a orientação do EXIF: sem isso, uma foto
  // de celular tirada na vertical é composta deitada e o selo cai no canto
  // errado. `metadata().autoOrient` é que reflete essa orientação já
  // aplicada — `metadata().width`/`.height` sozinhos ainda são os brutos do
  // arquivo, invertidos quando o EXIF pede rotação de 90°/270°.
  const imagem = sharp(entrada, { failOn: "none" }).rotate();
  const metadata = await imagem.metadata();

  const largura = metadata.autoOrient?.width ?? metadata.width;
  const altura = metadata.autoOrient?.height ?? metadata.height;
  if (!largura || !altura) {
    throw new Error("Não foi possível ler as dimensões da imagem.");
  }

  // Tamanho ótico constante entre uma planta pequena e uma fachada de 4000px:
  // proporcional à largura, com piso e teto.
  const larguraSeloAlvo = Math.round(
    Math.min(LARGURA_MAXIMA_SELO, Math.max(LARGURA_MINIMA_SELO, largura * ESCALA_SELO)),
  );

  const margem = Math.round(largura * MARGEM_RELATIVA);

  const marcaBase = sharp(carregarMarca());
  const marcaMeta = await marcaBase.metadata();
  const marcaLargura = marcaMeta.width ?? larguraSeloAlvo;
  const marcaAltura = marcaMeta.height ?? larguraSeloAlvo;

  // Salvaguarda para imagem menor que o próprio selo (planta em miniatura,
  // ícone): sem isso o `composite` mais abaixo lança "must have same
  // dimensions or smaller". Encolhe mantendo a proporção do selo até caber
  // na área útil (imagem menos as duas margens).
  const areaUtilLargura = Math.max(1, largura - 2 * margem);
  const areaUtilAltura = Math.max(1, altura - 2 * margem);
  const alturaSeloAlvo = larguraSeloAlvo * (marcaAltura / marcaLargura);
  const fatorAjuste = Math.min(
    1,
    areaUtilLargura / larguraSeloAlvo,
    areaUtilAltura / alturaSeloAlvo,
  );
  const larguraSelo = Math.max(1, Math.round(larguraSeloAlvo * fatorAjuste));

  const { data: seloRaw, info: seloInfo } = await marcaBase
    .resize({ width: larguraSelo })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Rebaixa a opacidade do selo multiplicando o canal alpha por um tile 1x1
  // em "dest-in": mais simples e mais barato que recompor os 4 canais na mão.
  const tileOpacidade = Buffer.from([255, 255, 255, Math.round(OPACIDADE * 255)]);
  const seloComOpacidade = await sharp(seloRaw, {
    raw: { width: seloInfo.width, height: seloInfo.height, channels: 4 },
  })
    .composite([
      { input: tileOpacidade, raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: "dest-in" },
    ])
    .png()
    .toBuffer();

  // `top`/`left` explícitos a partir da margem — `gravity` não aceita
  // deslocamento, então não dá para usá-la e ainda respirar do canto.
  const top = Math.max(0, altura - seloInfo.height - margem);
  const left = Math.max(0, largura - seloInfo.width - margem);

  // Saída padronizada em WebP: o re-encode já é inevitável, o mime é aceito
  // pelo bucket, e o `sharp` descarta EXIF por padrão — de quebra some o GPS
  // embutido em foto de celular.
  return imagem
    .composite([{ input: seloComOpacidade, top, left }])
    .webp({ quality: 82 })
    .toBuffer();
}
