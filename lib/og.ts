import { SITE_URL } from "@/lib/site";

// WhatsApp, LinkedIn e Facebook só montam o cartão grande quando a imagem vem
// em proporção ~1,91:1 e em arquivo leve; fora disso caem no cartão pequeno,
// com a imagem reduzida a um ícone ao lado do texto — ou descartam o preview.
export const OG_LARGURA = 1200;
export const OG_ALTURA = 630;

/** Nome da marca em og:site_name, igual em toda página indexável. */
export const SITE_NOME = "Rafael Teixeira · Capital Imobiliário";

/** Capa de compartilhamento das páginas sem imagem própria (já em 1200x630). */
export const OG_IMAGEM_PADRAO = "/images/og-default.jpg";

export const IMAGEM_OG_PADRAO = {
  url: OG_IMAGEM_PADRAO,
  width: OG_LARGURA,
  height: OG_ALTURA,
} as const;

const CAMINHO_OBJETO = "/storage/v1/object/public/";
const CAMINHO_RENDER = "/storage/v1/render/image/public/";

export type ImagemOg = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

function absoluta(url: string): string {
  return url.startsWith("http") ? url : `${SITE_URL}${url}`;
}

/**
 * Monta a entrada de og:image a partir da capa da página.
 *
 * Capa hospedada no Supabase Storage passa pelo endpoint de transformação, que
 * recorta em 1200x630 e derruba o peso (as capas de imóvel chegam a 360 KB em
 * 1400x900). Arquivo local do /public vai como está — são leves, mas cada um
 * tem uma dimensão, e declarar largura/altura erradas é pior que omitir.
 * Sem capa, cai na imagem padrão.
 */
export function imagemOg(
  url: string | null | undefined,
  alt?: string,
): ImagemOg {
  if (!url) return { ...IMAGEM_OG_PADRAO, alt };

  const abs = absoluta(url);
  if (!abs.includes(CAMINHO_OBJETO)) return { url: abs, alt };

  return {
    url:
      abs.replace(CAMINHO_OBJETO, CAMINHO_RENDER) +
      `?width=${OG_LARGURA}&height=${OG_ALTURA}&resize=cover&quality=80`,
    width: OG_LARGURA,
    height: OG_ALTURA,
    alt,
  };
}
