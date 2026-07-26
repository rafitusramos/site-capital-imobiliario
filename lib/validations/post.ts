import { z } from "zod";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const opcional = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((valor) => (valor ? valor : null));

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
});

export type PostFormInput = z.infer<typeof postFormSchema>;
