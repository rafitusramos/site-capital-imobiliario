// Falsos em memória do repositório e do cliente da Cloud API do WhatsApp.
import type { ErroGraph } from "@/lib/instagram/fila";
import type { CloudWa, ResultadoCloud } from "@/lib/whatsapp/cloud";
import type { StatusWa } from "@/lib/whatsapp/eventos";
import type {
  ConclusaoEnvioWa,
  ContatoWa,
  EnvioWa,
  LeadWa,
  NovaMensagemWa,
  NovoEnvioWa,
  RepositorioWa,
} from "@/lib/whatsapp/motor";
import { waIdDoTelefone } from "@/lib/whatsapp/telefone";

export const LEAD_ID = "lead-1";

export function leadFalso(extra: Partial<LeadWa> = {}): LeadWa {
  return {
    id: LEAD_ID,
    tipo: "financiamento",
    nome: "Maria Souza",
    telefone: "(19) 99999-1234",
    protocolo: "RT-2026-0001",
    consentimentoWhatsappEm: "2026-11-13T12:00:00.000Z",
    ...extra,
  };
}

export interface EnvioFalso extends EnvioWa {
  estado: "pendente" | "processando" | "enviado" | "falhou" | "cancelado";
  enviarApos: Date;
  erro: string | null;
  metaId: string | null;
}

export class RepositorioWaFalso implements RepositorioWa {
  leads: LeadWa[] = [];
  contatos: ContatoWa[] = [];
  envios: EnvioFalso[] = [];
  mensagens: NovaMensagemWa[] = [];
  eventos: string[] = [];
  interacoes: Array<{ leadId: string; texto: string }> = [];
  statusRecebidos: Array<{ metaId: string; status: StatusWa; erro: string | null }> = [];
  cancelamentos: Array<{ leadId: string; motivo: string }> = [];
  numero: string | null = "(19) 99999-0000";
  toques = 0;
  eventosGravados: Array<{
    chave: string;
    payload: unknown;
    recebidoEm: Date;
    processado: boolean;
    tentativas: number;
    erro?: string;
  }> = [];
  /** Faz os próximos N `atualizarStatus` lançarem. */
  falharStatus = 0;
  /** Faz `concluir` com este estado lançar. */
  falharConcluir: string | null = null;
  private seq = 0;

  async contatoPorWaId(variantes: string[]) {
    return this.contatos.find((c) => variantes.includes(c.waId)) ?? null;
  }
  async garantirContato(
    waId: string,
    dados: { leadId?: string | null; nomePerfil?: string | null; entradaEm?: string | null },
  ) {
    let c = this.contatos.find((x) => x.waId === waId);
    if (!c) {
      this.seq += 1;
      c = { id: `ct-${this.seq}`, waId, nomePerfil: null, leadId: null, ultimaEntradaEm: null, respostaFixaEm: null };
      this.contatos.push(c);
    }
    if (dados.leadId) c.leadId = dados.leadId;
    if (dados.nomePerfil) c.nomePerfil = dados.nomePerfil;
    if (dados.entradaEm) c.ultimaEntradaEm = dados.entradaEm;
    return { ...c };
  }
  async leadPorWaId(variantes: string[]) {
    return this.leads.find((l) => variantes.includes(waIdDoTelefone(l.telefone) ?? "")) ?? null;
  }
  async registrarEventos(linhas: { chave: string; payload: unknown }[]) {
    const novas: string[] = [];
    for (const l of linhas) {
      if (this.eventos.includes(l.chave)) continue;
      this.eventos.push(l.chave);
      novas.push(l.chave);
    }
    return novas;
  }
  async enfileirar(e: NovoEnvioWa) {
    if (this.envios.some((x) => x.chave === e.chave)) return;
    this.seq += 1;
    const waId = this.contatos.find((c) => c.id === e.contatoId)?.waId ?? "";
    this.envios.push({
      id: `ev-${this.seq}`,
      chave: e.chave,
      contatoId: e.contatoId,
      waId,
      leadId: e.leadId ?? null,
      motivo: e.motivo,
      payload: e.payload,
      tentativas: 0,
      estado: "pendente",
      enviarApos: e.enviarApos,
      erro: null,
      metaId: null,
    });
  }
  async cancelarPendentes(leadId: string, motivo: "etapa") {
    this.cancelamentos.push({ leadId, motivo });
    for (const e of this.envios) {
      if (e.leadId === leadId && e.motivo === motivo && e.estado === "pendente") e.estado = "cancelado";
    }
  }
  async reservar(limite: number) {
    const lote = this.envios.filter((e) => e.estado === "pendente").slice(0, limite);
    for (const e of lote) e.estado = "processando";
    return lote.map((e) => ({ ...e }));
  }
  async concluir(id: string, c: ConclusaoEnvioWa) {
    if (this.falharConcluir === c.estado) throw new Error("banco fora do ar");
    const e = this.envios.find((x) => x.id === id)!;
    e.estado = c.estado;
    if (c.estado === "enviado") e.metaId = c.metaId;
    else {
      e.erro = c.erro;
      e.tentativas = c.tentativas;
      if (c.estado === "pendente") e.enviarApos = c.enviarApos;
    }
  }
  async registrarMensagem(m: NovaMensagemWa) {
    if (m.metaId && this.mensagens.some((x) => x.metaId === m.metaId)) return;
    this.mensagens.push(m);
  }
  async atualizarStatus(metaId: string, status: StatusWa, erro: string | null) {
    if (this.falharStatus > 0) {
      this.falharStatus -= 1;
      throw new Error("banco fora do ar");
    }
    this.statusRecebidos.push({ metaId, status, erro });
  }
  async registrarInteracaoNoLead(leadId: string, texto: string) {
    this.interacoes.push({ leadId, texto });
  }
  async reivindicarRespostaFixa(contatoId: string, em: Date, intervaloMs: number) {
    const c = this.contatos.find((x) => x.id === contatoId)!;
    if (c.respostaFixaEm && new Date(c.respostaFixaEm).getTime() >= em.getTime() - intervaloMs) return false;
    c.respostaFixaEm = em.toISOString();
    return true;
  }
  async marcarEvento(chave: string, erro?: string) {
    const e = this.eventosGravados.find((x) => x.chave === chave);
    if (!e) return;
    if (!erro) e.processado = true;
    else {
      e.tentativas += 1;
      e.erro = erro;
    }
  }
  async eventosPendentes(ate: Date, limite: number) {
    return this.eventosGravados
      .filter((e) => !e.processado && e.tentativas < 3 && e.recebidoEm.getTime() <= ate.getTime())
      .slice(0, limite)
      .map((e) => ({ chave: e.chave, payload: e.payload }));
  }
  async numeroOficial() {
    return this.numero;
  }
  async tocarUltimoEvento() {
    this.toques += 1;
  }
}

export class CloudFalso implements CloudWa {
  chamadas: Array<{ waId: string; corpo: Record<string, unknown> }> = [];
  resultados: Array<ResultadoCloud | Error> = [];
  private n = 0;

  falharCom(e: ErroGraph) {
    this.resultados.push({ ok: false, ...e });
  }
  async enviar(waId: string, corpo: Record<string, unknown>): Promise<ResultadoCloud> {
    this.chamadas.push({ waId, corpo });
    const r = this.resultados.shift();
    if (r instanceof Error) throw r;
    if (r) return r;
    this.n += 1;
    return { ok: true, metaId: `wamid.${this.n}` };
  }
  texto(waId: string, texto: string) {
    return this.enviar(waId, { type: "text", text: { body: texto } });
  }
  async infoDoNumero() {
    return null;
  }
  async assinarWebhooks() {
    return true;
  }
}
