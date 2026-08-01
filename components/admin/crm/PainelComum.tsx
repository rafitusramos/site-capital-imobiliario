"use client";

import { useRef, useState } from "react";
import {
  etapaAnterior,
  etapaInicial,
  etapaPorSlug,
  etapaProxima,
  etapasDoTipo,
} from "@/lib/crm/etapas";
import { cpfValido, telefoneValido } from "@/lib/financeiro";
import { mascaraCpf, mascaraTelefone } from "@/lib/mascaras";
import {
  atribuirResponsavel,
  atualizarLead,
  criarTag,
  definirTags,
  alternarFavorito,
  type AcaoResultado,
} from "@/app/actions/admin-crm";
import { useToast } from "@/lib/admin/toast";
import { IconeEstrela, IconeEstrelaPreenchida, IconeSetaDireita, IconeSetaEsquerda } from "@/components/admin/crm/icones";
import { CampoOrigemInput } from "@/components/admin/crm/CampoOrigemInput";
import type { CampoCRM } from "@/lib/crm/campos";
import type { Database, LeadEtapaSlug, LeadTipoSlug } from "@/types/database";
import type { DominiosCRM } from "@/lib/queries/admin-crm";

const CAMPO =
  "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]";
const LABEL = "mb-1 block text-sm font-medium text-[var(--abissal)]";
const BOTAO_PRIMARIO =
  "rounded-md bg-[var(--jade)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#175840] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)] disabled:opacity-50";
// Botão de mover etapa (item 8 dos ajustes de CRM): a cor vem por `style`
// (corBg/corTexto da etapa de destino), não daqui — esta classe só cuida de
// forma, tamanho e estado.
const BOTAO_ETAPA =
  "flex min-h-[44px] w-full items-center justify-between gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition duration-200 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)]";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type TagCRM = Database["public"]["Tables"]["crm_tags"]["Row"];

export type PainelComumProps = {
  lead: LeadRow;
  tags: string[];
  dominios: DominiosCRM;
  /** Orquestrado pelo ModalLead.tsx: dispara o MESMO DialogoMotivo do quadro quando a etapa exige motivo. */
  onMudarEtapa: (etapa: LeadEtapaSlug) => void;
  etapaPendente?: boolean;
  executarAcao: (promessa: Promise<AcaoResultado>, mensagemSucesso: string) => Promise<boolean>;
  /** Partição `bloco === "lead"` de `CAMPOS_POR_ORIGEM[tipo]` (useCamposOrigem.ts) — negociados pelo corretor, salvos junto com nome/telefone/e-mail (item 10 dos ajustes de CRM). */
  camposLead: CampoCRM[];
  valoresOrigem: Record<string, string>;
  onChangeOrigem: (chave: string, valor: string) => void;
  dadosParaCalculo: Record<string, unknown>;
  montarPayloadOrigem: () => Record<string, unknown>;
  tipo: LeadTipoSlug;
};

type ValoresComuns = { telefone: string; email: string; cpf: string };

function valoresIniciais(lead: LeadRow): ValoresComuns {
  return {
    telefone: mascaraTelefone(lead.telefone),
    email: lead.email,
    cpf: lead.cpf ? mascaraCpf(lead.cpf) : "",
  };
}

/**
 * Painel esquerdo do modal — dados comuns a qualquer origem (docs/crm-spec.md
 * §3.1). A troca de responsável, tags e favorito salvam na hora (mesmo
 * padrão instantâneo do quadro); telefone/e-mail/CPF (e, desde o item 10 dos
 * ajustes de CRM, os campos `bloco: "lead"` da origem) têm botão de salvar
 * próprio, para não disparar uma mutação a cada tecla. O nome do lead saiu
 * daqui: agora é editado no cabeçalho do modal (ModalLead.tsx), com
 * salvamento ao perder o foco.
 */
export function PainelComum({
  lead,
  tags,
  dominios,
  onMudarEtapa,
  etapaPendente,
  executarAcao,
  camposLead,
  valoresOrigem,
  onChangeOrigem,
  dadosParaCalculo,
  montarPayloadOrigem,
  tipo,
}: PainelComumProps) {
  const { mostrarToast } = useToast();
  const [valores, setValores] = useState<ValoresComuns>(() => valoresIniciais(lead));
  const [erros, setErros] = useState<Partial<Record<keyof ValoresComuns, string>>>({});
  const [salvandoComuns, setSalvandoComuns] = useState(false);
  const [salvandoResponsavel, setSalvandoResponsavel] = useState(false);
  const [salvandoTags, setSalvandoTags] = useState(false);
  const [salvandoFavorito, setSalvandoFavorito] = useState(false);
  const [tagsAtuais, setTagsAtuais] = useState<string[]>(tags);
  const [favorito, setFavorito] = useState(lead.favorito);

  // Item 6 dos ajustes de CRM (rodada 2): catálogo de tags semeado por
  // `dominios.tags` e acrescido em memória quando uma tag nova é criada aqui
  // — sem isso, a tag recém-criada só apareceria depois de recarregar a
  // página. `revalidarQuadro()` (na action) cuida das outras abas abertas.
  const [tagsCatalogoLocal, setTagsCatalogoLocal] = useState<TagCRM[]>(() => dominios.tags);
  const [criandoTag, setCriandoTag] = useState(false);
  const [labelTagNova, setLabelTagNova] = useState("");
  const [salvandoTagNova, setSalvandoTagNova] = useState(false);
  // Diferencia "Enter" (confirma) de "Escape" (cancela) quando os dois
  // disparam o MESMO evento nativo de blur no input — sem isto, o onBlur não
  // teria como saber qual dos dois motivou o blur.
  const intencaoTagRef = useRef<"confirmar" | "cancelar">("confirmar");

  const etapaAtual = etapaPorSlug(tipo, lead.status);
  const emEtapaFinalNaoGanho = etapaAtual ? etapaAtual.isFinal && !etapaAtual.isGanho : false;
  const anterior = etapaAnterior(tipo, lead.status);
  const proxima = etapaProxima(tipo, lead.status);
  const etapasFinaisNaoGanho = etapasDoTipo(tipo).filter((e) => e.isFinal && !e.isGanho && e.slug !== lead.status);
  const inicial = etapaInicial(tipo);

  function setValor<K extends keyof ValoresComuns>(campo: K, valor: string) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
  }

  function validar(): boolean {
    const novosErros: Partial<Record<keyof ValoresComuns, string>> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valores.email.trim())) novosErros.email = "Informe um e-mail válido.";
    if (!telefoneValido(valores.telefone)) novosErros.telefone = "Informe um telefone válido com DDD.";
    if (valores.cpf.trim() !== "" && !cpfValido(valores.cpf)) novosErros.cpf = "Informe um CPF válido.";
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function salvarComuns() {
    if (!validar()) return;
    setSalvandoComuns(true);
    await executarAcao(
      atualizarLead({
        leadId: lead.id,
        tipo,
        comum: {
          email: valores.email.trim(),
          telefone: valores.telefone,
          cpf: valores.cpf.trim() === "" ? undefined : valores.cpf,
        },
        // Só manda `origem` quando há campo `bloco: "lead"` para esta
        // origem — mandar um payload vazio seria upsert sem propósito
        // (e, em consórcio sem lead_consorcio ainda criado, um upsert à toa).
        ...(camposLead.length > 0 ? { origem: montarPayloadOrigem() } : {}),
      }),
      "Dados do lead atualizados.",
    );
    setSalvandoComuns(false);
  }

  async function mudarResponsavel(corretorId: string) {
    setSalvandoResponsavel(true);
    await executarAcao(atribuirResponsavel(lead.id, corretorId === "" ? null : corretorId), "Responsável atualizado.");
    setSalvandoResponsavel(false);
  }

  async function alternarTag(slug: string) {
    const jaTem = tagsAtuais.includes(slug);
    if (!jaTem && tagsAtuais.length >= 8) {
      // Nenhuma ação fica silenciosa (regra do escopo) — mesmo um limite
      // batido só no cliente merece feedback, não um clique que não faz nada.
      mostrarToast("erro", "Máximo de 8 tags por lead.");
      return;
    }
    const novoConjunto = jaTem ? tagsAtuais.filter((t) => t !== slug) : [...tagsAtuais, slug];
    setSalvandoTags(true);
    const ok = await executarAcao(definirTags(lead.id, novoConjunto), "Tags atualizadas.");
    setSalvandoTags(false);
    if (ok) setTagsAtuais(novoConjunto);
  }

  /** Aplica uma tag (recém-criada) ao lead atual, só se ainda não estiver aplicada — nunca remove (ao contrário de alternarTag). */
  async function aplicarTagNova(slug: string) {
    if (tagsAtuais.includes(slug)) return;
    if (tagsAtuais.length >= 8) {
      // Mesmo limite e mesma mensagem de alternarTag: criar a nona tag do
      // lead não pode ficar em silêncio só porque veio pelo atalho "+ Nova
      // tag" em vez do clique num chip existente.
      mostrarToast("erro", "Máximo de 8 tags por lead.");
      return;
    }
    const novoConjunto = [...tagsAtuais, slug];
    setSalvandoTags(true);
    const ok = await executarAcao(definirTags(lead.id, novoConjunto), "Tags atualizadas.");
    setSalvandoTags(false);
    if (ok) setTagsAtuais(novoConjunto);
  }

  function cancelarCriacaoTag() {
    setCriandoTag(false);
    setLabelTagNova("");
  }

  /** Enter confirma (dispara blur, que salva); Escape cancela — os dois via blur() para não depender de o input estar prestes a desmontar. */
  function aoTeclarTagNova(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      intencaoTagRef.current = "confirmar";
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      intencaoTagRef.current = "cancelar";
      e.currentTarget.blur();
    }
  }

  /** blur "seco" (clique fora) com o campo vazio também cancela — mesma regra do Escape. */
  async function aoDesfocarTagNova() {
    const cancelar = intencaoTagRef.current === "cancelar" || labelTagNova.trim() === "";
    intencaoTagRef.current = "confirmar";
    if (cancelar) {
      cancelarCriacaoTag();
      return;
    }
    await criarTagNova(labelTagNova);
  }

  /**
   * Cria a tag no catálogo compartilhado e, no sucesso, já aplica ao lead
   * atual — criar uma tag e ela não valer para o lead em que se está seria um
   * clique perdido. Em caso de erro (nome curto demais, ou RLS barrando um
   * corretor) o campo permanece aberto com o texto digitado, para corrigir e
   * tentar de novo sem perder o que já foi escrito.
   */
  async function criarTagNova(labelBruto: string) {
    setSalvandoTagNova(true);
    const resultado = await criarTag(labelBruto);
    setSalvandoTagNova(false);
    const ok = await executarAcao(Promise.resolve(resultado), "Tag criada.");
    if (!ok || !resultado.tag) return;

    const novaTag = resultado.tag;
    setTagsCatalogoLocal((atual) =>
      atual.some((t) => t.slug === novaTag.slug) ? atual : [...atual, { ...novaTag, ordem: atual.length, ativo: true }],
    );
    cancelarCriacaoTag();
    await aplicarTagNova(novaTag.slug);
  }

  async function alternarFavoritoLocal() {
    setSalvandoFavorito(true);
    const ok = await executarAcao(alternarFavorito(lead.id), favorito ? "Removido dos favoritos." : "Marcado como favorito.");
    setSalvandoFavorito(false);
    if (ok) setFavorito((atual) => !atual);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Dados do lead</h3>
        <button
          type="button"
          onClick={alternarFavoritoLocal}
          disabled={salvandoFavorito}
          aria-pressed={favorito}
          aria-label={favorito ? "Remover dos favoritos" : "Marcar como favorito"}
          title={favorito ? "Remover dos favoritos" : "Marcar como favorito"}
          className="rounded-md p-1 text-[var(--bronze)] transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--jade)] disabled:opacity-50"
        >
          {favorito ? <IconeEstrelaPreenchida className="h-5 w-5" /> : <IconeEstrela className="h-5 w-5 text-neutral-300" />}
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor="pc-telefone">
            Telefone
          </label>
          <input
            id="pc-telefone"
            type="tel"
            inputMode="tel"
            value={valores.telefone}
            onChange={(e) => setValor("telefone", mascaraTelefone(e.target.value))}
            aria-invalid={erros.telefone ? true : undefined}
            aria-describedby={erros.telefone ? "pc-telefone-erro" : undefined}
            className={`${CAMPO} ${erros.telefone ? "border-[var(--erro)]" : ""}`}
          />
          {erros.telefone ? (
            <p id="pc-telefone-erro" role="alert" className="mt-1 text-xs text-[var(--erro)]">
              {erros.telefone}
            </p>
          ) : null}
        </div>
        <div>
          <label className={LABEL} htmlFor="pc-cpf">
            CPF
          </label>
          <input
            id="pc-cpf"
            type="text"
            inputMode="numeric"
            value={valores.cpf}
            onChange={(e) => setValor("cpf", mascaraCpf(e.target.value))}
            aria-invalid={erros.cpf ? true : undefined}
            aria-describedby={erros.cpf ? "pc-cpf-erro" : undefined}
            className={`${CAMPO} ${erros.cpf ? "border-[var(--erro)]" : ""}`}
          />
          {erros.cpf ? (
            <p id="pc-cpf-erro" role="alert" className="mt-1 text-xs text-[var(--erro)]">
              {erros.cpf}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mb-4">
        <label className={LABEL} htmlFor="pc-email">
          E-mail
        </label>
        <input
          id="pc-email"
          type="email"
          value={valores.email}
          onChange={(e) => setValor("email", e.target.value)}
          aria-invalid={erros.email ? true : undefined}
          aria-describedby={erros.email ? "pc-email-erro" : undefined}
          className={`${CAMPO} ${erros.email ? "border-[var(--erro)]" : ""}`}
        />
        {erros.email ? (
          <p id="pc-email-erro" role="alert" className="mt-1 text-xs text-[var(--erro)]">
            {erros.email}
          </p>
        ) : null}
      </div>

      {camposLead.length > 0 ? (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {camposLead.map((campo) => (
            <CampoOrigemInput
              key={campo.chave}
              campo={campo}
              dadosParaCalculo={dadosParaCalculo}
              valorBruto={dadosParaCalculo[campo.chave]}
              valor={valoresOrigem[campo.chave]}
              onChange={(novoValor) => onChangeOrigem(campo.chave, novoValor)}
            />
          ))}
        </div>
      ) : null}

      <div className="mb-4">
        <button type="button" onClick={salvarComuns} disabled={salvandoComuns} className={BOTAO_PRIMARIO}>
          {salvandoComuns ? "Salvando…" : "Salvar dados do lead"}
        </button>
      </div>

      <div className="mb-4">
        <span className={LABEL}>Etapa</span>
        {etapaAtual ? (
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: etapaAtual.corBg, color: etapaAtual.corTexto }}
          >
            {etapaAtual.label}
          </span>
        ) : null}

        <p className="mb-2 mt-3 text-xs text-neutral-500">Mover para</p>
        <div className="flex flex-col gap-2">
          {emEtapaFinalNaoGanho ? (
            // Lead perdido/não qualificado está fora da sequência linear
            // (lib/crm/etapas.ts `sequenciaLinear`): o histórico fica
            // preservado na linha do tempo, reavançar são dois cliques a
            // partir daqui.
            <button
              type="button"
              onClick={() => onMudarEtapa(inicial.slug)}
              disabled={etapaPendente}
              aria-label={`Reabrir em ${inicial.label}`}
              style={{ backgroundColor: inicial.corBg, color: inicial.corTexto }}
              className={BOTAO_ETAPA}
            >
              <IconeSetaEsquerda className="h-4 w-4 flex-none" />
              <span>Reabrir em {inicial.label}</span>
            </button>
          ) : (
            <>
              {anterior ? (
                <button
                  type="button"
                  onClick={() => onMudarEtapa(anterior.slug)}
                  disabled={etapaPendente}
                  aria-label={`Mover para ${anterior.label}`}
                  style={{ backgroundColor: anterior.corBg, color: anterior.corTexto }}
                  className={BOTAO_ETAPA}
                >
                  <IconeSetaEsquerda className="h-4 w-4 flex-none" />
                  <span>{anterior.label}</span>
                </button>
              ) : null}
              {proxima ? (
                <button
                  type="button"
                  onClick={() => onMudarEtapa(proxima.slug)}
                  disabled={etapaPendente}
                  aria-label={`Mover para ${proxima.label}`}
                  style={{ backgroundColor: proxima.corBg, color: proxima.corTexto }}
                  className={BOTAO_ETAPA}
                >
                  <span>{proxima.label}</span>
                  <IconeSetaDireita className="h-4 w-4 flex-none" />
                </button>
              ) : null}
              {etapasFinaisNaoGanho.map((etapa) => (
                <button
                  key={etapa.slug}
                  type="button"
                  onClick={() => onMudarEtapa(etapa.slug)}
                  disabled={etapaPendente}
                  aria-label={`Mover para ${etapa.label}`}
                  style={{ backgroundColor: etapa.corBg, color: etapa.corTexto }}
                  className={BOTAO_ETAPA}
                >
                  <span>{etapa.label}</span>
                  <IconeSetaDireita className="h-4 w-4 flex-none" />
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="mb-4">
        <label className={LABEL} htmlFor="pc-responsavel">
          Responsável
        </label>
        <select
          id="pc-responsavel"
          defaultValue={lead.corretor_id ?? ""}
          disabled={salvandoResponsavel}
          onChange={(e) => mudarResponsavel(e.target.value)}
          className={`${CAMPO} disabled:opacity-50`}
        >
          <option value="">Sem responsável</option>
          {dominios.corretores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>
      </div>

      {/* Sempre renderiza (mesmo com o catálogo vazio): "+ Nova tag" é como
          o catálogo passa a crescer pela interface (item 6 dos ajustes de
          CRM, rodada 2) — escondido aqui, um catálogo vazio nunca ganharia a
          primeira tag sem abrir o SQL Editor. */}
      <div>
        <span className={LABEL}>Tags</span>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Tags do lead">
          {tagsCatalogoLocal.map((tag) => {
            const ativa = tagsAtuais.includes(tag.slug);
            return (
              <button
                key={tag.slug}
                type="button"
                onClick={() => alternarTag(tag.slug)}
                disabled={salvandoTags}
                aria-pressed={ativa}
                className="rounded-full px-2.5 py-1 text-xs font-medium transition disabled:opacity-50"
                style={
                  ativa
                    ? { backgroundColor: `${tag.cor}1a`, color: tag.cor, border: `1px solid ${tag.cor}` }
                    : { border: "1px solid var(--neutral-300, #d4d4d4)", color: "#737373" }
                }
              >
                {tag.label}
              </button>
            );
          })}

          {criandoTag ? (
            // Mesma posição e largura aproximada do botão que substitui —
            // min-h-[44px] no wrapper (não no chip visível) mantém o alvo de
            // toque acessível sem inflar o tamanho visual do campo.
            <span className="inline-flex min-h-[44px] items-center">
              <input
                type="text"
                value={labelTagNova}
                onChange={(e) => setLabelTagNova(e.target.value)}
                onKeyDown={aoTeclarTagNova}
                onBlur={aoDesfocarTagNova}
                disabled={salvandoTagNova}
                autoFocus
                maxLength={24}
                aria-label="Nome da nova tag"
                className="w-24 rounded-full border border-[var(--jade)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--abissal)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)] disabled:opacity-50"
              />
            </span>
          ) : (
            <span className="inline-flex min-h-[44px] items-center">
              <button
                type="button"
                onClick={() => setCriandoTag(true)}
                aria-label="Criar tag"
                className="rounded-full border border-dashed border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-500 transition hover:border-[var(--jade)] hover:text-[var(--jade)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)]"
              >
                + Nova tag
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
