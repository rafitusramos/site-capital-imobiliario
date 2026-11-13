import { z } from "zod";

// Limites da Meta (spec do módulo Instagram): mensagem com botão <= 640,
// título de botão <= 20, resposta pública <= 300.
export const LIMITE_TEXTO_COM_BOTAO = 640;
export const LIMITE_TITULO_BOTAO = 20;
export const LIMITE_RESPOSTA_PUBLICA = 300;

const textoComBotao = z
  .string()
  .trim()
  .min(1, "Preencha o texto da mensagem.")
  .max(LIMITE_TEXTO_COM_BOTAO, `A mensagem pode ter no máximo ${LIMITE_TEXTO_COM_BOTAO} caracteres.`);

const tituloBotao = z
  .string()
  .trim()
  .min(1, "Preencha o título do botão.")
  .max(LIMITE_TITULO_BOTAO, `O título do botão pode ter no máximo ${LIMITE_TITULO_BOTAO} caracteres.`);

export const automacaoSchema = z
  .object({
    nome: z.string().trim().min(1, "Dê um nome à automação.").max(80, "O nome pode ter no máximo 80 caracteres."),
    alvo: z.enum(["especifica", "qualquer", "proxima"]),
    midiaId: z.string().trim().min(1).nullable().optional(),
    midiaPermalink: z.string().nullable().optional(),
    midiaThumb: z.string().nullable().optional(),
    /** null = qualquer palavra. */
    palavras: z
      .array(z.string().trim().min(1, "Palavra vazia.").max(40, "Cada palavra pode ter no máximo 40 caracteres."))
      .min(1, "Informe ao menos uma palavra-chave ou marque \"qualquer palavra\".")
      .nullable(),
    responderPublico: z.boolean(),
    frasesPublicas: z.array(
      z.string().trim().min(1).max(LIMITE_RESPOSTA_PUBLICA, `A resposta pública pode ter no máximo ${LIMITE_RESPOSTA_PUBLICA} caracteres.`),
    ),
    dm1Texto: textoComBotao,
    dm1Botao: tituloBotao,
    exigirSeguir: z.boolean(),
    seguirTexto: textoComBotao,
    seguirBotao: tituloBotao,
    seguirInsisteTexto: textoComBotao,
    linkTexto: textoComBotao,
    linkBotao: tituloBotao,
    linkUrl: z
      .string()
      .trim()
      .url("Informe um link válido.")
      .refine((v) => v.startsWith("https://"), "O link precisa começar com https://."),
    lembreteAtivo: z.boolean(),
    lembreteHoras: z.number().int("Use um número inteiro de horas.").min(1, "Mínimo de 1 hora.").max(23, "Máximo de 23 horas."),
    lembreteTexto: textoComBotao,
    retomadaBotaoTexto: textoComBotao,
    retomadaSeguirTexto: textoComBotao,
    retomadaLinkTexto: textoComBotao,
  })
  .superRefine((v, ctx) => {
    if (v.alvo === "especifica" && !v.midiaId) {
      ctx.addIssue({ code: "custom", path: ["midiaId"], message: "Escolha a publicação." });
    }
    if (v.responderPublico && v.frasesPublicas.length < 1) {
      ctx.addIssue({ code: "custom", path: ["frasesPublicas"], message: "Informe ao menos uma frase de resposta pública." });
    }
  });

export type AutomacaoInput = z.input<typeof automacaoSchema> & { id?: string };
