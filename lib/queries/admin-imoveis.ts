import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Imovel = Database["public"]["Tables"]["imoveis"]["Row"];
type ImovelImagem = Database["public"]["Tables"]["imovel_imagens"]["Row"];
type ImovelTipologia = Database["public"]["Tables"]["imovel_tipologias"]["Row"];
type ImovelDiferencial = Database["public"]["Tables"]["imovel_diferenciais"]["Row"];
type ImovelFaq = Database["public"]["Tables"]["imovel_faqs"]["Row"];

export type ImovelComColecoesAdmin = Imovel & {
  imagens: ImovelImagem[];
  tipologias: ImovelTipologia[];
  diferenciais: ImovelDiferencial[];
  faqs: ImovelFaq[];
};

const SELECT_COMPLETO = `*,
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
export async function getImoveisAdmin(): Promise<Imovel[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("imoveis")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
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
