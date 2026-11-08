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

/** Data `AAAA-MM-DD` do input type="date", ou null. Rejeita data impossível (2026-13-45). */
const dataOpcional = opcional.refine((valor) => {
  if (valor === null) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}, "Informe a data no formato AAAA-MM-DD.");

const booleanoOpcional = z
  .union([z.boolean(), z.null(), z.undefined()])
  .transform((valor) => valor ?? null);

const valorMonetario = numeroOpcional.refine(
  (valor) => valor === null || valor >= 0,
  "O valor não pode ser negativo.",
);

/** Campos que existem nas duas modalidades. */
const camposComuns = {
  titulo: z.string().trim().min(3, "Informe um título."),
  slug: z
    .string()
    .trim()
    .min(3, "Informe um slug.")
    .regex(SLUG_REGEX, "Use apenas letras minúsculas, números e hífens (kebab-case)."),
  tipo_id: z.string().uuid("Selecione o tipo do imóvel."),

  bairro: opcional,
  cidade: opcional,
  estado: opcional,
  endereco: opcional,
  cep: opcional,

  valor_sob_consulta: z.boolean().default(false),

  video_youtube_url: opcional,
  // uploadDate do VideoObject (CLAUDE.md): sem ela o JSON-LD do vídeo não sai.
  video_data_publicacao: dataOpcional.default(null),

  descricao_breve: opcional,
  descricao_completa: opcional,

  seo_title: opcional,
  seo_description: opcional,

  ordem: z.number().int().default(0),
};

const lancamentoSchema = z
  .object({
    ...camposComuns,
    modalidade: z.literal("lancamento"),
    fase_id: z.string().uuid("Selecione a fase do imóvel."),

    area_min: numeroOpcional,
    area_max: numeroOpcional,
    dormitorios_min: inteiroOpcional,
    dormitorios_max: inteiroOpcional,
    banheiros_min: inteiroOpcional,
    banheiros_max: inteiroOpcional,
    vagas_min: inteiroOpcional,
    vagas_max: inteiroOpcional,

    valor_a_partir_de: numeroOpcional,
    previsao_entrega: opcional,

    construtora: opcional,
    construtora_logo_url: opcional,

    descricao_unidades: opcional,
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

/**
 * Imóvel pronto = unidade única. `fase_id` é opcional aqui de propósito: quem
 * define é o servidor (a fase `pronto`), e o trigger da migration 026 garante.
 */
const prontoSchema = z
  .object({
    ...camposComuns,
    modalidade: z.literal("pronto"),
    fase_id: opcional,

    area_util: numeroOpcional,
    area_total: numeroOpcional,
    dormitorios: inteiroOpcional,
    suites: inteiroOpcional,
    banheiros: inteiroOpcional,
    vagas: inteiroOpcional,
    valor_venda: valorMonetario,
    valor_condominio: valorMonetario,
    valor_iptu: valorMonetario,
    nome_condominio: opcional,
    andar: inteiroOpcional,
    mobiliado: booleanoOpcional,
    ano_construcao: inteiroOpcional.refine(
      (valor) => valor === null || (valor >= 1800 && valor <= 2100),
      "Informe um ano entre 1800 e 2100.",
    ),
    exibir_endereco: z.boolean().default(false),
  })
  .superRefine((dados, ctx) => {
    if (dados.fase_id !== null && !z.string().uuid().safeParse(dados.fase_id).success) {
      ctx.addIssue({ code: "custom", path: ["fase_id"], message: "Selecione a fase do imóvel." });
    }
    if (dados.area_util !== null && dados.area_total !== null && dados.area_total < dados.area_util) {
      ctx.addIssue({
        code: "custom",
        path: ["area_total"],
        message: "A área total não pode ser menor que a área útil.",
      });
    }
    if (dados.dormitorios !== null && dados.suites !== null && dados.suites > dados.dormitorios) {
      ctx.addIssue({
        code: "custom",
        path: ["suites"],
        message: "As suítes não podem passar do número de dormitórios.",
      });
    }
  });

/**
 * Payload sem `modalidade` é lançamento: é o formato anterior à migration 026.
 * O preprocess só preenche o discriminador e deixa o resto para o schema.
 */
export const imovelFormSchema = z.preprocess(
  (entrada) =>
    entrada && typeof entrada === "object" && !("modalidade" in entrada)
      ? { ...entrada, modalidade: "lancamento" }
      : entrada,
  z.discriminatedUnion("modalidade", [lancamentoSchema, prontoSchema]),
);

export type ImovelFormInput = z.infer<typeof imovelFormSchema>;
export type ImovelLancamentoInput = Extract<ImovelFormInput, { modalidade: "lancamento" }>;
export type ImovelProntoInput = Extract<ImovelFormInput, { modalidade: "pronto" }>;
/**
 * O que o chamador envia: `modalidade` pode faltar em lançamento (formato
 * anterior à 026) e `video_data_publicacao` é opcional nas duas.
 */
export type ImovelFormEntrada =
  | (Omit<ImovelLancamentoInput, "modalidade" | "video_data_publicacao"> & {
      modalidade?: "lancamento";
      video_data_publicacao?: string | null;
    })
  | (Omit<ImovelProntoInput, "video_data_publicacao"> & { video_data_publicacao?: string | null });

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
