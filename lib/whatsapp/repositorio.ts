import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import { statusAvanca, type StatusWa } from "./eventos";
import type {
  ConclusaoEnvioWa,
  ContatoWa,
  EnvioWa,
  LeadWa,
  NovaMensagemWa,
  NovoEnvioWa,
  RepositorioWa,
} from "./motor";

// Tradução fina entre o motor e o Supabase (service role). Sem regra de negócio,
// exceto a ordem dos status (a regra pura é `statusAvanca`). Falha de banco:
// console.error + lança. Todo UPDATE confere o retorno com .select() (um UPDATE
// que não casa linha é "sucesso" no Postgres), exceto onde zero linha é esperado.

type Tabelas = Database["public"]["Tables"];
type LinhaContato = Tabelas["wa_contatos"]["Row"];

const UNICO_VIOLADO = "23505";
const TENTATIVAS_STATUS = 3;

function falha(contexto: string, error: { message: string }): never {
  console.error(`[whatsapp] ${contexto}:`, error.message);
  throw new Error(`${contexto}: ${error.message}`);
}

function paraContato(r: LinhaContato): ContatoWa {
  return {
    id: r.id,
    waId: r.wa_id,
    nomePerfil: r.nome_perfil,
    leadId: r.lead_id,
    ultimaEntradaEm: r.ultima_entrada_em,
    respostaFixaEm: r.resposta_fixa_em,
  };
}

export function criarRepositorioWa(): RepositorioWa {
  const db = createAdminClient();

  return {
    async contatoPorWaId(variantes) {
      const { data, error } = await db
        .from("wa_contatos")
        .select("*")
        .in("wa_id", variantes)
        .order("criado_em", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) falha("ler contato", error);
      return data ? paraContato(data) : null;
    },

    async garantirContato(waId, dados) {
      const campos: Tabelas["wa_contatos"]["Update"] = { ultima_interacao_em: new Date().toISOString() };
      if (dados.leadId) campos.lead_id = dados.leadId;
      if (dados.nomePerfil) campos.nome_perfil = dados.nomePerfil;
      if (dados.entradaEm) campos.ultima_entrada_em = dados.entradaEm;

      const existente = await db.from("wa_contatos").select("id").eq("wa_id", waId).maybeSingle();
      if (existente.error) falha("ler contato", existente.error);

      if (!existente.data) {
        const novo = await db
          .from("wa_contatos")
          .insert({ wa_id: waId, ...campos })
          .select("*")
          .single();
        if (!novo.error) return paraContato(novo.data);
        // Corrida: outro processo criou o contato entre a leitura e a escrita.
        if (novo.error.code !== UNICO_VIOLADO) falha("criar contato", novo.error);
      }

      const { data, error } = await db
        .from("wa_contatos")
        .update(campos)
        .eq("wa_id", waId)
        .select("*")
        .single();
      if (error) falha("atualizar contato", error);
      return paraContato(data);
    },

    async leadPorWaId(variantes): Promise<LeadWa | null> {
      // leads.telefone é texto livre: a normalização vive na função SQL wa_lead_por_wa_id (038).
      const { data, error } = await db.rpc("wa_lead_por_wa_id", { p_variantes: variantes });
      if (error) falha("procurar lead por telefone", error);
      const l = (data ?? [])[0];
      if (!l) return null;
      return {
        id: l.id,
        tipo: l.tipo,
        nome: l.nome,
        telefone: l.telefone,
        protocolo: l.protocolo,
        consentimentoWhatsappEm: l.consentimento_whatsapp_em,
      };
    },

    async registrarEventos(linhas) {
      if (linhas.length === 0) return [];
      const { data, error } = await db
        .from("wa_eventos")
        .upsert(
          linhas.map((l) => ({ chave: l.chave, payload: l.payload as Record<string, unknown> | null })),
          { onConflict: "chave", ignoreDuplicates: true },
        )
        .select("chave");
      if (error) falha("registrar eventos", error);
      return (data ?? []).map((l) => l.chave);
    },

    async enfileirar(e: NovoEnvioWa) {
      const { error } = await db.from("wa_envios").insert({
        chave: e.chave,
        contato_id: e.contatoId,
        lead_id: e.leadId,
        motivo: e.motivo,
        etapa: e.etapa ?? null,
        payload: e.payload,
        enviar_apos: e.enviarApos.toISOString(),
      });
      if (!error || error.code === UNICO_VIOLADO) return;
      falha("enfileirar envio", error);
    },

    async cancelarPendentes(leadId, motivo) {
      // Zero linha é normal (não havia aviso pendente).
      const { error } = await db
        .from("wa_envios")
        .update({ estado: "cancelado" })
        .eq("lead_id", leadId)
        .eq("motivo", motivo)
        .eq("estado", "pendente")
        .select("id");
      if (error) falha("cancelar envios pendentes", error);
    },

    async reservar(limite): Promise<EnvioWa[]> {
      const { data, error } = await db.rpc("wa_reservar_envios", { p_limite: limite });
      if (error) falha("reservar envios", error);
      const linhas = data ?? [];
      if (linhas.length === 0) return [];

      const ids = [...new Set(linhas.map((l) => l.contato_id))];
      const { data: contatos, error: erroContatos } = await db.from("wa_contatos").select("id, wa_id").in("id", ids);
      if (erroContatos) falha("ler contatos dos envios", erroContatos);
      const waIdPorId = new Map((contatos ?? []).map((c) => [c.id, c.wa_id]));

      return linhas.map((l) => ({
        id: l.id,
        chave: l.chave,
        contatoId: l.contato_id,
        waId: waIdPorId.get(l.contato_id) ?? "",
        leadId: l.lead_id,
        motivo: l.motivo,
        payload: l.payload,
        tentativas: l.tentativas,
      }));
    },

    async concluir(id, c: ConclusaoEnvioWa) {
      let campos: Tabelas["wa_envios"]["Update"];
      switch (c.estado) {
        case "enviado":
          campos = { estado: "enviado", meta_id: c.metaId, enviado_em: new Date().toISOString(), erro: null };
          break;
        case "pendente":
          campos = {
            estado: "pendente",
            enviar_apos: c.enviarApos.toISOString(),
            tentativas: c.tentativas,
            erro: c.erro,
            reservado_em: null,
          };
          break;
        case "falhou":
          campos = { estado: "falhou", tentativas: c.tentativas, erro: c.erro };
          break;
      }
      const { data, error } = await db.from("wa_envios").update(campos).eq("id", id).select("id");
      if (error) falha("concluir envio", error);
      if (!data || data.length === 0) falha("concluir envio", { message: "nenhuma linha casou" });
    },

    async registrarMensagem(m: NovaMensagemWa) {
      const linha: Tabelas["wa_mensagens"]["Insert"] = {
        contato_id: m.contatoId,
        direcao: m.direcao,
        tipo: m.tipo,
        texto: m.texto,
        template: m.template ?? null,
        meta_id: m.metaId,
        status: m.status ?? null,
        erro: m.erro ?? null,
        ...(m.criadoEm ? { criado_em: m.criadoEm } : {}),
      };
      if (m.metaId) {
        const { error } = await db
          .from("wa_mensagens")
          .upsert(linha, { onConflict: "meta_id", ignoreDuplicates: true });
        if (error) falha("registrar mensagem", error);
        return;
      }
      const { error } = await db.from("wa_mensagens").insert(linha);
      if (error) falha("registrar mensagem", error);
    },

    async atualizarStatus(metaId, status: StatusWa, erro) {
      // Lê o status atual e só grava se o novo avança (statusAvanca). A escrita é
      // condicionada ao valor lido: se outro webhook gravou no meio, lê de novo.
      for (let i = 0; i < TENTATIVAS_STATUS; i++) {
        const { data: atual, error } = await db
          .from("wa_mensagens")
          .select("status")
          .eq("meta_id", metaId)
          .maybeSingle();
        if (error) falha("ler status da mensagem", error);
        // Mensagem ainda não registrada (o status chegou antes do registro da saída): nada a atualizar.
        if (!atual) return;
        if (!statusAvanca(atual.status, status)) return;

        let q = db.from("wa_mensagens").update({ status, erro }).eq("meta_id", metaId);
        q = atual.status === null ? q.is("status", null) : q.eq("status", atual.status);
        const { data, error: erroUpdate } = await q.select("id");
        if (erroUpdate) falha("atualizar status da mensagem", erroUpdate);
        if (data && data.length > 0) return;
      }
    },

    async registrarInteracaoNoLead(leadId, texto) {
      const { error } = await db
        .from("lead_interacoes")
        .insert({ lead_id: leadId, tipo: "whatsapp", conteudo: texto, autor_id: null, automatica: true });
      if (error) falha("registrar interação no lead", error);
    },

    async marcarRespostaFixa(contatoId, em) {
      const { data, error } = await db
        .from("wa_contatos")
        .update({ resposta_fixa_em: em.toISOString() })
        .eq("id", contatoId)
        .select("id");
      if (error) falha("marcar resposta fixa", error);
      if (!data || data.length === 0) falha("marcar resposta fixa", { message: "nenhuma linha casou" });
    },

    async numeroOficial() {
      const { data, error } = await db.from("wa_config").select("numero_oficial").eq("id", 1).maybeSingle();
      if (error) falha("ler número oficial", error);
      return data?.numero_oficial ?? null;
    },

    async tocarUltimoEvento() {
      const { error } = await db
        .from("wa_config")
        .update({ ultimo_evento_em: new Date().toISOString() })
        .eq("id", 1)
        .select("id");
      if (error) falha("registrar último evento", error);
    },
  };
}
