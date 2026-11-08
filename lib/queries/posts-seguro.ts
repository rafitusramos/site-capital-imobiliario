import { getPublishedPosts, type PostComCategoria } from "@/lib/queries/posts";

/**
 * Posts para blocos secundários ("Leia também" das landings). Uma landing de
 * captação não pode responder 500 porque a leitura do blog falhou: registra e
 * segue sem o bloco.
 */
export async function postsParaLeituraOuVazio(): Promise<PostComCategoria[]> {
  try {
    return await getPublishedPosts();
  } catch (erro) {
    console.error("[leia-tambem] falha ao ler posts", erro);
    return [];
  }
}
