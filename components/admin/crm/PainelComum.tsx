"use client";

import { useState } from "react";
import { etapasDoTipo } from "@/lib/crm/etapas";
import { cpfValido, telefoneValido } from "@/lib/financeiro";
import { mascaraCpf, mascaraTelefone } from "@/lib/mascaras";
import { atribuirResponsavel, atualizarLead, definirTags, alternarFavorito, type AcaoResultado } from "@/app/actions/admin-crm";
import { useToast } from "@/lib/admin/toast";
import { IconeEstrela, IconeEstrelaPreenchida } from "@/components/admin/crm/icones";
import type { Database, LeadEtapaSlug } from "@/types/database";
import type { DominiosCRM } from "@/lib/queries/admin-crm";

const CAMPO =
  "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]";
const LABEL = "mb-1 block text-sm font-medium text-[var(--abissal)]";
const BOTAO_PRIMARIO =
  "rounded-md bg-[var(--jade)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#175840] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)] disabled:opacity-50";

type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

export type PainelComumProps = {
  lead: LeadRow;
  tags: string[];
  origemLabel: string;
  dominios: DominiosCRM;
  /** Orquestrado pelo ModalLead.tsx: dispara o MESMO DialogoMotivo do quadro quando a etapa exige motivo. */
  onMudarEtapa: (etapa: LeadEtapaSlug) => void;
  etapaPendente?: boolean;
  executarAcao: (promessa: Promise<AcaoResultado>, mensagemSucesso: string) => Promise<boolean>;
};

type ValoresComuns = { nome: string; telefone: string; email: string; cpf: string };

function valoresIniciais(lead: LeadRow): ValoresComuns {
  return {
    nome: lead.nome,
    telefone: mascaraTelefone(lead.telefone),
    email: lead.email,
    cpf: lead.cpf ? mascaraCpf(lead.cpf) : "",
  };
}

/** "13/07/2026 14:32", sempre no fuso de São Paulo (mesma régua de lib/crm/lembretes.ts). */
function formatarData(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

/**
 * Painel esquerdo do modal — dados comuns a qualquer origem (docs/crm-spec.md
 * §3.1). A troca de responsável, tags e favorito salvam na hora (mesmo
 * padrão instantâneo do quadro); nome/telefone/e-mail/CPF têm botão de salvar
 * próprio, para não disparar uma mutação a cada tecla.
 */
export function PainelComum({ lead, tags, origemLabel, dominios, onMudarEtapa, etapaPendente, executarAcao }: PainelComumProps) {
  const { mostrarToast } = useToast();
  const [valores, setValores] = useState<ValoresComuns>(() => valoresIniciais(lead));
  const [erros, setErros] = useState<Partial<Record<keyof ValoresComuns, string>>>({});
  const [salvandoComuns, setSalvandoComuns] = useState(false);
  const [salvandoResponsavel, setSalvandoResponsavel] = useState(false);
  const [salvandoTags, setSalvandoTags] = useState(false);
  const [salvandoFavorito, setSalvandoFavorito] = useState(false);
  const [tagsAtuais, setTagsAtuais] = useState<string[]>(tags);
  const [favorito, setFavorito] = useState(lead.favorito);

  const etapas = etapasDoTipo(lead.tipo);

  function setValor<K extends keyof ValoresComuns>(campo: K, valor: string) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
  }

  function validar(): boolean {
    const novosErros: Partial<Record<keyof ValoresComuns, string>> = {};
    if (valores.nome.trim().length < 3) novosErros.nome = "Informe o nome completo.";
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
        tipo: lead.tipo,
        comum: {
          nome: valores.nome.trim(),
          email: valores.email.trim(),
          telefone: valores.telefone,
          cpf: valores.cpf.trim() === "" ? undefined : valores.cpf,
        },
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

  async function alternarFavoritoLocal() {
    setSalvandoFavorito(true);
    const ok = await executarAcao(alternarFavorito(lead.id), favorito ? "Removido dos favoritos." : "Marcado como favorito.");
    setSalvandoFavorito(false);
    if (ok) setFavorito((atual) => !atual);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <span className="text-xs font-medium text-neutral-500 [font-family:var(--mono),monospace]">{lead.protocolo}</span>
          <p className="text-xs text-neutral-500">Criado em {formatarData(lead.created_at)}</p>
        </div>
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

      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Dados do lead</h3>

      <div className="mb-4">
        <label className={LABEL} htmlFor="pc-nome">
          Nome completo
        </label>
        <input
          id="pc-nome"
          type="text"
          value={valores.nome}
          onChange={(e) => setValor("nome", e.target.value)}
          aria-invalid={erros.nome ? true : undefined}
          aria-describedby={erros.nome ? "pc-nome-erro" : undefined}
          className={`${CAMPO} ${erros.nome ? "border-[var(--erro)]" : ""}`}
        />
        {erros.nome ? (
          <p id="pc-nome-erro" role="alert" className="mt-1 text-xs text-[var(--erro)]">
            {erros.nome}
          </p>
        ) : null}
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
            className={`${CAMPO} [font-family:var(--mono),monospace] ${erros.telefone ? "border-[var(--erro)]" : ""}`}
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
            className={`${CAMPO} [font-family:var(--mono),monospace] ${erros.cpf ? "border-[var(--erro)]" : ""}`}
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

      <div className="mb-4">
        <button type="button" onClick={salvarComuns} disabled={salvandoComuns} className={BOTAO_PRIMARIO}>
          {salvandoComuns ? "Salvando…" : "Salvar dados do lead"}
        </button>
      </div>

      <div className="mb-4">
        <span className={LABEL}>Origem</span>
        <p className="text-sm text-[var(--abissal)]">{origemLabel}</p>
      </div>

      <div className="mb-4">
        <label className={LABEL} htmlFor="pc-etapa">
          Etapa
        </label>
        <select
          id="pc-etapa"
          value={lead.status}
          disabled={etapaPendente}
          onChange={(e) => onMudarEtapa(e.target.value as LeadEtapaSlug)}
          className={`${CAMPO} disabled:opacity-50`}
        >
          {etapas.map((etapa) => (
            <option key={etapa.slug} value={etapa.slug}>
              {etapa.label}
            </option>
          ))}
        </select>
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

      {dominios.tags.length > 0 ? (
        <div>
          <span className={LABEL}>Tags</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tags do lead">
            {dominios.tags.map((tag) => {
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
          </div>
        </div>
      ) : null}
    </div>
  );
}
