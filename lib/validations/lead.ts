import { z } from "zod";
import { cpfValido, telefoneValido } from "@/lib/financeiro";

/**
 * Schemas Zod para os leads capturados hoje pelo site (financiamento,
 * home-equity, imóveis — consórcio fica de fora, é o único tipo inativo
 * em lead_tipos). Cada schema normaliza (remove máscara) e valida no
 * servidor, independente do que o cliente mandou — não confia na
 * formatação do input.
 */

const nomeSchema = z
  .string()
  .trim()
  .min(3, "Informe seu nome completo.");

const emailSchema = z.string().trim().email("Informe um e-mail válido.");

const telefoneSchema = z.string().transform((valor, ctx) => {
  if (!telefoneValido(valor)) {
    ctx.addIssue({ code: "custom", message: "Informe um telefone válido com DDD." });
    return z.NEVER;
  }
  return valor.replace(/\D/g, "");
});

const cpfSchema = z
  .string()
  .optional()
  .transform((valor) => {
    if (!valor) return undefined;
    return valor.replace(/\D/g, "");
  })
  .refine((valor) => valor === undefined || cpfValido(valor), {
    message: "Informe um CPF válido.",
  });

const camposComuns = {
  nome: nomeSchema,
  email: emailSchema,
  telefone: telefoneSchema,
  cpf: cpfSchema,
};

const numeroPositivo = z.number().finite().nonnegative();

export const leadFinanciamentoSchema = z.object({
  ...camposComuns,
  renda: numeroPositivo,
  tipoRemuneracao: z.enum(["Assalariado", "Empresário / Autônomo"]),
  entradaDisponivel: numeroPositivo,
  usaFgts: z.boolean(),
  valorImovel: numeroPositivo,
  momentoCompra: z.enum(["Ainda procurando", "Já escolhi o imóvel", "Em negociação"]),
  tipoImovel: z.enum([
    "Apartamento",
    "Casa",
    "Casa em condomínio",
    "Terreno em condomínio",
    "Sala Comercial",
  ]),
  cidade: z.string().trim().min(2, "Informe a cidade."),
  estado: z.string().trim().length(2, "Informe a UF (2 letras).").toUpperCase(),
  // Derivados do simulador no momento do envio (lib/financeiro.ts).
  percentualEntrada: numeroPositivo,
  valorCredito: numeroPositivo,
  prazoMeses: z.number().int().min(120).max(420),
  parcelaEstimada: numeroPositivo,
});

export const leadHomeEquitySchema = z.object({
  ...camposComuns,
  renda: numeroPositivo,
  tipoRemuneracao: z.enum(["Assalariado", "Empresário / Autônomo"]),
  objetivoCredito: z.enum([
    "Investir no meu negócio",
    "Quitação de dívidas caras",
    "Reformas e construções",
    "Planejamento sucessório",
    "Consumo",
  ]),
  tipoImovel: z.enum(["Apartamento", "Casa", "Terreno em condomínio", "Galpão", "Sala Comercial", "Loja"]),
  cep: z.string().transform((v) => v.replace(/\D/g, "")).refine((v) => v.length === 8, "CEP inválido."),
  numero: z.string().trim().min(1, "Informe o número."),
  areaM2: numeroPositivo,
  valorImovel: numeroPositivo,
  imovelQuitado: z.boolean(),
  saldoDevedor: numeroPositivo.optional(),
  // Derivados do simulador no momento do envio.
  valorCreditoEstimado: numeroPositivo,
  prazoMeses: z.number().int().min(60).max(240),
  parcelaEstimada: numeroPositivo,
}).superRefine((dados, ctx) => {
  if (!dados.imovelQuitado && dados.saldoDevedor === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["saldoDevedor"],
      message: "Informe o saldo devedor.",
    });
  }
});

export const leadImovelSchema = z.object({
  ...camposComuns,
  imovelId: z.string().uuid().optional(),
  formaPagamento: z.enum(["financiamento", "a_vista", "fgts_financiamento", "permuta"]).optional(),
  prazoCompra: z.enum(["imediato", "ate_3_meses", "ate_6_meses", "pesquisando"]).optional(),
  possuiEntrada: z.string().optional(),
  valorEntrada: numeroPositivo.optional(),
  jaTemAprovacao: z.boolean().optional(),
  observacoes: z.string().optional(),
});

export const schemaPorTipo = {
  financiamento: leadFinanciamentoSchema,
  "home-equity": leadHomeEquitySchema,
  imoveis: leadImovelSchema,
} as const;

export type LeadTipo = keyof typeof schemaPorTipo;
export type LeadFinanciamentoInput = z.infer<typeof leadFinanciamentoSchema>;
export type LeadHomeEquityInput = z.infer<typeof leadHomeEquitySchema>;
export type LeadImovelInput = z.infer<typeof leadImovelSchema>;
