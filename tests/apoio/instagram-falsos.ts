// Falsos em memória do repositório e do cliente Graph do módulo Instagram.
// Registram as chamadas para os testes do motor conferirem o que saiu.
import type { ErroGraph } from "@/lib/instagram/fila";
import type { GraphIg, ResultadoGraph } from "@/lib/instagram/graph";
import type {
  ConclusaoEnvio,
  Envio,
  NovaMensagem,
  NovoEnvio,
  RepositorioIg,
} from "@/lib/instagram/motor";
import type { Automacao, MensagemSaida, Participacao, Situacao } from "@/lib/instagram/tipos";
import { TEXTOS_PADRAO } from "@/lib/instagram/textos-padrao";

export const CONTA_ID = "17841400000000001";
export const PESSOA_ID = "17841400000000002";
export const UUID_A = "11111111-1111-4111-8111-111111111111";

export function automacaoFalsa(extra: Partial<Automacao> = {}): Automacao {
  return {
    id: UUID_A,
    nome: "Teste",
    slug: "teste",
    ativa: true,
    alvo: "qualquer",
    midiaId: null,
    proximaDesde: null,
    palavras: null,
    responderPublico: true,
    frasesPublicas: ["f0", "f1", "f2"],
    dm1Texto: "DM1",
    dm1Botao: "Me envie o link",
    exigirSeguir: false,
    seguirTexto: TEXTOS_PADRAO.seguirTexto,
    seguirBotao: TEXTOS_PADRAO.seguirBotao,
    seguirInsisteTexto: TEXTOS_PADRAO.seguirInsisteTexto,
    linkTexto: "LINK",
    linkBotao: "Abrir",
    linkUrl: "https://exemplo.com",
    lembreteAtivo: true,
    lembreteHoras: 2,
    lembreteTexto: TEXTOS_PADRAO.lembreteTexto,
    retomadaBotaoTexto: TEXTOS_PADRAO.retomadaBotaoTexto,
    retomadaSeguirTexto: TEXTOS_PADRAO.retomadaSeguirTexto,
    retomadaLinkTexto: TEXTOS_PADRAO.retomadaLinkTexto,
    criadoEm: "2026-11-01T00:00:00.000Z",
    ...extra,
  };
}

export interface ContatoFalso {
  id: string;
  igsid: string;
  username?: string;
  nome?: string;
  fotoUrl?: string;
  segue?: boolean | null;
  ultimaInteracaoEm: string;
}
export interface MensagemFalsa extends NovaMensagem {
  criadaEm: string;
}
export interface EnvioFalso extends Envio {
  estado: "pendente" | "processando" | "enviado" | "falhou" | "cancelado";
  enviarApos: Date;
  metaId: string | null;
  erro: string | null;
  enviadoEm?: Date;
}

export class RepositorioFalso implements RepositorioIg {
  contaConectada: { igUserId: string; token: string } | null = { igUserId: CONTA_ID, token: "t" };
  automacoes: Automacao[] = [];
  contatos: ContatoFalso[] = [];
  participacoes: (Participacao & {
    linkEnviadoEm?: string;
    linkAbertoEm?: string;
    falhaMotivo?: string;
    falhaEm?: string;
  })[] = [];
  mensagens: MensagemFalsa[] = [];
  envios: EnvioFalso[] = [];
  cliques: Array<{ participacaoId: string; ua: string | null }> = [];
  vinculos: Array<{ automacaoId: string; midiaId: string }> = [];
  descartados: string[] = [];
  eventosMarcados: Array<{ chave: string; erro?: string }> = [];
  eventosGravados: Array<{
    chave: string;
    payload: unknown;
    recebidoEm: Date;
    processado: boolean;
    tentativas: number;
  }> = [];
  toquesUltimoEvento = 0;
  private seq = 0;

  constructor(private readonly agora: () => Date) {}

  private id(prefixo: string) {
    this.seq += 1;
    return `${prefixo}-${this.seq}`;
  }

  async conta() {
    return this.contaConectada;
  }
  async automacoesAtivas() {
    return this.automacoes.filter((a) => a.ativa);
  }
  async automacao(id: string) {
    return this.automacoes.find((a) => a.id === id) ?? null;
  }
  async vincularProxima(automacaoId: string, midiaId: string) {
    this.vinculos.push({ automacaoId, midiaId });
    const a = this.automacoes.find((x) => x.id === automacaoId);
    if (a) a.midiaId = midiaId;
  }
  async contato(igsid: string) {
    const c = this.contatos.find((x) => x.igsid === igsid);
    return c ? { id: c.id } : null;
  }
  async salvarContato(c: {
    igsid: string;
    username?: string;
    nome?: string;
    fotoUrl?: string;
    segue?: boolean | null;
  }) {
    let existente = this.contatos.find((x) => x.igsid === c.igsid);
    if (!existente) {
      existente = { id: this.id("ct"), igsid: c.igsid, ultimaInteracaoEm: "" };
      this.contatos.push(existente);
    }
    if (c.username) existente.username = c.username;
    if (c.nome) existente.nome = c.nome;
    if (c.fotoUrl) existente.fotoUrl = c.fotoUrl;
    if (c.segue !== undefined) existente.segue = c.segue;
    existente.ultimaInteracaoEm = this.agora().toISOString();
    return { id: existente.id };
  }
  async participacao(contatoId: string, automacaoId: string, midiaId: string) {
    return (
      this.participacoes.find(
        (p) => p.contatoId === contatoId && p.automacaoId === automacaoId && p.midiaId === midiaId,
      ) ?? null
    );
  }
  async participacaoPorId(id: string) {
    return this.participacoes.find((p) => p.id === id) ?? null;
  }
  async participacaoPorCodigo(codigo: string) {
    return this.participacoes.find((p) => p.codigo === codigo) ?? null;
  }
  async participacoesDoContato(contatoId: string) {
    return this.participacoes.filter((p) => p.contatoId === contatoId);
  }
  async contarComentario(p: {
    comentarioId: string;
    contatoId: string;
    automacaoId: string;
    midiaId: string;
    codigo: string;
  }) {
    const existente = await this.participacao(p.contatoId, p.automacaoId, p.midiaId);
    if (existente) {
      // Espelha o repositório real: o mesmo comentário não é contado duas vezes.
      if (existente.ultimoComentarioId === p.comentarioId) {
        return { participacao: existente, situacaoAntes: existente.situacaoAntesUltimo };
      }
      const antes: Situacao = existente.situacao;
      existente.comentarios += 1;
      existente.ultimoComentarioId = p.comentarioId;
      existente.situacaoAntesUltimo = antes;
      return { participacao: existente, situacaoAntes: antes };
    }
    const nova = {
      id: UUID_PARTICIPACAO(this.id("pt")),
      contatoId: p.contatoId,
      automacaoId: p.automacaoId,
      midiaId: p.midiaId,
      situacao: "aguardando_botao" as Situacao,
      comentarios: 1,
      ultimoComentarioId: p.comentarioId as string | null,
      situacaoAntesUltimo: null as Situacao | null,
      codigo: p.codigo,
      janelaAte: null,
    };
    this.participacoes.push(nova);
    return { participacao: nova, situacaoAntes: null };
  }
  async atualizarParticipacao(
    id: string,
    campos: Partial<{
      situacao: Situacao;
      janelaAte: string | null;
      linkEnviadoEm: string;
      linkAbertoEm: string;
      falhaMotivo: string | null;
      falhaEm: string | null;
    }>,
  ) {
    const p = this.participacoes.find((x) => x.id === id);
    if (!p) throw new Error("participacao inexistente");
    Object.assign(p, campos);
  }
  async registrarMensagem(m: NovaMensagem) {
    if (m.metaId && this.mensagens.some((x) => x.metaId === m.metaId)) return;
    this.mensagens.push({ ...m, criadaEm: this.agora().toISOString() });
  }
  async mensagemConhecida(metaId: string) {
    return (
      this.mensagens.some((m) => m.metaId === metaId) ||
      this.envios.some((e) => e.metaId === metaId)
    );
  }
  async enfileirar(e: NovoEnvio) {
    if (this.envios.some((x) => x.chave === e.chave)) return false;
    const contato = this.contatos.find((c) => c.id === e.contatoId);
    this.envios.push({
      id: this.id("env"),
      chave: e.chave,
      contatoId: e.contatoId,
      igsid: contato?.igsid ?? "",
      participacaoId: e.participacaoId ?? null,
      tipo: e.tipo,
      comentarioId: e.comentarioId ?? null,
      payload: e.payload ?? null,
      tentativas: 0,
      estado: "pendente",
      enviarApos: e.enviarApos,
      metaId: null,
      erro: null,
    });
    return true;
  }
  async cancelarLembretes(participacaoId: string) {
    for (const e of this.envios) {
      if (e.participacaoId === participacaoId && e.tipo === "lembrete" && e.estado === "pendente") {
        e.estado = "cancelado";
      }
    }
  }
  async envioRecente(contatoId: string, desde: Date) {
    return this.envios.some(
      (e) =>
        e.contatoId === contatoId &&
        (e.estado === "processando" ||
          (e.estado === "enviado" && !!e.enviadoEm && e.enviadoEm.getTime() >= desde.getTime())),
    );
  }
  async reservarEnvios(limite: number) {
    const agora = this.agora().getTime();
    const devolvidos = this.envios
      .filter((e) => e.estado === "pendente" && e.enviarApos.getTime() <= agora)
      .sort((a, b) => a.enviarApos.getTime() - b.enviarApos.getTime())
      .slice(0, limite);
    for (const e of devolvidos) e.estado = "processando";
    return devolvidos.map((e) => ({ ...e }));
  }
  async concluirEnvio(id: string, r: ConclusaoEnvio) {
    const e = this.envios.find((x) => x.id === id);
    if (!e) throw new Error("envio inexistente");
    e.estado = r.estado;
    if (r.estado === "enviado") {
      e.metaId = r.metaId;
      e.enviadoEm = this.agora();
    }
    if (r.estado === "pendente") {
      e.enviarApos = r.enviarApos;
      e.tentativas = r.tentativas;
      e.erro = r.erro;
    }
    if (r.estado === "falhou") {
      e.tentativas = r.tentativas;
      e.erro = r.erro;
    }
  }
  async registrarClique(participacaoId: string, ua: string | null) {
    this.cliques.push({ participacaoId, ua });
  }
  async descartarConteudo(chave: string) {
    this.descartados.push(chave);
  }
  async marcarEvento(chave: string, erro?: string) {
    this.eventosMarcados.push({ chave, erro });
    const e = this.eventosGravados.find((x) => x.chave === chave);
    if (!e) return;
    if (erro) e.tentativas += 1;
    else e.processado = true;
  }
  async eventosPendentes(desde: Date, ate: Date, limite: number) {
    return this.eventosGravados
      .filter(
        (e) =>
          !e.processado && e.payload != null && e.tentativas < 3 && e.recebidoEm >= desde && e.recebidoEm <= ate,
      )
      .slice(0, limite)
      .map((e) => ({ chave: e.chave, payload: e.payload }));
  }

  async registrarEventos(eventos: { chave: string; payload: unknown }[]) {
    const novos: string[] = [];
    for (const e of eventos) {
      if (this.eventosGravados.some((x) => x.chave === e.chave)) continue;
      this.eventosGravados.push({ ...e, recebidoEm: this.agora(), processado: false, tentativas: 0 });
      novos.push(e.chave);
    }
    return novos;
  }
  async tocarUltimoEvento() {
    this.toquesUltimoEvento += 1;
  }

  // Apoio dos testes.
  semear(p: Partial<Participacao> & { contatoId: string }): Participacao {
    const nova: Participacao = {
      id: UUID_PARTICIPACAO(this.id("pt")),
      automacaoId: UUID_A,
      midiaId: "m1",
      situacao: "link_enviado",
      comentarios: 1,
      ultimoComentarioId: null,
      situacaoAntesUltimo: null,
      codigo: `cod${this.seq}`,
      janelaAte: null,
      ...p,
    };
    this.participacoes.push(nova);
    return nova;
  }
}

/** O motor valida o payload do botão como UUID; os ids semeados precisam ter esse formato. */
function UUID_PARTICIPACAO(seq: string): string {
  const n = seq.replace(/\D/g, "").padStart(12, "0");
  return `00000000-0000-4000-8000-${n}`;
}

export class GraphFalso implements GraphIg {
  respostasPrivadas: Array<{ comentarioId: string; m: MensagemSaida }> = [];
  mensagens: Array<{ igsid: string; m: MensagemSaida }> = [];
  respostasPublicas: Array<{ comentarioId: string; texto: string }> = [];
  consultasSegue: string[] = [];
  consultasMidia: string[] = [];
  /** Próximos resultados de envio; vazio = sucesso. */
  falhas: ErroGraph[] = [];
  segueValor: boolean | null = true;
  midiaCriada: string | null = null;
  private seq = 0;

  private resultado(): ResultadoGraph {
    const falha = this.falhas.shift();
    if (falha) return { ok: false, ...falha };
    this.seq += 1;
    return { ok: true, id: `mid-saida-${this.seq}` };
  }
  async respostaPrivada(comentarioId: string, m: MensagemSaida) {
    this.respostasPrivadas.push({ comentarioId, m });
    return this.resultado();
  }
  async mensagem(igsid: string, m: MensagemSaida) {
    this.mensagens.push({ igsid, m });
    return this.resultado();
  }
  async responderComentario(comentarioId: string, texto: string) {
    this.respostasPublicas.push({ comentarioId, texto });
    return this.resultado();
  }
  async segue(igsid: string) {
    this.consultasSegue.push(igsid);
    return this.segueValor;
  }
  async midiaCriadaEm(midiaId: string) {
    this.consultasMidia.push(midiaId);
    return this.midiaCriada;
  }
  async publicacoes() {
    return [];
  }
  perfilValor: { username: string | null; nome: string | null; fotoUrl: string | null } | null = null;
  consultasPerfil: string[] = [];
  async perfil(igsid: string) {
    this.consultasPerfil.push(igsid);
    return this.perfilValor;
  }
  totalEnvios() {
    return this.respostasPrivadas.length + this.mensagens.length + this.respostasPublicas.length;
  }
}
