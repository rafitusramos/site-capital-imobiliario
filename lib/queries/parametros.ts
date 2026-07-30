import { createStaticClient } from "@/lib/supabase/static";

export interface TaxasSimulador {
  financiamentoTaxaAnual: number;
  homeEquityTaxaMensal: number;
}

// Espelha o seed da migration 013 (parametros_simulador). É o valor usado
// quando a leitura falha ou a tabela ainda não foi populada — ver o
// comentário sobre fallback em obterTaxasSimulador() abaixo.
export const TAXAS_PADRAO: TaxasSimulador = {
  financiamentoTaxaAnual: 0.115,
  homeEquityTaxaMensal: 0.0109,
};

/**
 * Lê as taxas dos simuladores públicos.
 *
 * Usa createStaticClient() (cliente anon, sem cookies) e NUNCA
 * createClient() de lib/supabase/server — esse último chama cookies(), o
 * que forçaria as páginas /financiamento e /home_equity (hoje estáticas com
 * ISR) a virarem 100% dinâmicas. Essa função é chamada a partir dessas
 * páginas, então precisa continuar segura para rodar em build/revalidate,
 * fora do escopo de uma requisição.
 *
 * DIVERGE de lib/queries/posts.ts (que dá throw em erro) de propósito: aqui
 * o erro é engolido e cai no fallback TAXAS_PADRAO, em vez de propagado.
 * Uma landing page comercial de captação de lead não pode responder 500
 * porque a tabela de configuração de taxa falhou — a taxa padrão é uma
 * degradação aceitável (a página continua funcionando com um número
 * levemente desatualizado); um erro 500 na hora de simular financiamento
 * não é.
 */
export async function obterTaxasSimulador(): Promise<TaxasSimulador> {
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("parametros_simulador")
      .select("financiamento_taxa_anual, home_equity_taxa_mensal")
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) return TAXAS_PADRAO;

    // numeric do Postgres chega como string no supabase-js — converter
    // explicitamente para número antes de repassar aos simuladores.
    return {
      financiamentoTaxaAnual: Number(data.financiamento_taxa_anual),
      homeEquityTaxaMensal: Number(data.home_equity_taxa_mensal),
    };
  } catch {
    return TAXAS_PADRAO;
  }
}
