"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parametrosSimuladorSchema, type ParametrosSimuladorInput } from "@/lib/validations/parametros";
import { percentualParaDecimal } from "@/lib/parametros/taxa";

export interface AcaoResultado {
  sucesso: boolean;
  erro?: string;
}

async function usuarioAutenticado() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Salva as taxas dos simuladores (linha única, id = 1 de parametros_simulador). */
export async function salvarParametros(input: ParametrosSimuladorInput): Promise<AcaoResultado> {
  const { supabase, user } = await usuarioAutenticado();
  if (!user) return { sucesso: false, erro: "Sessão expirada. Faça login novamente." };

  const parsed = parametrosSimuladorSchema.safeParse(input);
  if (!parsed.success) {
    return { sucesso: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // O formulário trabalha em percentual (11,5); o banco guarda decimal
  // (0.115) — ver o comentário em lib/parametros/taxa.ts sobre por que essa
  // conversão é a armadilha central da feature.
  // O .select("id") no fim não é enfeite: um UPDATE que não casa com nenhuma
  // linha é sucesso para o Postgres (error nulo, zero linhas afetadas). Sem
  // conferir o retorno, o formulário diria "Taxas salvas." sem ter salvado
  // nada — exatamente o que aconteceria enquanto a migration 013 não tivesse
  // sido aplicada no Supabase, que é o estado logo depois deste deploy.
  const { data, error } = await supabase
    .from("parametros_simulador")
    .update({
      financiamento_taxa_anual: percentualParaDecimal(parsed.data.financiamentoTaxaAnual),
      home_equity_taxa_mensal: percentualParaDecimal(parsed.data.homeEquityTaxaMensal),
      atualizado_por: user.id,
    })
    .eq("id", 1)
    .select("id");

  if (error) return { sucesso: false, erro: "Não foi possível salvar as taxas." };

  if (!data || data.length === 0) {
    return {
      sucesso: false,
      erro: "A linha de parâmetros não existe no banco. Aplique a migration 013_parametros_simulador.sql no SQL Editor do Supabase.",
    };
  }

  // Sem isso, a mudança fica presa até o revalidate = 3600 das páginas
  // expirar sozinho — o admin editaria a taxa e não veria efeito nenhum.
  revalidatePath("/financiamento");
  revalidatePath("/home_equity");

  return { sucesso: true };
}
