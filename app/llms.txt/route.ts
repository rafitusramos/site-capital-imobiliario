import { getPublishedPosts } from "@/lib/queries/posts";
import { getImoveisPublicados } from "@/lib/queries/imoveis";
import { montarLlmsTxt, type DadosLlms } from "@/lib/seo/llms";

// Conteúdo vem do Supabase: sem revalidate o arquivo congelaria no build.
export const revalidate = 3600;

// Leitura falhando não derruba a rota (mesmo padrão de lib/queries/parametros.ts):
// serve o arquivo sem a seção correspondente.
export async function GET() {
  const dados: DadosLlms = { artigos: [], imoveis: [] };

  try {
    const posts = await getPublishedPosts();
    dados.artigos = posts.map((p) => ({ titulo: p.title, slug: p.slug, resumo: p.excerpt }));
  } catch (e) {
    console.error("[llms.txt] falha ao ler artigos", e);
  }

  try {
    const imoveis = await getImoveisPublicados();
    dados.imoveis = imoveis.map((i) => ({
      titulo: i.titulo,
      slug: i.slug,
      tipo: i.tipo?.nome ?? null,
      cidade: i.cidade ?? null,
    }));
  } catch (e) {
    console.error("[llms.txt] falha ao ler imóveis", e);
  }

  return new Response(montarLlmsTxt(dados), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
