/**
 * Decisões puras sobre servir fotos de imóvel pelo otimizador do next/image.
 * Sem React e sem Supabase: travado em tests/unidade/imoveis-imagem-otimizada.test.ts.
 */

/** Projeto Supabase de produção; só entra se NEXT_PUBLIC_SUPABASE_URL faltar. */
export const HOST_SUPABASE_PADRAO = "lqiztovibxbrertyxead.supabase.co";

const CAMINHO_BUCKET = "/storage/v1/object/public/imovel-images/";

/**
 * Host do Supabase a partir da URL do projeto. Espelhado à mão em
 * next.config.ts (que não resolve o alias `@/`): mudou aqui, mude lá.
 */
export function hostDoSupabase(urlProjeto: string | undefined): string {
  if (!urlProjeto) return HOST_SUPABASE_PADRAO;
  try {
    return new URL(urlProjeto).hostname || HOST_SUPABASE_PADRAO;
  } catch {
    return HOST_SUPABASE_PADRAO;
  }
}

/**
 * Só o bucket público `imovel-images` do nosso projeto está em
 * `images.remotePatterns`. Qualquer outra URL pediria ao otimizador algo que
 * ele recusa (erro 400 na imagem), então vai `unoptimized`.
 */
export function ehImagemOtimizavel(
  url: string | null | undefined,
  host: string = hostDoSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL),
): boolean {
  if (!url) return false;
  return url.startsWith(`https://${host}${CAMINHO_BUCKET}`);
}

/**
 * Prioridade de download de um slide já liberado: o ativo e os vizinhos
 * imediatos usam a padrão do navegador; o resto, baixa, para não competir.
 */
export function prioridadeDoSlide(indice: number, selecionado: number): "low" | undefined {
  return Math.abs(indice - selecionado) <= 1 ? undefined : "low";
}

/**
 * Larguras renderizadas (styles/imoveis.css). A foto ativa do carrossel é
 * ESCALADA por transform (1.5x), então a fonte tem de cobrir o tamanho
 * ampliado: mobile 0.52vw x 1.5 ~ 78vw; tablet 0.40vw x 1.5 = 60vw; desktop
 * 50% de 1080px = 540px. Mudou --basis/--escala-ativa, mude aqui.
 */
export const SIZES_CARROSSEL = "(min-width: 1024px) 540px, (min-width: 768px) 60vw, 78vw";
/** Foto única: max-width min(640px, 100% - 32px); 540px a partir de 1024px. */
export const SIZES_FOTO_UNICA = "(min-width: 1024px) 540px, (min-width: 672px) 640px, calc(100vw - 32px)";
/** Lightbox da planta: caixa de até 960px, 92vw no mobile. */
export const SIZES_LIGHTBOX = "(min-width: 1024px) 960px, 92vw";
/** Card da listagem (.im-grid): 3 colunas de ~344px acima de 900px, 2 at� 600px, 1 abaixo. */
export const SIZES_CARD = "(min-width: 901px) 344px, (min-width: 601px) 50vw, 100vw";
