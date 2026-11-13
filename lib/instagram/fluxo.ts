// Núcleo puro de decisão da sequência comentário -> DM (spec §6.1, §6.2,
// §7.2, §7.3 e §7.5). Recebe a automação e o estado da pessoa e devolve a
// lista de ações; quem executa é o motor de envio.

import { payloadBotao } from "./mensagens";
import type { Automacao, MensagemSaida, Situacao } from "./tipos";

export type Acao =
  | { tipo: "resposta_publica"; comentarioId: string; texto: string }
  | {
      tipo: "resposta_privada";
      comentarioId: string;
      mensagem: MensagemSaida;
      /** Só é aplicada quando o envio dá certo. */
      situacao?: Situacao;
    }
  | { tipo: "mensagem"; mensagem: MensagemSaida; situacao?: Situacao }
  | { tipo: "agendar_lembrete"; enviarApos: Date }
  | { tipo: "cancelar_lembretes" }
  | { tipo: "aviso"; texto: string };

const MARGEM_JANELA_MS = 5 * 60_000;
const HORA_MS = 3600_000;

/** min(agora + horas, janelaAte - 5 min). */
export function momentoDoLembrete(agora: Date, horas: number, janelaAte: Date): Date {
  const alvo = agora.getTime() + horas * HORA_MS;
  const limite = janelaAte.getTime() - MARGEM_JANELA_MS;
  return new Date(Math.min(alvo, limite));
}

function msgB1(a: Automacao, textoDm: string, id: string): MensagemSaida {
  return { texto: textoDm, botao: { tipo: "postback", titulo: a.dm1Botao, payload: payloadBotao("b1", id) } };
}

function msgSeguir(a: Automacao, texto: string, id: string): MensagemSaida {
  return {
    texto,
    botao: { tipo: "postback", titulo: a.seguirBotao, payload: payloadBotao("seguir", id) },
  };
}

function msgLink(a: Automacao, texto: string, urlCurta: string): MensagemSaida {
  return { texto, botao: { tipo: "link", titulo: a.linkBotao, url: urlCurta } };
}

export function decidirAoComentar(
  a: Automacao,
  p: { id: string; situacao: Situacao | null; comentarios: number },
  ctx: { comentarioId: string; segue: boolean | null; urlCurta: string; sortear: (n: number) => number },
): Acao[] {
  if (p.comentarios >= 3) return [{ tipo: "aviso", texto: "comentou 3+ vezes" }];

  const acoes: Acao[] = [];
  if (a.responderPublico && a.frasesPublicas.length > 0) {
    acoes.push({
      tipo: "resposta_publica",
      comentarioId: ctx.comentarioId,
      texto: a.frasesPublicas[ctx.sortear(a.frasesPublicas.length)],
    });
  }

  const privada = (mensagem: MensagemSaida, situacao?: Situacao): Acao => ({
    tipo: "resposta_privada",
    comentarioId: ctx.comentarioId,
    mensagem,
    ...(situacao ? { situacao } : {}),
  });

  switch (p.situacao) {
    case null:
      acoes.push(privada(msgB1(a, a.dm1Texto, p.id), "aguardando_botao"));
      break;
    case "aguardando_botao":
      acoes.push(privada(msgB1(a, a.retomadaBotaoTexto, p.id)));
      break;
    case "aguardando_seguir":
      // segue === null conta como segue (falha aberta).
      if (ctx.segue === false) {
        acoes.push(privada(msgSeguir(a, a.retomadaSeguirTexto, p.id)));
      } else {
        acoes.push(privada(msgLink(a, a.retomadaLinkTexto, ctx.urlCurta), "link_enviado"));
      }
      break;
    case "link_enviado":
    case "link_aberto":
      acoes.push(privada(msgLink(a, a.retomadaLinkTexto, ctx.urlCurta)));
      break;
  }
  return acoes;
}

function lembreteApos(a: Automacao, agora: Date, janelaAte: Date): Acao[] {
  if (!a.lembreteAtivo) return [];
  return [
    { tipo: "cancelar_lembretes" },
    { tipo: "agendar_lembrete", enviarApos: momentoDoLembrete(agora, a.lembreteHoras, janelaAte) },
  ];
}

export function decidirAoTocar(
  a: Automacao,
  p: { id: string; situacao: Situacao },
  botao: "b1" | "seguir",
  ctx: { segue: boolean | null; urlCurta: string; agora: Date; janelaAte: Date },
): Acao[] {
  const naoSegue = ctx.segue === false;

  if (botao === "seguir" && naoSegue) {
    // Insiste sem novo lembrete: já há um por sequência.
    return [{ tipo: "mensagem", mensagem: msgSeguir(a, a.seguirInsisteTexto, p.id) }];
  }

  if (botao === "b1" && a.exigirSeguir && naoSegue) {
    return [
      { tipo: "mensagem", mensagem: msgSeguir(a, a.seguirTexto, p.id), situacao: "aguardando_seguir" },
      ...lembreteApos(a, ctx.agora, ctx.janelaAte),
    ];
  }

  return [
    { tipo: "mensagem", mensagem: msgLink(a, a.linkTexto, ctx.urlCurta), situacao: "link_enviado" },
    ...lembreteApos(a, ctx.agora, ctx.janelaAte),
  ];
}

export function decidirLembrete(
  a: Automacao,
  p: { situacao: Situacao; janelaAte: string | null },
  ctx: { urlCurta: string; agora: Date },
): Acao[] {
  if (p.situacao !== "link_enviado" && p.situacao !== "aguardando_seguir") return [];
  if (!p.janelaAte || new Date(p.janelaAte).getTime() <= ctx.agora.getTime()) return [];
  return [
    { tipo: "mensagem", mensagem: msgLink(a, a.lembreteTexto, ctx.urlCurta), situacao: "link_enviado" },
  ];
}
