import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

/**
 * Armazenamento das simulações enviadas: PDF no bucket privado `crm-simulacoes`
 * e uma linha em `crm_simulacoes` (migration 030). Tudo com a service role.
 * Nada aqui lança: o e-mail é o que importa e o histórico nunca pode derrubá-lo.
 */

export const BUCKET_SIMULACOES = "crm-simulacoes";
type Admin = SupabaseClient<Database>;

/** Os dados guardados no histórico não levam os logos (são PNGs grandes, sem valor depois). */
export function dadosSemLogos<T extends object>(dados: T): T {
  const bancos = (dados as { bancos?: Array<Record<string, unknown>> }).bancos;
  return { ...dados, bancos: bancos?.map(({ logo: _logo, ...resto }) => resto) } as T;
}

export async function gravarPdfSimulacao(
  admin: Admin,
  leadId: string,
  pdf: Buffer,
): Promise<{ caminho: string; erro?: undefined } | { caminho?: undefined; erro: string }> {
  const caminho = `${leadId}/${randomUUID()}.pdf`;
  try {
    const { error } = await admin.storage
      .from(BUCKET_SIMULACOES)
      .upload(caminho, pdf, { contentType: "application/pdf", upsert: false });
    if (error) {
      console.error("[simulacao] não foi possível gravar o PDF no bucket:", error);
      return { erro: error.message };
    }
    return { caminho };
  } catch (e) {
    console.error("[simulacao] exceção ao gravar o PDF no bucket:", e);
    return { erro: e instanceof Error ? e.message : String(e) };
  }
}

/** Caminhos dos PDFs de um lead. Lista vazia (com console.error) se a tabela ainda não existir. */
export async function caminhosDasSimulacoes(admin: Admin, leadId: string): Promise<string[]> {
  try {
    const { data, error } = await admin.from("crm_simulacoes").select("storage_path").eq("lead_id", leadId);
    if (error) {
      console.error("[simulacao] não foi possível listar os PDFs do lead:", error);
      return [];
    }
    return (data ?? []).map((l) => l.storage_path);
  } catch (e) {
    console.error("[simulacao] exceção ao listar os PDFs do lead:", e);
    return [];
  }
}

export async function removerArquivosSimulacao(admin: Admin, caminhos: string[]): Promise<void> {
  if (caminhos.length === 0) return;
  try {
    const { error } = await admin.storage.from(BUCKET_SIMULACOES).remove(caminhos);
    if (error) console.error("[simulacao] não foi possível remover os PDFs do bucket:", error);
  } catch (e) {
    console.error("[simulacao] exceção ao remover os PDFs do bucket:", e);
  }
}

// Atalhos para `excluirLead`: criam o cliente aqui dentro, onde uma falha de
// configuração também não pode bloquear a exclusão (LGPD).
export async function caminhosDasSimulacoesDoLead(leadId: string): Promise<string[]> {
  try {
    return await caminhosDasSimulacoes(createAdminClient(), leadId);
  } catch (e) {
    console.error("[simulacao] não foi possível preparar a limpeza dos PDFs:", e);
    return [];
  }
}

export async function removerArquivosDasSimulacoes(caminhos: string[]): Promise<void> {
  if (caminhos.length === 0) return;
  try {
    await removerArquivosSimulacao(createAdminClient(), caminhos);
  } catch (e) {
    console.error("[simulacao] não foi possível preparar a remoção dos PDFs:", e);
  }
}
