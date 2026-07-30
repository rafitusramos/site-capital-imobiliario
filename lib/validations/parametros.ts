import { z } from "zod";

// Valida os valores em PERCENTUAL — o que a pessoa digita no formulário do
// admin (11,5 para 11,5% ao ano), não o decimal gravado no banco (0.115).
// Os tetos (30 e 5) são sanidade contra erro de digitação, como digitar 115
// em vez de 11,5 — e conversam com o `check (< 1)` em decimal do banco
// (migration 013_parametros_simulador.sql): 115% viraria 1.15 em decimal,
// que o CHECK do banco rejeitaria de qualquer forma, mas é melhor barrar
// aqui, com uma mensagem legível, do que deixar a query falhar.
export const parametrosSimuladorSchema = z.object({
  financiamentoTaxaAnual: z
    .number({ message: "Informe a taxa de financiamento." })
    .gt(0, "A taxa de financiamento precisa ser maior que zero.")
    .lte(30, "A taxa de financiamento parece alta demais (máximo 30% ao ano)."),
  homeEquityTaxaMensal: z
    .number({ message: "Informe a taxa de home equity." })
    .gt(0, "A taxa de home equity precisa ser maior que zero.")
    .lte(5, "A taxa de home equity parece alta demais (máximo 5% ao mês)."),
});

export type ParametrosSimuladorInput = z.infer<typeof parametrosSimuladorSchema>;
