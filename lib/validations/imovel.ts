import { z } from "zod";

/**
 * Schemas Zod do formulário de admin de imóveis. Mesmo padrão de
 * lib/validations/post.ts: `opcional` normaliza string vazia para null,
 * SLUG_REGEX é idêntico ao usado no blog (kebab-case).
 */

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const opcional = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((valor) => (valor ? valor : null));

const numeroOpcional = z
  .union([z.number(), z.nan(), z.literal(""), z.undefined(), z.null()])
  .transform((valor) => {
    if (valor === "" || valor === undefined || valor === null || Number.isNaN(valor)) return null;
    return valor;
  });

const inteiroOpcional = numeroOpcional.refine(
  (valor) => valor === null || Number.isInteger(valor),
  "Informe um número inteiro.",
);

/** Refinement genérico de faixa: campo `_max` não pode ser menor que `_min`. */
function refinarFaixa<T extends Record<string, unknown>>(
  dados: T,
  ctx: z.RefinementCtx,
  min: keyof T,
  max: keyof T,
  mensagem: string,
) {
  const valorMin = dados[min] as number | null;
  const valorMax = dados[max] as number | null;
  if (valorMin !== null && valorMax !== null && valorMax < valorMin) {
    ctx.addIssue({ code: "custom", path: [max as string], message: mensagem });
  }
}

export const imovelFormSchema = z
  .object({
    titulo: z.string().trim().min(3, "Informe um título."),
    slug: z
      .string()
      .trim()
      .min(3, "Informe um slug.")
      .regex(SLUG_REGEX, "Use apenas letras minúsculas, números e hífens (kebab-case)."),
    tipo: z.enum(["apartamento", "vila", "loteamento"]),
    fase: z.enum(["pre_lancamento", "lancamento", "em_construcao", "pronto"]),

    bairro: opcional,
    cidade: opcional,
    estado: opcional,
    endereco: opcional,
    cep: opcional,

    area_min: numeroOpcional,
    area_max: numeroOpcional,
    dormitorios_min: inteiroOpcional,
    dormitorios_max: inteiroOpcional,
    banheiros_min: inteiroOpcional,
    banheiros_max: inteiroOpcional,
    vagas_min: inteiroOpcional,
    vagas_max: inteiroOpcional,

    valor_a_partir_de: numeroOpcional,
    valor_sob_consulta: z.boolean().default(false),
    previsao_entrega: opcional,

    video_youtube_url: opcional,

    construtora: opcional,
    construtora_logo_url: opcional,

    descricao_breve: opcional,
    descricao_completa: opcional,
    descricao_unidades: opcional,

    seo_title: opcional,
    seo_description: opcional,

    ordem: z.number().int().default(0),
  })
  .superRefine((dados, ctx) => {
    refinarFaixa(dados, ctx, "area_min", "area_max", "A área máxima não pode ser menor que a mínima.");
    refinarFaixa(
      dados,
      ctx,
      "dormitorios_min",
      "dormitorios_max",
      "O máximo de dormitórios não pode ser menor que o mínimo.",
    );
    refinarFaixa(
      dados,
      ctx,
      "banheiros_min",
      "banheiros_max",
      "O máximo de banheiros não pode ser menor que o mínimo.",
    );
    refinarFaixa(dados, ctx, "vagas_min", "vagas_max", "O máximo de vagas não pode ser menor que o mínimo.");
  });

export type ImovelFormInput = z.infer<typeof imovelFormSchema>;

export const tipologiaSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().trim().min(1, "Informe um nome para a tipologia."),
  area: numeroOpcional,
  dormitorios: inteiroOpcional,
  suites: inteiroOpcional,
  banheiros: inteiroOpcional,
  vagas: inteiroOpcional,
  valor_a_partir_de: numeroOpcional,
  planta_url: opcional,
  ordem: z.number().int().default(0),
});
export type TipologiaInput = z.infer<typeof tipologiaSchema>;
export const tipologiasFormSchema = z.array(tipologiaSchema);

export const diferencialSchema = z.object({
  id: z.string().uuid().optional(),
  grupo: z.enum(["lazer", "diferencial"]),
  nome: z.string().trim().min(1, "Informe um nome."),
  icone: opcional,
  ordem: z.number().int().default(0),
});
export type DiferencialInput = z.infer<typeof diferencialSchema>;
export const diferenciaisFormSchema = z.array(diferencialSchema);

export const faqSchema = z.object({
  id: z.string().uuid().optional(),
  pergunta: z.string().trim().min(1, "Informe a pergunta."),
  resposta: z.string().trim().min(1, "Informe a resposta."),
  ordem: z.number().int().default(0),
});
export type FaqInput = z.infer<typeof faqSchema>;
export const faqsFormSchema = z.array(faqSchema);

export const imagemSchema = z.object({
  id: z.string().uuid().optional(),
  url: z.string().min(1),
  ambiente: opcional,
  grupo: z.enum(["empreendimento", "decorado", "planta", "implantacao"]),
  ordem: z.number().int().default(0),
  destaque: z.boolean().default(false),
});
export type ImagemInput = z.infer<typeof imagemSchema>;
export const imagensFormSchema = z.array(imagemSchema);
