import { z } from "zod";

/**
 * Corpo aceito pela rota /api/admin/crm/simulacao. Tudo que vem do navegador é
 * tratado como hostil: números finitos, tamanhos limitados, logo só PNG em
 * data URI. Nome e e-mail do cliente NÃO existem aqui de propósito: saem
 * sempre do banco.
 */

export const LIMITE_CORPO_BYTES = 4 * 1024 * 1024;
/** Teto de um logo (data URI). Os recortados a 600 dpi ficam na casa de dezenas de KB. */
export const LIMITE_LOGO_CHARS = 400_000;
const MAX_BANCOS = 12;
const MAX_MESES = 600;

const positivo = z.number().finite().positive().max(1e10);
const valorDinheiro = z.number().finite().min(0).max(1e10);

const bancoSchema = z.object({
  nome: z.string().trim().min(1).max(60),
  taxa: z.number().finite().min(0).max(1000),
  cet: z.number().finite().min(0).max(1000),
  custo_total: valorDinheiro,
  prazo: z.number().int().min(1).max(MAX_MESES),
  indexador: z.string().trim().min(1).max(12),
  sistema: z.string().trim().min(1).max(12),
  primeira: valorDinheiro,
  ultima: valorDinheiro,
  parcelas: z.array(valorDinheiro.nullable()).max(MAX_MESES),
  logo: z
    .string()
    .max(LIMITE_LOGO_CHARS)
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/, "Logo inválido.")
    .nullable(),
});

export const dadosSimulacaoSchema = z
  .object({
    data: z.string().regex(/^(\d{2}\/\d{2}\/\d{4})?$/, "Data inválida."),
    valor_imovel: positivo,
    valor_financiamento: positivo,
    renda_media: valorDinheiro.nullable(),
    meses: z.array(z.number().int().min(1).max(MAX_MESES)).min(1).max(MAX_MESES),
    bancos: z.array(bancoSchema).min(1).max(MAX_BANCOS),
  })
  .superRefine((d, ctx) => {
    d.bancos.forEach((b, i) => {
      if (b.parcelas.length !== d.meses.length) {
        ctx.addIssue({ code: "custom", path: ["bancos", i, "parcelas"], message: "Parcelas não batem com os meses." });
      }
    });
  });

/**
 * Quatro ações (docs/crm-spec.md §3.7):
 * - previa / anexar: levam os dados lidos do PDF da Creditas (a prévia não grava; anexar grava);
 * - enviar / obter: levam só o `simulacaoId` do PDF JÁ gravado. Enviar nunca regera o
 *   documento a partir do que o navegador manda; obter só devolve o PDF para a prévia.
 */
export const corpoSimulacaoSchema = z.discriminatedUnion("acao", [
  z.object({ acao: z.literal("previa"), leadId: z.string().uuid(), dados: dadosSimulacaoSchema }),
  z.object({ acao: z.literal("anexar"), leadId: z.string().uuid(), dados: dadosSimulacaoSchema }),
  z.object({ acao: z.literal("enviar"), leadId: z.string().uuid(), simulacaoId: z.string().uuid() }),
  z.object({ acao: z.literal("obter"), leadId: z.string().uuid(), simulacaoId: z.string().uuid() }),
]);

export type CorpoSimulacao = z.infer<typeof corpoSimulacaoSchema>;
