// Motor do módulo comentário -> DM (spec §6, §7.2–7.5, §7.7). Orquestra as
// decisões puras de fluxo.ts sobre duas dependências injetáveis: o repositório
// (Supabase) e o cliente da Graph API. Nada aqui conhece Supabase nem fetch.

import { lerEventoGravado, type EventoIg } from "./eventos";
import { ehTemporario, motivoLegivel, proximaTentativa, type ErroGraph } from "./fila";
import { decidirAoComentar, decidirAoTocar, decidirLembrete, type Acao } from "./fluxo";
import type { GraphIg, ResultadoGraph } from "./graph";
import { destinoComUtm, ehRoboDePrevia, gerarCodigo, urlCurta } from "./link";
import { lerPayload } from "./mensagens";
import { escolherAutomacao } from "./selecao";
import type { Automacao, MensagemSaida, Participacao, Situacao } from "./tipos";

const HORA_MS = 3600_000;
const LIMITE_PADRAO = 20;
const DIA_MS = 24 * HORA_MS;
const ESPERA_REPROCESSO_MS = 2 * 60_000;

// ---------------------------------------------------------------------------
// Contrato do repositório (implementado em repositorio.ts)
// ---------------------------------------------------------------------------

export type TipoEnvio = "resposta_privada" | "resposta_publica" | "mensagem" | "lembrete";

/** O que viaja no jsonb de ig_envios.payload. A situação só é aplicada se o envio der certo. */
export interface PayloadEnvio {
  mensagem?: MensagemSaida;
  texto?: string;
  situacao?: Situacao;
}

export interface NovoEnvio {
  chave: string;
  contatoId: string;
  participacaoId?: string | null;
  tipo: TipoEnvio;
  comentarioId?: string | null;
  payload?: PayloadEnvio | null;
  enviarApos: Date;
}

/** Envio reservado, já com o igsid do destinatário. */
export interface Envio {
  id: string;
  chave: string;
  contatoId: string;
  igsid: string;
  participacaoId: string | null;
  tipo: TipoEnvio;
  comentarioId: string | null;
  payload: PayloadEnvio | null;
  /** Falhas anteriores a esta tentativa. */
  tentativas: number;
}

export type ConclusaoEnvio =
  | { estado: "enviado"; metaId: string | null }
  | { estado: "cancelado" }
  | { estado: "pendente"; enviarApos: Date; tentativas: number; erro: string }
  | { estado: "falhou"; tentativas: number; erro: string };

export interface NovaMensagem {
  contatoId: string;
  participacaoId: string | null;
  direcao: "entrada" | "saida" | "dono" | "sistema";
  tipo: "comentario" | "texto" | "botao" | "link_aberto" | "resposta_publica" | "aviso";
  texto: string | null;
  metaId: string | null;
}

export interface CamposParticipacao {
  situacao?: Situacao;
  janelaAte?: string | null;
  linkEnviadoEm?: string;
  linkAbertoEm?: string;
  falhaMotivo?: string | null;
  falhaEm?: string | null;
}

export interface RepositorioIg {
  conta(): Promise<{ igUserId: string; token: string } | null>;
  automacoesAtivas(): Promise<Automacao[]>;
  /** `null` = participação de automação excluída (migration 037): trata como não encontrada. */
  automacao(id: string | null): Promise<Automacao | null>;
  vincularProxima(automacaoId: string, midiaId: string): Promise<void>;
  contato(igsid: string): Promise<{ id: string } | null>;
  /** Upsert por igsid; renova `ultima_interacao_em`. */
  salvarContato(c: {
    igsid: string;
    username?: string;
    nome?: string;
    fotoUrl?: string;
    segue?: boolean | null;
  }): Promise<{ id: string }>;
  participacao(contatoId: string, automacaoId: string, midiaId: string): Promise<Participacao | null>;
  participacaoPorId(id: string): Promise<Participacao | null>;
  participacaoPorCodigo(codigo: string): Promise<Participacao | null>;
  participacoesDoContato(contatoId: string): Promise<Participacao[]>;
  /**
   * Cria em `aguardando_botao` com 1 comentário, ou incrementa. Idempotente por `comentarioId`:
   * se a participação já contou esse comentário, não incrementa e devolve a situação de antes
   * gravada na primeira vez (`null` = era nova).
   */
  contarComentario(p: {
    comentarioId: string;
    contatoId: string;
    automacaoId: string;
    midiaId: string;
    codigo: string;
  }): Promise<{ participacao: Participacao; situacaoAntes: Situacao | null }>;
  atualizarParticipacao(id: string, campos: CamposParticipacao): Promise<void>;
  /** Ignora `metaId` repetido. */
  registrarMensagem(m: NovaMensagem): Promise<void>;
  /** Procura em ig_mensagens.meta_id e em ig_envios.meta_id. */
  mensagemConhecida(metaId: string): Promise<boolean>;
  /** false se a `chave` já existe. */
  enfileirar(e: NovoEnvio): Promise<boolean>;
  cancelarLembretes(participacaoId: string): Promise<void>;
  /** Há envio do contato `processando`, ou `enviado` desde `desde`? (eco do nosso próprio envio) */
  envioRecente(contatoId: string, desde: Date): Promise<boolean>;
  reservarEnvios(limite: number): Promise<Envio[]>;
  concluirEnvio(id: string, r: ConclusaoEnvio): Promise<void>;
  registrarClique(participacaoId: string, ua: string | null): Promise<void>;
  /** Apaga o texto/payload guardado do evento (privacidade); `chave` = chaveDoEvento. */
  descartarConteudo(chave: string): Promise<void>;
  /** Sem erro: grava `processado_em`. Com erro: grava o erro, soma 1 em `tentativas` e deixa `processado_em` nulo (reprocessável). */
  marcarEvento(chave: string, erro?: string): Promise<void>;
  /** Eventos ainda não processados (inclui os que falharam), recebidos entre `desde` e `ate`, com payload e `tentativas < 3`. */
  eventosPendentes(desde: Date, ate: Date, limite: number): Promise<{ chave: string; payload: unknown }[]>;
  /** Grava os eventos do webhook (`on conflict do nothing`) e devolve só as chaves NOVAS. */
  registrarEventos(eventos: { chave: string; payload: unknown }[]): Promise<string[]>;
  /** `ig_conta.ultimo_evento_em = now()`. */
  tocarUltimoEvento(): Promise<void>;
}

export interface DependenciasMotor {
  repo: RepositorioIg;
  graph: GraphIg | null;
  agora: () => Date;
  sortear: (n: number) => number;
}

export interface Motor {
  processarEvento(e: EventoIg): Promise<void>;
  /** Reprocessa eventos que ficaram sem processar (queda no meio, erro). Chamado pelo disparador, nunca por dentro de um evento. */
  reprocessarPendentes(limite?: number): Promise<number>;
  dispararFila(limite?: number): Promise<{ enviados: number; falhas: number }>;
  registrarClique(codigo: string, ua: string | null): Promise<string | null>;
}

/** Chave de ig_eventos: o tipo na frente evita colisão entre ids de comentário e de mensagem. */
export function chaveDoEvento(e: EventoIg): string {
  return `${e.tipo}:${e.chave}`;
}

function mensagemDe(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro);
}

export function criarMotor(dep: DependenciasMotor): Motor {
  const { repo, graph, agora, sortear } = dep;

  /** Executa as ações decididas por fluxo.ts: enfileira, cancela, agenda e registra. */
  async function executar(
    acoes: Acao[],
    ctx: {
      contatoId: string;
      participacaoId: string;
      chaveMensagem: string;
      chaveLembrete: string;
    },
  ): Promise<void> {
    for (const acao of acoes) {
      switch (acao.tipo) {
        case "resposta_publica":
          await repo.enfileirar({
            chave: `c:${acao.comentarioId}:publica`,
            contatoId: ctx.contatoId,
            participacaoId: ctx.participacaoId,
            tipo: "resposta_publica",
            comentarioId: acao.comentarioId,
            payload: { texto: acao.texto },
            enviarApos: agora(),
          });
          break;
        case "resposta_privada":
          await repo.enfileirar({
            chave: `c:${acao.comentarioId}:privada`,
            contatoId: ctx.contatoId,
            participacaoId: ctx.participacaoId,
            tipo: "resposta_privada",
            comentarioId: acao.comentarioId,
            payload: { mensagem: acao.mensagem, ...(acao.situacao ? { situacao: acao.situacao } : {}) },
            enviarApos: agora(),
          });
          break;
        case "mensagem":
          await repo.enfileirar({
            chave: ctx.chaveMensagem,
            contatoId: ctx.contatoId,
            participacaoId: ctx.participacaoId,
            tipo: "mensagem",
            payload: { mensagem: acao.mensagem, ...(acao.situacao ? { situacao: acao.situacao } : {}) },
            enviarApos: agora(),
          });
          break;
        case "cancelar_lembretes":
          await repo.cancelarLembretes(ctx.participacaoId);
          break;
        case "agendar_lembrete":
          await repo.enfileirar({
            chave: ctx.chaveLembrete,
            contatoId: ctx.contatoId,
            participacaoId: ctx.participacaoId,
            tipo: "lembrete",
            enviarApos: acao.enviarApos,
          });
          break;
        case "aviso":
          await repo.registrarMensagem({
            contatoId: ctx.contatoId,
            participacaoId: ctx.participacaoId,
            direcao: "sistema",
            tipo: "aviso",
            texto: acao.texto,
            metaId: null,
          });
          break;
      }
    }
  }

  async function consultarSegue(igsid: string): Promise<boolean | null> {
    if (!graph) return null;
    try {
      return await graph.segue(igsid);
    } catch (e) {
      console.error("[instagram] consulta 'segue' falhou", mensagemDe(e));
      return null;
    }
  }

  /** Nome e foto do contato novo; best effort: falha ou ausência seguem sem. */
  async function consultarPerfil(igsid: string) {
    if (!graph) return null;
    try {
      return await graph.perfil(igsid);
    } catch (e) {
      console.error("[instagram] consulta de perfil falhou", mensagemDe(e));
      return null;
    }
  }

  async function aoComentar(e: Extract<EventoIg, { tipo: "comentario" }>): Promise<void> {
    const conta = await repo.conta();
    // Comentário da própria conta (a resposta pública que demos): não é lead.
    if (conta && e.deId === conta.igUserId) return;
    // Evento já processado (webhook repetido): não conta o comentário duas vezes.
    if (await repo.mensagemConhecida(e.comentarioId)) return;

    const ativas = await repo.automacoesAtivas();
    const precisaDaData = ativas.some((a) => a.alvo === "proxima" && !a.midiaId);
    let midiaCriadaEm: string | null = null;
    if (precisaDaData && graph) {
      try {
        midiaCriadaEm = await graph.midiaCriadaEm(e.midiaId);
      } catch (erro) {
        console.error("[instagram] midiaCriadaEm falhou", mensagemDe(erro));
      }
    }
    const escolha = escolherAutomacao(ativas, { midiaId: e.midiaId, texto: e.texto, midiaCriadaEm });
    if (!escolha) return;
    const { automacao } = escolha;
    if (escolha.vincular) await repo.vincularProxima(automacao.id, e.midiaId);

    const eraNovo = (await repo.contato(e.deId)) === null;
    const perfil = eraNovo ? await consultarPerfil(e.deId) : null;
    const username = perfil?.username ?? e.deUsername;
    const contato = await repo.salvarContato({
      igsid: e.deId,
      ...(username ? { username } : {}),
      ...(perfil?.nome ? { nome: perfil.nome } : {}),
      ...(perfil?.fotoUrl ? { fotoUrl: perfil.fotoUrl } : {}),
    });
    const { participacao, situacaoAntes } = await repo.contarComentario({
      comentarioId: e.comentarioId,
      contatoId: contato.id,
      automacaoId: automacao.id,
      midiaId: e.midiaId,
      codigo: gerarCodigo(),
    });

    let segue: boolean | null = null;
    if (situacaoAntes === "aguardando_seguir" && participacao.comentarios < 3) {
      segue = await consultarSegue(e.deId);
      if (segue !== null) await repo.salvarContato({ igsid: e.deId, segue });
    }

    const acoes = decidirAoComentar(
      automacao,
      { id: participacao.id, situacao: situacaoAntes, comentarios: participacao.comentarios },
      {
        comentarioId: e.comentarioId,
        segue,
        urlCurta: urlCurta(participacao.codigo),
        sortear,
      },
    );
    await executar(acoes, {
      contatoId: contato.id,
      participacaoId: participacao.id,
      chaveMensagem: `c:${e.comentarioId}:privada`,
      chaveLembrete: `l:${e.chave}`,
    });

    // Por último: se algo acima lançar, o evento fica sem `processado_em` e o disparador
    // o reprocessa (reprocessarPendentes). A contagem é travada por `ultimo_comentario_id`
    // (contarComentario): o reprocesso não incrementa de novo e reaproveita a situação
    // de antes; os envios têm chave própria. `mensagemConhecida` só cobre o evento já concluído.
    await repo.registrarMensagem({
      contatoId: contato.id,
      participacaoId: participacao.id,
      direcao: "entrada",
      tipo: "comentario",
      texto: e.texto,
      metaId: e.comentarioId,
    });
    await dispararFila();
  }

  async function aoTocar(e: Extract<EventoIg, { tipo: "botao" }>): Promise<void> {
    const payload = lerPayload(e.payload);
    if (!payload) return;
    if (await repo.mensagemConhecida(e.chave)) return;

    const p = await repo.participacaoPorId(payload.participacaoId);
    if (!p) return;
    const contato = await repo.contato(e.deId);
    if (!contato || contato.id !== p.contatoId) return;
    // Automação pausada ou até apagada-sem-cascata: quem já estava na sequência segue nela.
    const automacao = await repo.automacao(p.automacaoId);
    if (!automacao) return;

    const agoraDt = agora();
    const janelaAte = new Date(agoraDt.getTime() + 24 * HORA_MS);
    await repo.salvarContato({ igsid: e.deId });
    await repo.atualizarParticipacao(p.id, { janelaAte: janelaAte.toISOString() });

    const relevante = payload.acao === "seguir" || (payload.acao === "b1" && automacao.exigirSeguir);
    const segue = relevante ? await consultarSegue(e.deId) : null;
    if (segue !== null) await repo.salvarContato({ igsid: e.deId, segue });

    const acoes = decidirAoTocar(automacao, { id: p.id, situacao: p.situacao }, payload.acao, {
      segue,
      urlCurta: urlCurta(p.codigo),
      agora: agoraDt,
      janelaAte,
    });
    await executar(acoes, {
      contatoId: contato.id,
      participacaoId: p.id,
      chaveMensagem: `b:${e.chave}`,
      chaveLembrete: `l:${e.chave}`,
    });

    await repo.registrarMensagem({
      contatoId: contato.id,
      participacaoId: p.id,
      direcao: "entrada",
      tipo: "botao",
      texto: e.titulo || null,
      metaId: e.chave,
    });
    await dispararFila();
  }

  async function aoReceberTexto(e: Extract<EventoIg, { tipo: "texto" }>): Promise<void> {
    // Eco: a mensagem é da conta; a pessoa é o destinatário.
    const igsidDaPessoa = e.eco ? e.paraId : e.deId;
    if (e.eco && (await repo.mensagemConhecida(e.mid))) return; // nosso próprio envio

    const contato = await repo.contato(igsidDaPessoa);
    const participacoes = contato ? await repo.participacoesDoContato(contato.id) : [];
    if (!contato || participacoes.length === 0) {
      await repo.descartarConteudo(chaveDoEvento(e));
      return;
    }

    if (e.eco) {
      // O eco pode chegar antes de o meta_id do nosso envio ser gravado: se há envio em
      // curso (ou recém-concluído) para esta pessoa, é nosso, não do dono.
      if (await repo.envioRecente(contato.id, new Date(agora().getTime() - 60_000))) return;
      await repo.registrarMensagem({
        contatoId: contato.id,
        participacaoId: null,
        direcao: "dono",
        tipo: "texto",
        texto: e.texto,
        metaId: e.mid,
      });
    } else {
      await repo.salvarContato({ igsid: igsidDaPessoa });
      await repo.registrarMensagem({
        contatoId: contato.id,
        participacaoId: null,
        direcao: "entrada",
        tipo: "texto",
        texto: e.texto,
        metaId: e.mid,
      });
      const janelaAte = new Date(agora().getTime() + 24 * HORA_MS).toISOString();
      for (const p of participacoes) await repo.atualizarParticipacao(p.id, { janelaAte });
    }
    for (const p of participacoes) await repo.cancelarLembretes(p.id);
  }

  async function processarEvento(e: EventoIg): Promise<void> {
    const chave = chaveDoEvento(e);
    let erro: string | undefined;
    try {
      if (e.tipo === "comentario") await aoComentar(e);
      else if (e.tipo === "botao") await aoTocar(e);
      else await aoReceberTexto(e);
    } catch (ex) {
      console.error("[instagram] falha ao processar evento", chave, ex);
      erro = mensagemDe(ex);
    }
    try {
      await repo.marcarEvento(chave, erro);
    } catch (ex) {
      console.error("[instagram] falha ao marcar evento", chave, ex);
    }
  }

  // -------------------------------------------------------------------------
  // Fila
  // -------------------------------------------------------------------------

  async function enviar(g: GraphIg, envio: Envio, mensagem: MensagemSaida | undefined): Promise<ResultadoGraph> {
    const semDados: ResultadoGraph = { ok: false, status: 400, mensagem: "envio sem conteúdo" };
    switch (envio.tipo) {
      case "resposta_publica":
        return envio.comentarioId && envio.payload?.texto
          ? g.responderComentario(envio.comentarioId, envio.payload.texto)
          : semDados;
      case "resposta_privada":
        return envio.comentarioId && mensagem ? g.respostaPrivada(envio.comentarioId, mensagem) : semDados;
      default:
        return mensagem ? g.mensagem(envio.igsid, mensagem) : semDados;
    }
  }

  async function processarEnvio(g: GraphIg, envio: Envio): Promise<"enviado" | "falha" | "outro"> {
    let mensagem = envio.payload?.mensagem;
    let situacao = envio.payload?.situacao;

    if (envio.tipo === "lembrete") {
      // Estado de agora, não o de quando foi agendado.
      const p = envio.participacaoId ? await repo.participacaoPorId(envio.participacaoId) : null;
      const a = p ? await repo.automacao(p.automacaoId) : null;
      const acoes =
        p && a ? decidirLembrete(a, { situacao: p.situacao, janelaAte: p.janelaAte }, { urlCurta: urlCurta(p.codigo), agora: agora() }) : [];
      const decisao = acoes.find((x): x is Extract<Acao, { tipo: "mensagem" }> => x.tipo === "mensagem");
      if (!decisao) {
        await repo.concluirEnvio(envio.id, { estado: "cancelado" });
        return "outro";
      }
      mensagem = decisao.mensagem;
      situacao = decisao.situacao;
    }

    const r = await enviar(g, envio, mensagem);

    if (r.ok) {
      // A Graph já entregou: nada daqui pode devolver o envio à fila (reenvio duplicado).
      try {
        await repo.concluirEnvio(envio.id, { estado: "enviado", metaId: r.id ?? null });
        await repo.registrarMensagem({
          contatoId: envio.contatoId,
          participacaoId: envio.participacaoId,
          direcao: "saida",
          tipo: envio.tipo === "resposta_publica" ? "resposta_publica" : "texto",
          texto: envio.tipo === "resposta_publica" ? (envio.payload?.texto ?? null) : (mensagem?.texto ?? null),
          metaId: r.id ?? null,
        });
        // DM entregue: a etiqueta de falha antiga já não vale. Resposta pública não limpa
        // (não é DM) nem marca falha (ver abaixo).
        const ehDm = envio.tipo !== "resposta_publica";
        if (envio.participacaoId && (situacao || ehDm)) {
          await repo.atualizarParticipacao(envio.participacaoId, {
            ...(situacao ? { situacao } : {}),
            ...(situacao === "link_enviado" ? { linkEnviadoEm: agora().toISOString() } : {}),
            ...(ehDm ? { falhaMotivo: null, falhaEm: null } : {}),
          });
        }
      } catch (ex) {
        console.error("[instagram] envio entregue, mas o registro falhou", envio.id, ex);
      }
      return "enviado";
    }

    const erro: ErroGraph = r;
    const proxima = ehTemporario(erro) ? proximaTentativa(envio.tentativas, agora()) : null;
    if (proxima) {
      await repo.concluirEnvio(envio.id, {
        estado: "pendente",
        enviarApos: proxima,
        tentativas: envio.tentativas + 1,
        erro: erro.mensagem,
      });
    } else {
      const motivo = motivoLegivel(erro);
      await repo.concluirEnvio(envio.id, {
        estado: "falhou",
        tentativas: envio.tentativas + 1,
        erro: erro.mensagem,
      });
      // Resposta pública recusada fica só no envio `falhou`: não marca a pessoa como falha.
      if (envio.participacaoId && envio.tipo !== "resposta_publica") {
        await repo.atualizarParticipacao(envio.participacaoId, {
          falhaMotivo: motivo,
          falhaEm: agora().toISOString(),
        });
      }
    }
    return "falha";
  }

  async function reprocessarPendentes(limite: number = LIMITE_PADRAO): Promise<number> {
    let reprocessados = 0;
    try {
      const ate = new Date(agora().getTime() - ESPERA_REPROCESSO_MS);
      const desde = new Date(agora().getTime() - DIA_MS);
      const pendentes = await repo.eventosPendentes(desde, ate, limite);
      for (const p of pendentes) {
        const evento = lerEventoGravado(p.payload);
        if (!evento) {
          console.error("[instagram] evento pendente com payload inválido", p.chave);
          await repo.marcarEvento(p.chave, "payload inválido");
          continue;
        }
        await processarEvento(evento);
        reprocessados += 1;
      }
    } catch (ex) {
      console.error("[instagram] reprocessarPendentes falhou", ex);
    }
    return reprocessados;
  }

  async function dispararFila(limite: number = LIMITE_PADRAO): Promise<{ enviados: number; falhas: number }> {
    const total = { enviados: 0, falhas: 0 };
    try {
      if (!graph) return total;
      const conta = await repo.conta();
      if (!conta) return total;
      const envios = await repo.reservarEnvios(limite);
      for (const envio of envios) {
        try {
          const r = await processarEnvio(graph, envio);
          if (r === "enviado") total.enviados += 1;
          else if (r === "falha") total.falhas += 1;
        } catch (ex) {
          // Nada deste envio pode derrubar o lote: devolve para nova tentativa (ou desiste).
          console.error("[instagram] falha ao processar envio", envio.id, ex);
          total.falhas += 1;
          try {
            const proxima = proximaTentativa(envio.tentativas, agora());
            await repo.concluirEnvio(
              envio.id,
              proxima
                ? { estado: "pendente", enviarApos: proxima, tentativas: envio.tentativas + 1, erro: mensagemDe(ex) }
                : { estado: "falhou", tentativas: envio.tentativas + 1, erro: mensagemDe(ex) },
            );
          } catch (ex2) {
            console.error("[instagram] não foi possível devolver o envio à fila", envio.id, ex2);
          }
        }
      }
    } catch (ex) {
      console.error("[instagram] dispararFila falhou", ex);
    }
    return total;
  }

  // -------------------------------------------------------------------------
  // Link curto
  // -------------------------------------------------------------------------

  async function registrarClique(codigo: string, ua: string | null): Promise<string | null> {
    const p = await repo.participacaoPorCodigo(codigo);
    if (!p) return null;
    const a = await repo.automacao(p.automacaoId);
    if (!a) return null;
    const destino = destinoComUtm(a.linkUrl, a.slug);
    // Prévia de link da Meta não é gente: devolve o destino sem tocar em nada.
    if (ehRoboDePrevia(ua)) return destino;

    try {
      await repo.registrarClique(p.id, ua);
      if (p.situacao !== "link_aberto") {
        await repo.atualizarParticipacao(p.id, {
          situacao: "link_aberto",
          linkAbertoEm: agora().toISOString(),
        });
        await repo.registrarMensagem({
          contatoId: p.contatoId,
          participacaoId: p.id,
          direcao: "sistema",
          tipo: "link_aberto",
          texto: null,
          metaId: null,
        });
      }
      await repo.cancelarLembretes(p.id);
    } catch (ex) {
      // O visitante precisa chegar ao destino mesmo que o registro falhe.
      console.error("[instagram] falha ao registrar clique", codigo, ex);
    }
    return destino;
  }

  return { processarEvento, reprocessarPendentes, dispararFila, registrarClique };
}
