"use server";

import { idSchema, usuarioAutenticado } from "@/lib/admin/auth";
import { BUCKET_SIMULACOES } from "@/lib/simulacao/armazenar";
import { createAdminClient } from "@/lib/supabase/admin";

/** Validade da URL assinada do PDF: o suficiente para o clique virar download. */
const VALIDADE_URL_SEGUNDOS = 60;

export interface UrlSimulacaoResultado {
  sucesso: boolean;
  url?: string;
  erro?: string;
}

/**
 * URL assinada de curta duração para baixar um PDF de simulação. A linha de
 * `crm_simulacoes` é lida com o cliente de cookies, então a RLS decide quem
 * pode: quem não enxerga o lead não obtém a URL. O bucket é privado; só a
 * service role assina.
 */
export async function urlDownloadSimulacao(simulacaoId: string): Promise<UrlSimulacaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };
  if (!idSchema.safeParse(simulacaoId).success) return { sucesso: false, erro: "Simulação inválida." };

  const { data: linha, error } = await supabase
    .from("crm_simulacoes")
    .select("storage_path, lead_id")
    .eq("id", simulacaoId)
    .maybeSingle();
  if (error) {
    console.error("[urlDownloadSimulacao] não foi possível ler a simulação:", error);
    return { sucesso: false, erro: "Não foi possível localizar a simulação." };
  }
  if (!linha) return { sucesso: false, erro: "Simulação não encontrada." };

  const { data: lead } = await supabase.from("leads").select("protocolo").eq("id", linha.lead_id).maybeSingle();
  const nome = lead?.protocolo ? `Simulacao-RT-${lead.protocolo}.pdf` : true;

  try {
    const { data, error: erroUrl } = await createAdminClient()
      .storage.from(BUCKET_SIMULACOES)
      .createSignedUrl(linha.storage_path, VALIDADE_URL_SEGUNDOS, { download: nome });
    if (erroUrl || !data) {
      console.error("[urlDownloadSimulacao] não foi possível assinar a URL:", erroUrl);
      return { sucesso: false, erro: "Não foi possível gerar o link do PDF." };
    }
    return { sucesso: true, url: data.signedUrl };
  } catch (e) {
    console.error("[urlDownloadSimulacao] exceção ao assinar a URL:", e);
    return { sucesso: false, erro: "Não foi possível gerar o link do PDF." };
  }
}

export interface SimulacaoPendenteResultado {
  sucesso: boolean;
  /** A mais recente que ainda não foi enviada; null = não há (o diálogo pede o PDF). */
  simulacao?: { id: string; anexadaEm: string } | null;
  erro?: string;
}

/**
 * Qual simulação o diálogo de mover deve enviar: a mais recente do lead que
 * ainda NÃO foi enviada (anexada, ou com envio que falhou). Lida com o cliente
 * de cookies, então a RLS decide quem vê. Nunca derruba o diálogo: falha de
 * leitura vira console.error e "sem simulação", e a pessoa anexa o PDF.
 */
export async function simulacaoPendenteDoLead(leadId: string): Promise<SimulacaoPendenteResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };
  if (!idSchema.safeParse(leadId).success) return { sucesso: false, erro: "Lead inválido." };

  try {
    const { data, error } = await supabase
      .from("crm_simulacoes")
      .select("id, created_at")
      .eq("lead_id", leadId)
      .neq("email_status", "enviado")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("[simulacaoPendenteDoLead] não foi possível ler as simulações:", error);
      return { sucesso: true, simulacao: null };
    }
    return { sucesso: true, simulacao: data ? { id: data.id, anexadaEm: data.created_at } : null };
  } catch (e) {
    console.error("[simulacaoPendenteDoLead] exceção ao ler as simulações:", e);
    return { sucesso: true, simulacao: null };
  }
}
