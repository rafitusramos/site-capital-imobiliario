"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CAMPOS_POR_ORIGEM } from "@/lib/crm/campos";
import { etapaInicial } from "@/lib/crm/etapas";
import { cpfValido, telefoneValido } from "@/lib/financeiro";
import { mascaraCpf, mascaraTelefone } from "@/lib/mascaras";
import { criarLead } from "@/app/actions/admin-crm";
import { useToast } from "@/lib/admin/toast";
import { chaveParaCamel, textoEditavelParaValor, valorParaTextoEditavel } from "@/components/admin/crm/conversorCampo";
import { CampoOrigemInput } from "@/components/admin/crm/CampoOrigemInput";
import { IconeFechar } from "@/components/admin/crm/icones";
import type { DominiosCRM } from "@/lib/queries/admin-crm";
import type { LeadTipoSlug } from "@/types/database";

const LABEL_ORIGEM: Record<LeadTipoSlug, string> = {
  financiamento: "Financiamento",
  "home-equity": "Home Equity",
  imoveis: "Imóveis",
  consorcio: "Consórcio",
};

const CAMPO =
  "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]";
const LABEL = "mb-1 block text-sm font-medium text-[var(--abissal)]";
const BOTAO_PRIMARIO =
  "rounded-md bg-[var(--jade)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#175840] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)] disabled:opacity-50";
const BOTAO_SECUNDARIO =
  "rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--jade)] disabled:opacity-50";

function elementosFocaveis(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null);
}

type ValoresComuns = { nome: string; telefone: string; email: string; cpf: string; corretorId: string };

const COMUNS_INICIAIS: ValoresComuns = { nome: "", telefone: "", email: "", cpf: "", corretorId: "" };

export type NovoLeadModalProps = {
  /** Origem da aba atual (docs/crm-spec.md §1.4: "n" abre `?novo=1` na aba em que o operador está). */
  tipo: LeadTipoSlug;
  dominios: DominiosCRM;
  onFechar: () => void;
};

/**
 * Criação manual de lead (decisão travada #2, docs/crm-spec.md): sem isso a
 * aba Consórcio nasce vazia para sempre, já que não há formulário de
 * consórcio no site. Campos comuns + campos da origem da aba atual, todos
 * editáveis (`forcarEditavel`) — ao contrário de PainelOrigem.tsx, aqui não
 * existe simulador nenhum cujo dado precise ser protegido. A etapa inicial
 * NUNCA é escolhida na interface: vem de `etapaInicial()` (lib/crm/etapas.ts)
 * só para exibir a informação, e o servidor (`criarLead`) resolve a mesma
 * etapa de novo, de forma independente.
 */
export function NovoLeadModal({ tipo, dominios, onFechar }: NovoLeadModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { mostrarToast } = useToast();

  const camposOrigem = CAMPOS_POR_ORIGEM[tipo];

  const [comuns, setComuns] = useState<ValoresComuns>(COMUNS_INICIAIS);
  const [errosComuns, setErrosComuns] = useState<Partial<Record<keyof ValoresComuns, string>>>({});
  const [valoresOrigem, setValoresOrigem] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const campo of camposOrigem) {
      if (campo.calculado) continue;
      inicial[campo.chave] = valorParaTextoEditavel(campo.tipo, undefined);
    }
    return inicial;
  });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const painelRef = useRef<HTMLDivElement>(null);
  const ultimoFocoRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    ultimoFocoRef.current = document.activeElement as HTMLElement | null;
    const primeiro = painelRef.current?.querySelector<HTMLElement>("input");
    primeiro?.focus();

    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onFechar();
        return;
      }
      if (e.key !== "Tab" || !painelRef.current) return;
      const focaveis = elementosFocaveis(painelRef.current);
      if (focaveis.length === 0) return;
      const primeiroEl = focaveis[0];
      const ultimoEl = focaveis[focaveis.length - 1];
      if (e.shiftKey && document.activeElement === primeiroEl) {
        e.preventDefault();
        ultimoEl.focus();
      } else if (!e.shiftKey && document.activeElement === ultimoEl) {
        e.preventDefault();
        primeiroEl.focus();
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      ultimoFocoRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setComum<K extends keyof ValoresComuns>(campo: K, valor: string) {
    setComuns((atual) => ({ ...atual, [campo]: valor }));
  }

  function validarComuns(): boolean {
    const novosErros: Partial<Record<keyof ValoresComuns, string>> = {};
    if (comuns.nome.trim().length < 3) novosErros.nome = "Informe o nome completo.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(comuns.email.trim())) novosErros.email = "Informe um e-mail válido.";
    if (!telefoneValido(comuns.telefone)) novosErros.telefone = "Informe um telefone válido com DDD.";
    if (comuns.cpf.trim() !== "" && !cpfValido(comuns.cpf)) novosErros.cpf = "Informe um CPF válido.";
    setErrosComuns(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function enviar() {
    setErro(null);
    if (!validarComuns()) return;

    const dadosOrigem: Record<string, unknown> = {};
    for (const campo of camposOrigem) {
      if (campo.calculado) continue;
      dadosOrigem[chaveParaCamel(campo.chave)] = textoEditavelParaValor(campo.tipo, valoresOrigem[campo.chave] ?? "");
    }

    setEnviando(true);
    const resultado = await criarLead({
      tipo,
      dados: {
        nome: comuns.nome.trim(),
        email: comuns.email.trim(),
        telefone: comuns.telefone,
        cpf: comuns.cpf.trim() === "" ? undefined : comuns.cpf,
        corretorId: comuns.corretorId === "" ? undefined : comuns.corretorId,
        ...dadosOrigem,
      },
    });
    setEnviando(false);

    if (!resultado.sucesso) {
      setErro(resultado.erro ?? "Não foi possível criar o lead.");
      return;
    }

    mostrarToast(
      "sucesso",
      resultado.erro ? `Lead ${resultado.protocolo} criado — ${resultado.erro}` : `Lead ${resultado.protocolo} criado.`,
    );

    // Abre o lead recém-criado no ModalLead (troca ?novo=1 por ?lead=<id>) —
    // o corretor pode seguir direto para a primeira interação/lembrete.
    if (resultado.id) router.push(`${pathname}?lead=${resultado.id}`);
    else onFechar();
  }

  // Snapshot dos valores já digitados, convertidos para o mesmo formato que
  // `campo.calculado` (ex.: LTV) espera — recalculado a cada render para o
  // preview acompanhar a digitação, igual a PainelOrigem.tsx.
  const dadosParaCalculoOrigem: Record<string, unknown> = {};
  for (const campo of camposOrigem) {
    if (campo.calculado) continue;
    dadosParaCalculoOrigem[campo.chave] = textoEditavelParaValor(campo.tipo, valoresOrigem[campo.chave] ?? "");
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-8 motion-reduce:transition-none"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div ref={painelRef} role="dialog" aria-modal="true" aria-labelledby="novo-lead-titulo" className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-black/5 px-5 py-4">
          <div>
            <h2 id="novo-lead-titulo" className="text-base font-semibold text-[var(--abissal)]">
              Novo lead · {LABEL_ORIGEM[tipo]}
            </h2>
            <p className="text-xs text-neutral-500">Nasce na etapa {etapaInicial(tipo).label}.</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded-md p-1.5 text-neutral-400 transition hover:bg-black/5 hover:text-neutral-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--jade)]"
          >
            <IconeFechar className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-5 py-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Dados do lead</h3>
          <div className="mb-4">
            <label className={LABEL} htmlFor="nl-nome">
              Nome completo
            </label>
            <input
              id="nl-nome"
              type="text"
              value={comuns.nome}
              onChange={(e) => setComum("nome", e.target.value)}
              aria-invalid={errosComuns.nome ? true : undefined}
              aria-describedby={errosComuns.nome ? "nl-nome-erro" : undefined}
              className={`${CAMPO} ${errosComuns.nome ? "border-[var(--erro)]" : ""}`}
            />
            {errosComuns.nome ? (
              <p id="nl-nome-erro" role="alert" className="mt-1 text-xs text-[var(--erro)]">
                {errosComuns.nome}
              </p>
            ) : null}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="nl-telefone">
                Telefone
              </label>
              <input
                id="nl-telefone"
                type="tel"
                inputMode="tel"
                value={comuns.telefone}
                onChange={(e) => setComum("telefone", mascaraTelefone(e.target.value))}
                aria-invalid={errosComuns.telefone ? true : undefined}
                aria-describedby={errosComuns.telefone ? "nl-telefone-erro" : undefined}
                className={`${CAMPO} [font-family:var(--mono),monospace] ${errosComuns.telefone ? "border-[var(--erro)]" : ""}`}
              />
              {errosComuns.telefone ? (
                <p id="nl-telefone-erro" role="alert" className="mt-1 text-xs text-[var(--erro)]">
                  {errosComuns.telefone}
                </p>
              ) : null}
            </div>
            <div>
              <label className={LABEL} htmlFor="nl-cpf">
                CPF (opcional)
              </label>
              <input
                id="nl-cpf"
                type="text"
                inputMode="numeric"
                value={comuns.cpf}
                onChange={(e) => setComum("cpf", mascaraCpf(e.target.value))}
                aria-invalid={errosComuns.cpf ? true : undefined}
                aria-describedby={errosComuns.cpf ? "nl-cpf-erro" : undefined}
                className={`${CAMPO} [font-family:var(--mono),monospace] ${errosComuns.cpf ? "border-[var(--erro)]" : ""}`}
              />
              {errosComuns.cpf ? (
                <p id="nl-cpf-erro" role="alert" className="mt-1 text-xs text-[var(--erro)]">
                  {errosComuns.cpf}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mb-4">
            <label className={LABEL} htmlFor="nl-email">
              E-mail
            </label>
            <input
              id="nl-email"
              type="email"
              value={comuns.email}
              onChange={(e) => setComum("email", e.target.value)}
              aria-invalid={errosComuns.email ? true : undefined}
              aria-describedby={errosComuns.email ? "nl-email-erro" : undefined}
              className={`${CAMPO} ${errosComuns.email ? "border-[var(--erro)]" : ""}`}
            />
            {errosComuns.email ? (
              <p id="nl-email-erro" role="alert" className="mt-1 text-xs text-[var(--erro)]">
                {errosComuns.email}
              </p>
            ) : null}
          </div>

          <div className="mb-6">
            <label className={LABEL} htmlFor="nl-responsavel">
              Responsável (opcional)
            </label>
            <select
              id="nl-responsavel"
              value={comuns.corretorId}
              onChange={(e) => setComum("corretorId", e.target.value)}
              className={CAMPO}
            >
              <option value="">Sem responsável</option>
              {dominios.corretores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>

          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Dados da origem</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {camposOrigem.map((campo) => (
              <CampoOrigemInput
                key={campo.chave}
                campo={campo}
                forcarEditavel
                // Chaves em snake_case (iguais às de `dados` em PainelOrigem.tsx)
                // — é o que `campo.calculado` (ex.: LTV) espera; sem isto o
                // preview ficaria sempre "—" durante a criação manual.
                dadosParaCalculo={dadosParaCalculoOrigem}
                valor={valoresOrigem[campo.chave]}
                onChange={(novoValor) => setValoresOrigem((atual) => ({ ...atual, [campo.chave]: novoValor }))}
              />
            ))}
          </div>

          {erro ? (
            <p role="alert" className="mt-4 text-sm text-[var(--erro)]">
              {erro}
            </p>
          ) : null}

          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onFechar} disabled={enviando} className={BOTAO_SECUNDARIO}>
              Cancelar
            </button>
            <button type="button" onClick={enviar} disabled={enviando} className={BOTAO_PRIMARIO}>
              {enviando ? "Criando…" : "Criar lead"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
