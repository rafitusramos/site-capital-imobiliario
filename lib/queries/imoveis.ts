import { createStaticClient } from "@/lib/supabase/static";
import type { Database } from "@/types/database";

type Imovel = Database["public"]["Tables"]["imoveis"]["Row"];
type ImovelImagem = Database["public"]["Tables"]["imovel_imagens"]["Row"];
type ImovelTipologia = Database["public"]["Tables"]["imovel_tipologias"]["Row"];
type ImovelDiferencial = Database["public"]["Tables"]["imovel_diferenciais"]["Row"];
type ImovelFaq = Database["public"]["Tables"]["imovel_faqs"]["Row"];

/** Opção de domínio (tipo ou fase), usada nos filtros da home e nos selects do admin. */
export type ImovelTipoOpcao = Database["public"]["Tables"]["imovel_tipos"]["Row"];
export type ImovelFaseOpcao = Database["public"]["Tables"]["imovel_fases"]["Row"];

// Shape do embed `tipo:imovel_tipos(...)` / `fase:imovel_fases(...)` — só os
// campos pedidos no SELECT, não a linha inteira da tabela de domínio.
type ImovelTipoEmbed = Pick<ImovelTipoOpcao, "id" | "slug" | "nome">;
type ImovelFaseEmbed = Pick<ImovelFaseOpcao, "id" | "slug" | "nome" | "ordem">;

// O tipo Database é escrito à mão e não modela Relationships, então o
// postgrest-js não consegue inferir o formato dos embeds abaixo. Os casts
// `as unknown as` refletem o shape real da resposta, confirmado em runtime
// (mesmo padrão de lib/queries/posts.ts).

export type ImovelComCapa = Imovel & {
  capa: string | null;
  tipo: ImovelTipoEmbed;
  fase: ImovelFaseEmbed;
};

export type ImovelCompleto = Imovel & {
  tipo: ImovelTipoEmbed;
  fase: ImovelFaseEmbed;
  imagens: ImovelImagem[];
  tipologias: ImovelTipologia[];
  diferenciais: ImovelDiferencial[];
  faqs: ImovelFaq[];
};

const SELECT_DOMINIOS = "tipo:imovel_tipos(id, slug, nome), fase:imovel_fases(id, slug, nome, ordem)";

const SELECT_COM_IMAGENS = `*, ${SELECT_DOMINIOS}, imagens:imovel_imagens(url, ambiente, grupo, ordem, destaque)`;

const SELECT_COMPLETO = `*, ${SELECT_DOMINIOS},
  imagens:imovel_imagens(*),
  tipologias:imovel_tipologias(*),
  diferenciais:imovel_diferenciais(*),
  faqs:imovel_faqs(*)`;

/** Capa do card: a imagem marcada como destaque, ou a de menor ordem. */
function capaDeImagens(
  imagens: Pick<ImovelImagem, "url" | "ordem" | "destaque">[] | null | undefined,
): string | null {
  if (!imagens || imagens.length === 0) return null;
  const destaque = imagens.find((imagem) => imagem.destaque);
  if (destaque) return destaque.url;
  const ordenadas = [...imagens].sort((a, b) => a.ordem - b.ordem);
  return ordenadas[0]?.url ?? null;
}

function ordenarColecoes(imovel: ImovelCompleto): ImovelCompleto {
  return {
    ...imovel,
    imagens: [...imovel.imagens].sort((a, b) => a.ordem - b.ordem),
    tipologias: [...imovel.tipologias].sort((a, b) => a.ordem - b.ordem),
    diferenciais: [...imovel.diferenciais].sort((a, b) => a.ordem - b.ordem),
    faqs: [...imovel.faqs].sort((a, b) => a.ordem - b.ordem),
  };
}

export async function getImoveisPublicados(): Promise<ImovelComCapa[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("imoveis")
    .select(SELECT_COM_IMAGENS)
    .eq("status", "ativo")
    // Ordem no índice (admin) é o critério primário; dentro dela, o Rafael
    // quer os cards em ordem crescente de data de cadastro.
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  const imoveis = (data ?? []) as unknown as (Imovel & {
    tipo: ImovelTipoEmbed;
    fase: ImovelFaseEmbed;
    imagens: ImovelImagem[];
  })[];
  return imoveis.map(({ imagens, ...imovel }) => ({ ...imovel, capa: capaDeImagens(imagens) }));
}

export async function getImovelBySlug(slug: string): Promise<ImovelCompleto | null> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("imoveis")
    .select(SELECT_COMPLETO)
    .eq("slug", slug)
    .eq("status", "ativo")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return ordenarColecoes(data as unknown as ImovelCompleto);
}

export async function getImoveisRelacionados(
  id: string,
  cidade: string,
  limite: number,
): Promise<ImovelComCapa[]> {
  const supabase = createStaticClient();
  const { data, error } = await supabase
    .from("imoveis")
    .select(SELECT_COM_IMAGENS)
    .eq("status", "ativo")
    .eq("cidade", cidade)
    .neq("id", id)
    .order("ordem", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limite);

  if (error) throw error;
  const imoveis = (data ?? []) as unknown as (Imovel & {
    tipo: ImovelTipoEmbed;
    fase: ImovelFaseEmbed;
    imagens: ImovelImagem[];
  })[];
  return imoveis.map(({ imagens, ...imovel }) => ({ ...imovel, capa: capaDeImagens(imagens) }));
}

/** Tipos e fases ativos, ordenados — alimenta os filtros da home e os selects do admin. */
export async function getTiposEFases(): Promise<{
  tipos: ImovelTipoOpcao[];
  fases: ImovelFaseOpcao[];
}> {
  const supabase = createStaticClient();
  const [{ data: tipos, error: erroTipos }, { data: fases, error: erroFases }] = await Promise.all([
    supabase.from("imovel_tipos").select("*").eq("ativo", true).order("ordem", { ascending: true }),
    supabase.from("imovel_fases").select("*").eq("ativo", true).order("ordem", { ascending: true }),
  ]);

  if (erroTipos) throw erroTipos;
  if (erroFases) throw erroFases;

  return { tipos: tipos ?? [], fases: fases ?? [] };
}
