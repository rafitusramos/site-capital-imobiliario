import "server-only";
import { Resend } from "resend";

/**
 * Casca fina sobre o Resend. Regras:
 * - sem RESEND_API_KEY é no-op (loga uma vez): ambiente local e preview sem
 *   chave não podem quebrar a captação de lead;
 * - NUNCA lança: toda falha vira resultado, depois de console.error;
 * - o cliente é injetável, para os testes não tocarem na rede.
 */

export interface ClienteResend {
  emails: {
    send(payload: {
      from: string;
      to: string;
      subject: string;
      html: string;
      text: string;
      replyTo?: string;
      scheduledAt?: string;
      attachments?: Array<{ filename: string; content: Buffer }>;
    }): Promise<{ data: { id: string } | null; error: { message: string } | null }>;
    cancel(id: string): Promise<{ data: unknown; error: { message: string } | null }>;
  };
}

export interface EmailParaEnviar {
  para: string;
  assunto: string;
  html: string;
  texto: string;
  replyTo?: string;
  /** Resend `scheduledAt`. Sem isso, envia na hora. Ignorado quando há `anexos`. */
  agendarPara?: Date;
  /**
   * Anexos. E-mail com anexo NUNCA é agendado: o Resend não combina `attachments`
   * com `scheduledAt`, então o envio é imediato e `agendarPara` é descartado.
   */
  anexos?: Array<{ nome: string; conteudo: Uint8Array }>;
}

export type ResultadoEnvio =
  | { enviado: true; id: string }
  | { enviado: false; motivo: "sem-chave" }
  | { enviado: false; motivo: "falha"; erro: string };

export type ResultadoCancelamento = { cancelado: true } | { cancelado: false; erro: string };

export interface Emailer {
  enviar(email: EmailParaEnviar): Promise<ResultadoEnvio>;
  cancelar(id: string): Promise<ResultadoCancelamento>;
}

function mensagem(erro: unknown): string {
  if (erro instanceof Error) return erro.message;
  if (erro && typeof erro === "object" && "message" in erro) return String((erro as { message: unknown }).message);
  return String(erro);
}

export function criarEmailer(config: {
  chave: string | undefined;
  remetente: string;
  cliente?: ClienteResend;
}): Emailer {
  let avisouSemChave = false;
  const semChave = () => {
    if (!avisouSemChave) {
      avisouSemChave = true;
      console.warn("[email] RESEND_API_KEY ausente: e-mails não serão enviados.");
    }
  };
  const cliente = (): ClienteResend => config.cliente ?? (new Resend(config.chave) as unknown as ClienteResend);

  return {
    async enviar(email) {
      if (!config.chave) {
        semChave();
        return { enviado: false, motivo: "sem-chave" };
      }
      try {
        const anexos = email.anexos ?? [];
        const { data, error } = await cliente().emails.send({
          from: config.remetente,
          to: email.para,
          subject: email.assunto,
          html: email.html,
          text: email.texto,
          ...(email.replyTo ? { replyTo: email.replyTo } : {}),
          ...(email.agendarPara && anexos.length === 0 ? { scheduledAt: email.agendarPara.toISOString() } : {}),
          ...(anexos.length > 0
            ? { attachments: anexos.map((a) => ({ filename: a.nome, content: Buffer.from(a.conteudo) })) }
            : {}),
        });
        if (error || !data) {
          const erro = error?.message ?? "resposta sem id";
          console.error("[email] falha ao enviar:", erro);
          return { enviado: false, motivo: "falha", erro };
        }
        return { enviado: true, id: data.id };
      } catch (e) {
        console.error("[email] exceção ao enviar:", e);
        return { enviado: false, motivo: "falha", erro: mensagem(e) };
      }
    },

    async cancelar(id) {
      if (!config.chave) {
        semChave();
        return { cancelado: false, erro: "sem-chave" };
      }
      try {
        const { error } = await cliente().emails.cancel(id);
        if (error) {
          console.error("[email] falha ao cancelar:", error.message);
          return { cancelado: false, erro: error.message };
        }
        return { cancelado: true };
      } catch (e) {
        console.error("[email] exceção ao cancelar:", e);
        return { cancelado: false, erro: mensagem(e) };
      }
    },
  };
}

const REMETENTE_PADRAO = "RT Capital Imobiliário <contato@rtcapitalimobiliario.com.br>";

let emailerPadrao: Emailer | null = null;

/** Instância que lê as variáveis de ambiente (uma por processo). */
export function emailerDoAmbiente(): Emailer {
  emailerPadrao ??= criarEmailer({
    chave: process.env.RESEND_API_KEY,
    remetente: process.env.EMAIL_REMETENTE ?? REMETENTE_PADRAO,
  });
  return emailerPadrao;
}
