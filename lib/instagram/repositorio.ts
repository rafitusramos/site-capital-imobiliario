import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import type {
  CamposParticipacao,
  ConclusaoEnvio,
  Envio,
  NovaMensagem,
  NovoEnvio,
  PayloadEnvio,
  RepositorioIg,
} from "./motor";
import type { Automacao, Participacao } from "./tipos";

// Tradução fina entre o motor e o Supabase (service role). Sem regra de negócio.
// Falha de banco: console.error + lança — o motor captura por evento e grava o
// erro em ig_eventos. Todo UPDATE confere o retorno com .select() (um UPDATE que
// não casa linha é "sucesso" no Postgres), exceto onde zero linha é esperado.

type Tabelas = Database["public"]["Tables"];
type LinhaAutomacao = Tabelas["ig_automacoes"]["Row"];
type LinhaParticipacao = Tabelas["ig_participacoes"]["Row"];

const UNICO_VIOLADO = "23505";

function falha(contexto: string, error: { message: string }): never {
  console.error(`[instagram] ${contexto}:`, error.message);
  throw new Error(`${contexto}: ${error.message}`);
}

function paraAutomacao(r: LinhaAutomacao): Automacao {
  return {
    id: r.id,
    nome: r.nome,
    slug: r.slug,
    ativa: r.ativa,
    alvo: r.alvo,
    midiaId: r.midia_id,
    proximaDesde: r.proxima_desde,
    palavras: r.palavras,
    responderPublico: r.responder_publico,
    frasesPublicas: r.frases_publicas,
    dm1Texto: r.dm1_texto,
    dm1Botao: r.dm1_botao,
    exigirSeguir: r.exigir_seguir,
    seguirTexto: r.seguir_texto,
    seguirBotao: r.seguir_botao,
    seguirInsisteTexto: r.seguir_insiste_texto,
    linkTexto: r.link_texto,
    linkBotao: r.link_botao,
    linkUrl: r.link_url,
    lembreteAtivo: r.lembrete_ativo,
    lembreteHoras: r.lembrete_horas,
    lembreteTexto: r.lembrete_texto,
    retomadaBotaoTexto: r.retomada_botao_texto,
    retomadaSeguirTexto: r.retomada_seguir_texto,
    retomadaLinkTexto: r.retomada_link_texto,
    criadoEm: r.criado_em,
  };
}

function paraParticipacao(r: LinhaParticipacao): Participacao {
  return {
    id: r.id,
    contatoId: r.contato_id,
    automacaoId: r.automacao_id,
    midiaId: r.midia_id,
    situacao: r.situacao,
    comentarios: r.comentarios,
    ultimoComentarioId: r.ultimo_comentario_id ?? null,
    situacaoAntesUltimo: r.situacao_antes_ultimo ?? null,
    codigo: r.codigo,
    janelaAte: r.janela_ate,
  };
}

export function criarRepositorio(): RepositorioIg {
  const db = createAdminClient();

  async function umaParticipacao(
    filtro: (q: ReturnType<typeof base>) => ReturnType<typeof base>,
    contexto: string,
  ): Promise<Participacao | null> {
    const { data, error } = await filtro(base()).limit(1).maybeSingle();
    if (error) falha(contexto, error);
    return data ? paraParticipacao(data) : null;
  }
  const base = () => db.from("ig_participacoes").select("*");

  /** Conta o comentário uma única vez: o mesmo `comentarioId` de novo devolve o estado gravado. */
  async function contarNaExistente(
    atual: Participacao,
    comentarioId: string,
  ): Promise<{ participacao: Participacao; situacaoAntes: Participacao["situacao"] | null }> {
    if (atual.ultimoComentarioId === comentarioId) {
      return { participacao: atual, situacaoAntes: atual.situacaoAntesUltimo };
    }
    const { data, error } = await db
      .from("ig_participacoes")
      .update({
        comentarios: atual.comentarios + 1,
        ultimo_comentario_id: comentarioId,
        situacao_antes_ultimo: atual.situacao,
      })
      .eq("id", atual.id)
      .select("*")
      .single();
    if (error) falha("incrementar comentários", error);
    return { participacao: paraParticipacao(data), situacaoAntes: atual.situacao };
  }

  return {
    async conta() {
      const { data, error } = await db
        .from("ig_conta")
        .select("ig_user_id, token")
        .eq("id", 1)
        .maybeSingle();
      if (error) falha("ler conta", error);
      return data ? { igUserId: data.ig_user_id, token: data.token } : null;
    },

    async automacoesAtivas() {
      const { data, error } = await db.from("ig_automacoes").select("*").eq("ativa", true);
      if (error) falha("listar automações ativas", error);
      return (data ?? []).map(paraAutomacao);
    },

    async automacao(id) {
      if (!id) return null;
      const { data, error } = await db.from("ig_automacoes").select("*").eq("id", id).maybeSingle();
      if (error) falha("ler automação", error);
      return data ? paraAutomacao(data) : null;
    },

    async vincularProxima(automacaoId, midiaId) {
      // Só vincula se ainda estiver sem mídia: zero linha = outro comentário chegou antes.
      const { error } = await db
        .from("ig_automacoes")
        .update({ midia_id: midiaId })
        .eq("id", automacaoId)
        .is("midia_id", null)
        .select("id");
      if (error) falha("vincular próxima publicação", error);
    },

    async contato(igsid) {
      const { data, error } = await db
        .from("ig_contatos")
        .select("id")
        .eq("canal", "instagram")
        .eq("igsid", igsid)
        .maybeSingle();
      if (error) falha("ler contato", error);
      return data ? { id: data.id } : null;
    },

    async salvarContato(c) {
      const agora = new Date().toISOString();
      const campos: Tabelas["ig_contatos"]["Insert"] = {
        canal: "instagram",
        igsid: c.igsid,
        ultima_interacao_em: agora,
        ...(c.username ? { username: c.username } : {}),
        ...(c.nome ? { nome: c.nome } : {}),
        ...(c.fotoUrl ? { foto_url: c.fotoUrl } : {}),
        ...(c.segue !== undefined ? { segue: c.segue } : {}),
        ...(typeof c.segue === "boolean" ? { segue_conferido_em: agora } : {}),
      };
      const { data, error } = await db
        .from("ig_contatos")
        .upsert(campos, { onConflict: "canal,igsid" })
        .select("id")
        .single();
      if (error) falha("salvar contato", error);
      return { id: data.id };
    },

    participacao: (contatoId, automacaoId, midiaId) =>
      umaParticipacao(
        (q) => q.eq("contato_id", contatoId).eq("automacao_id", automacaoId).eq("midia_id", midiaId),
        "ler participação",
      ),
    participacaoPorId: (id) => umaParticipacao((q) => q.eq("id", id), "ler participação por id"),
    participacaoPorCodigo: (codigo) =>
      umaParticipacao((q) => q.eq("codigo", codigo), "ler participação por código"),

    async participacoesDoContato(contatoId) {
      const { data, error } = await db
        .from("ig_participacoes")
        .select("*")
        .eq("contato_id", contatoId);
      if (error) falha("listar participações do contato", error);
      return (data ?? []).map(paraParticipacao);
    },

    async contarComentario(p) {
      const existente = await this.participacao(p.contatoId, p.automacaoId, p.midiaId);
      if (existente) return contarNaExistente(existente, p.comentarioId);
      const { data, error } = await db
        .from("ig_participacoes")
        .insert({
          contato_id: p.contatoId,
          automacao_id: p.automacaoId,
          midia_id: p.midiaId,
          situacao: "aguardando_botao",
          comentarios: 1,
          ultimo_comentario_id: p.comentarioId,
          situacao_antes_ultimo: null,
          codigo: p.codigo,
        })
        .select("*")
        .single();
      if (error) {
        if (error.code !== UNICO_VIOLADO) falha("criar participação", error);
        // Corrida: outro evento criou a linha entre a leitura e a escrita.
        const outra = await this.participacao(p.contatoId, p.automacaoId, p.midiaId);
        if (!outra) falha("criar participação", error);
        return contarNaExistente(outra, p.comentarioId);
      }
      return { participacao: paraParticipacao(data), situacaoAntes: null };
    },

    async atualizarParticipacao(id, c: CamposParticipacao) {
      const campos: Tabelas["ig_participacoes"]["Update"] = {
        ...(c.situacao !== undefined ? { situacao: c.situacao } : {}),
        ...(c.janelaAte !== undefined ? { janela_ate: c.janelaAte } : {}),
        ...(c.linkEnviadoEm !== undefined ? { link_enviado_em: c.linkEnviadoEm } : {}),
        ...(c.linkAbertoEm !== undefined ? { link_aberto_em: c.linkAbertoEm } : {}),
        ...(c.falhaMotivo !== undefined ? { falha_motivo: c.falhaMotivo } : {}),
        ...(c.falhaEm !== undefined ? { falha_em: c.falhaEm } : {}),
      };
      const { data, error } = await db
        .from("ig_participacoes")
        .update(campos)
        .eq("id", id)
        .select("id");
      if (error) falha("atualizar participação", error);
      if (!data || data.length === 0) falha("atualizar participação", { message: "nenhuma linha casou" });
    },

    async registrarMensagem(m: NovaMensagem) {
      const linha: Tabelas["ig_mensagens"]["Insert"] = {
        contato_id: m.contatoId,
        participacao_id: m.participacaoId,
        direcao: m.direcao,
        tipo: m.tipo,
        texto: m.texto,
        meta_id: m.metaId,
      };
      if (m.metaId) {
        const { error } = await db
          .from("ig_mensagens")
          .upsert(linha, { onConflict: "meta_id", ignoreDuplicates: true });
        if (error) falha("registrar mensagem", error);
        return;
      }
      const { error } = await db.from("ig_mensagens").insert(linha);
      if (error) falha("registrar mensagem", error);
    },

    async mensagemConhecida(metaId) {
      const [mensagens, envios] = await Promise.all([
        db.from("ig_mensagens").select("id").eq("meta_id", metaId).limit(1),
        db.from("ig_envios").select("id").eq("meta_id", metaId).limit(1),
      ]);
      if (mensagens.error) falha("procurar mensagem", mensagens.error);
      if (envios.error) falha("procurar envio", envios.error);
      return (mensagens.data?.length ?? 0) > 0 || (envios.data?.length ?? 0) > 0;
    },

    async enfileirar(e: NovoEnvio) {
      const { error } = await db.from("ig_envios").insert({
        chave: e.chave,
        contato_id: e.contatoId,
        participacao_id: e.participacaoId ?? null,
        tipo: e.tipo,
        comentario_id: e.comentarioId ?? null,
        payload: (e.payload ?? null) as Record<string, unknown> | null,
        enviar_apos: e.enviarApos.toISOString(),
      });
      if (!error) return true;
      if (error.code === UNICO_VIOLADO) return false;
      return falha("enfileirar envio", error);
    },

    async cancelarLembretes(participacaoId) {
      // Zero linha é normal (não havia lembrete pendente).
      const { error } = await db
        .from("ig_envios")
        .update({ estado: "cancelado" })
        .eq("participacao_id", participacaoId)
        .eq("tipo", "lembrete")
        .eq("estado", "pendente")
        .select("id");
      if (error) falha("cancelar lembretes", error);
    },

    async envioRecente(contatoId, desde) {
      const { data, error } = await db
        .from("ig_envios")
        .select("id")
        .eq("contato_id", contatoId)
        .or(`estado.eq.processando,and(estado.eq.enviado,enviado_em.gte.${desde.toISOString()})`)
        .limit(1);
      if (error) falha("procurar envio recente", error);
      return (data?.length ?? 0) > 0;
    },

    async reservarEnvios(limite): Promise<Envio[]> {
      const { data, error } = await db.rpc("ig_reservar_envios", { p_limite: limite });
      if (error) falha("reservar envios", error);
      const linhas = data ?? [];
      if (linhas.length === 0) return [];

      const ids = [...new Set(linhas.map((l) => l.contato_id))];
      const { data: contatos, error: erroContatos } = await db
        .from("ig_contatos")
        .select("id, igsid")
        .in("id", ids);
      if (erroContatos) falha("ler contatos dos envios", erroContatos);
      const igsidPorId = new Map((contatos ?? []).map((c) => [c.id, c.igsid]));

      return linhas.map((l) => ({
        id: l.id,
        chave: l.chave,
        contatoId: l.contato_id,
        igsid: igsidPorId.get(l.contato_id) ?? "",
        participacaoId: l.participacao_id,
        tipo: l.tipo,
        comentarioId: l.comentario_id,
        payload: (l.payload as PayloadEnvio | null) ?? null,
        tentativas: l.tentativas,
      }));
    },

    async concluirEnvio(id, r: ConclusaoEnvio) {
      let campos: Tabelas["ig_envios"]["Update"];
      switch (r.estado) {
        case "enviado":
          campos = {
            estado: "enviado",
            meta_id: r.metaId,
            enviado_em: new Date().toISOString(),
            erro: null,
          };
          break;
        case "cancelado":
          campos = { estado: "cancelado" };
          break;
        case "pendente":
          campos = {
            estado: "pendente",
            enviar_apos: r.enviarApos.toISOString(),
            tentativas: r.tentativas,
            erro: r.erro,
            reservado_em: null,
          };
          break;
        case "falhou":
          campos = { estado: "falhou", tentativas: r.tentativas, erro: r.erro };
          break;
      }
      const { data, error } = await db.from("ig_envios").update(campos).eq("id", id).select("id");
      if (error) falha("concluir envio", error);
      if (!data || data.length === 0) falha("concluir envio", { message: "nenhuma linha casou" });
    },

    async registrarClique(participacaoId, ua) {
      const { error } = await db
        .from("ig_cliques")
        .insert({ participacao_id: participacaoId, user_agent: ua });
      if (error) falha("registrar clique", error);
    },

    async descartarConteudo(chave) {
      // A linha pode não existir (a Task 9 grava o evento antes de processar): sem erro.
      const { error } = await db.from("ig_eventos").update({ payload: null }).eq("chave", chave).select("chave");
      if (error) console.error("[instagram] descartar conteúdo falhou:", error.message);
    },

    async marcarEvento(chave, erro) {
      if (!erro) {
        const { error } = await db
          .from("ig_eventos")
          .update({ processado_em: new Date().toISOString(), erro: null })
          .eq("chave", chave)
          .select("chave");
        if (error) console.error("[instagram] marcar evento falhou:", error.message);
        return;
      }
      // Com erro, `processado_em` fica nulo para o reprocessamento; conta a tentativa.
      const { data: atual, error: erroLeitura } = await db
        .from("ig_eventos")
        .select("tentativas")
        .eq("chave", chave)
        .maybeSingle();
      if (erroLeitura) console.error("[instagram] ler tentativas do evento falhou:", erroLeitura.message);
      const { error } = await db
        .from("ig_eventos")
        .update({ erro, tentativas: (atual?.tentativas ?? 0) + 1 })
        .eq("chave", chave)
        .select("chave");
      if (error) console.error("[instagram] marcar evento falhou:", error.message);
    },

    async eventosPendentes(desde, ate, limite) {
      const { data, error } = await db
        .from("ig_eventos")
        .select("chave, payload")
        .is("processado_em", null)
        .not("payload", "is", null)
        .lt("tentativas", 3)
        .gte("recebido_em", desde.toISOString())
        .lte("recebido_em", ate.toISOString())
        .order("recebido_em", { ascending: true })
        .limit(limite);
      if (error) falha("ler eventos pendentes", error);
      return (data ?? []).map((l) => ({ chave: l.chave, payload: l.payload }));
    },

    async registrarEventos(eventos) {
      if (eventos.length === 0) return [];
      const { data, error } = await db
        .from("ig_eventos")
        .upsert(
          eventos.map((e) => ({ chave: e.chave, payload: e.payload as Record<string, unknown> })),
          { onConflict: "chave", ignoreDuplicates: true },
        )
        .select("chave");
      if (error) falha("registrar eventos", error);
      return (data ?? []).map((l) => l.chave);
    },

    async tocarUltimoEvento() {
      const { error } = await db
        .from("ig_conta")
        .update({ ultimo_evento_em: new Date().toISOString() })
        .eq("id", 1)
        .select("id");
      if (error) falha("registrar último evento", error);
    },
  };
}
