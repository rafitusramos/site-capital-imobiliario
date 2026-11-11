import { z } from "zod";
import { isoDataNaoFutura } from "@/lib/data-nascimento";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const opcional = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((valor) => (valor ? valor : null));

/**
 * Data de revisão: `aaaa-mm-dd` real, não futura (hoje em São Paulo). Vazio = null.
 * "Não anterior à publicação" depende de `published_at` (que não vem do formulário)
 * e é conferido na action (`revisaoCoerente`) e na constraint da migration 034.
 */
const dataRevisao = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((valor) => (valor ? valor : null))
  .refine((valor) => valor === null || /^\d{4}-\d{2}-\d{2}$/.test(valor), {
    message: "Informe a data de revisão em dia/mês/ano válidos.",
  })
  .refine((valor) => valor === null || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || isoDataNaoFutura(valor), {
    message: "A data de revisão deve ser uma data real e não pode ser futura.",
  });

export const postFormSchema = z.object({
  title: z.string().trim().min(3, "Informe um título."),
  slug: z
    .string()
    .trim()
    .min(3, "Informe um slug.")
    .regex(SLUG_REGEX, "Use apenas letras minúsculas, números e hífens (kebab-case)."),
  excerpt: opcional,
  content: z.string().trim().min(1, "O conteúdo não pode ficar vazio."),
  cover_image: opcional,
  category_id: z.string().uuid("Selecione uma categoria."),
  rotulo: opcional,
  cta_pagina: opcional,
  seo_title: opcional,
  seo_description: opcional,
  revisado_em: dataRevisao,
});

export type PostFormInput = z.infer<typeof postFormSchema>;
