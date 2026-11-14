"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/admin/auth";
import { waIdDoTelefone } from "@/lib/whatsapp/telefone";
import { configWhatsApp } from "@/lib/whatsapp/config";
import { criarCloud } from "@/lib/whatsapp/cloud";
import type { AcaoResultado } from "@/app/actions/admin-parametros";

function revalidar() {
  revalidatePath("/admin/whatsapp", "layout");
}

/** Grava o número oficial (dígitos, 55 + DDD + número) na linha única de `wa_config`. */
export async function salvarNumeroOficial(numero: string): Promise<AcaoResultado> {
  const { supabase, user, erro: erroAcesso } = await exigirAdmin();
  if (erroAcesso || !user) return { sucesso: false, erro: erroAcesso };

  const waId = waIdDoTelefone(numero);
  if (!waId) {
    return { sucesso: false, erro: "Número inválido. Informe DDD e número, por exemplo (19) 99999-9999." };
  }

  const { data, error } = await supabase
    .from("wa_config")
    .update({ numero_oficial: waId })
    .eq("id", 1)
    .select("id");
  if (error) {
    console.error("[salvarNumeroOficial] falha ao gravar:", error);
    return { sucesso: false, erro: "Não foi possível salvar o número. Tente de novo." };
  }
  // UPDATE que não casa com nenhuma linha é sucesso no Postgres: confere o retorno.
  if (!data || data.length === 0) {
    console.error("[salvarNumeroOficial] nenhuma linha atualizada em wa_config");
    return { sucesso: false, erro: "Não foi possível salvar: a configuração do WhatsApp não foi encontrada." };
  }
  revalidar();
  return { sucesso: true };
}

/** Assina a WABA aos webhooks do app (idempotente na Meta). */
export async function assinarWebhooksWhatsApp(): Promise<AcaoResultado> {
  const { user, erro: erroAcesso } = await exigirAdmin();
  if (erroAcesso || !user) return { sucesso: false, erro: erroAcesso };

  const cfg = configWhatsApp();
  if (!cfg) {
    return { sucesso: false, erro: "O WhatsApp não está configurado neste ambiente (faltam variáveis)." };
  }
  const ok = await criarCloud(cfg.token, cfg.phoneNumberId).assinarWebhooks(cfg.wabaId);
  if (!ok) {
    return { sucesso: false, erro: "A Meta recusou a assinatura dos webhooks. Confira o token e a conta do WhatsApp." };
  }
  revalidar();
  return { sucesso: true };
}
