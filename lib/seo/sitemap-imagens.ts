import { urlAbsoluta } from "@/lib/og";

/** Capa do post, absoluta. */
export function imagensDoPost(post: { cover_image: string | null }): string[] {
  return post.cover_image ? [urlAbsoluta(post.cover_image)] : [];
}

/** Capa + galerias do imóvel, absolutas, sem vazias nem repetidas. */
export function imagensDoImovel(imovel: {
  cover_image?: string | null;
  imagens: readonly { url: string }[];
}): string[] {
  const todas = [imovel.cover_image ?? "", ...imovel.imagens.map((i) => i.url)]
    .filter((u) => u.trim() !== "")
    .map(urlAbsoluta);
  return [...new Set(todas)];
}
