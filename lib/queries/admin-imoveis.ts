import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { ImovelFaseOpcao, ImovelTipoOpcao } from "@/lib/queries/imoveis";

type Imovel = Database["public"]["Tables"]["imoveis"]["Row"];
type ImovelImagem = Database["public"]["Tables"]["imovel_imagens"]["Row"];
type ImovelTipologia = Database["public"]["Tables"]["imovel_tipologias"]["Row"];
type ImovelDiferencial = Database["public"]["Tables"]["imovel_diferenciais"]["Row"];
type ImovelFaq = Database["public"]["Tables"]["imovel_faqs"]["Row"];

// Shape do embed `tipo:imovel_tipos(...)` / `fase:imovel_fases(...)`, mesmo
// formato usado no lado público (lib/queries/imoveis.ts).
type ImovelTipoEmbed = Pick<ImovelTipoOpcao, "id" | "slug" | "nome">;
type ImovelFaseEmbed = Pick<ImovelFaseOpcao, "id" | "slug" | "nome" | "ordem">;

export type ImovelAdminResumo = Imovel & {
  tipo: ImovelTipoEmbed;
  fase: ImovelFaseEmbed;
};

export type ImovelComColecoesAdmin = ImovelAdminResumo & {
  imagens: ImovelImagem[];
  tipologias: ImovelTipologia[];
  diferenciais: ImovelDiferencial[];
  faqs: ImovelFaq[];
};

const SELECT_DOMINIOS = "tipo:imovel_tipos(id, slug, nome), fase:imovel_fases(id, slug, nome, ordem)";

const SELECT_RESUMO = `*, ${SELECT_DOMINIOS}`;

const SELECT_COMPLETO = `*, ${SELECT_DOMINIOS},
  imagens:imovel_imagens(*),
  tipologias:imovel_tipologias(*),
  diferenciais:imovel_diferenciais(*),
  faqs:imovel_faqs(*)`;

function ordenarColecoes(imovel: ImovelComColecoesAdmin): ImovelComColecoesAdmin {
  return {
    ...imovel,
    imagens: [...imovel.imagens].sort((a, b) => a.ordem - b.ordem),
    tipologias: [...imovel.tipologias].sort((a, b) => a.ordem - b.ordem),
    diferenciais: [...imovel.diferenciais].sort((a, b) => a.ordem - b.ordem),
    faqs: [...imovel.faqs].sort((a, b) => a.ordem - b.ordem),
  };
}

/** Todos os empreendimentos, qualquer status — só para uso no admin. */
export async function getImoveisAdmin(): Promise<ImovelAdminResumo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("imoveis")
    .select(SELECT_RESUMO)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ImovelAdminResumo[];
}

export async function getImovelByIdAdmin(id: string): Promise<ImovelComColecoesAdmin | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("imoveis")
    .select(SELECT_COMPLETO)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return ordenarColecoes(data as unknown as ImovelComColecoesAdmin);
}
