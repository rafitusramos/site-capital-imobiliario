"use client";

import { useMemo, useRef, useState } from "react";
import { adicionarPalavras, removerPalavra, sugerirPalavras } from "@/lib/instagram/campo-palavras";

type Props = {
  id: string;
  valor: string[];
  onChange: (v: string[]) => void;
  /** Palavras já usadas em outras automações, da mais usada à menos. */
  sugestoes: string[];
  desabilitado?: boolean;
  erro?: string;
};

const AJUDA = "Digite e tecle Enter ou vírgula para adicionar. Maiúsculas e acentos são ignorados.";

/**
 * Campo de palavras-chave em chips com sugestões (padrão ARIA combobox/listbox).
 * Controlado: a lista vive no formulário; só o texto digitado e o destaque
 * da sugestão são estado local.
 */
export function CampoPalavras({ id, valor, onChange, sugestoes, desabilitado = false, erro }: Props) {
  const [texto, setTexto] = useState("");
  const [destaque, setDestaque] = useState(-1);
  const [fechada, setFechada] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  const opcoes = useMemo(() => sugerirPalavras(sugestoes, texto, valor), [sugestoes, texto, valor]);
  const aberta = !desabilitado && !fechada && opcoes.length > 0;
  const listaId = `${id}-lista`;
  const ajudaId = `${id}-ajuda`;
  const opcaoId = (i: number) => `${id}-op-${i}`;

  function confirmar(bruto: string) {
    if (bruto.trim().length > 0) onChange(adicionarPalavras(valor, bruto));
    setTexto("");
    setDestaque(-1);
    setFechada(false);
  }

  function aoDigitar(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    // Vírgula digitada fecha o chip; o que vier depois fica como novo texto.
    if (v.includes(",") || v.includes("\n")) {
      const partes = v.split(/[,\n]/);
      const resto = partes.pop() ?? "";
      const lista = adicionarPalavras(valor, partes.join(","));
      onChange(lista);
      setTexto(resto);
    } else {
      setTexto(v);
    }
    setDestaque(-1);
    setFechada(false);
  }

  function aoTeclar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && opcoes.length > 0) {
      e.preventDefault();
      setFechada(false);
      setDestaque((d) => (d + 1) % opcoes.length);
    } else if (e.key === "ArrowUp" && opcoes.length > 0) {
      e.preventDefault();
      setFechada(false);
      setDestaque((d) => (d <= 0 ? opcoes.length - 1 : d - 1));
    } else if (e.key === "Enter") {
      // Enter nunca envia o formulário a partir deste campo.
      e.preventDefault();
      if (aberta && destaque >= 0 && destaque < opcoes.length) confirmar(opcoes[destaque]);
      else confirmar(texto);
    } else if (e.key === "Escape") {
      if (aberta) {
        e.preventDefault();
        setFechada(true);
        setDestaque(-1);
      }
    } else if (e.key === "Backspace" && texto.length === 0 && valor.length > 0) {
      onChange(removerPalavra(valor, valor.length - 1));
    }
  }

  function aoColar(e: React.ClipboardEvent<HTMLInputElement>) {
    const colado = e.clipboardData.getData("text");
    if (!/[,\n\r]/.test(colado)) return;
    e.preventDefault();
    onChange(adicionarPalavras(valor, texto + colado));
    setTexto("");
    setDestaque(-1);
  }

  function aoSair(e: React.FocusEvent<HTMLDivElement>) {
    // Foco ainda dentro do campo (chip, X, opção): não confirma nem fecha.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    if (texto.trim().length > 0) confirmar(texto);
    setFechada(true);
    setDestaque(-1);
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-neutral-800">
        Palavras-chave
      </label>
      <div className="relative" onBlur={aoSair}>
        <div
          onClick={() => entrada.current?.focus()}
          className={`flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-md border bg-white px-2 py-1.5 text-sm text-[var(--tinta)] focus-within:border-[var(--jade)] focus-within:ring-2 focus-within:ring-[var(--jade)]/30 ${
            erro ? "border-[var(--erro)]" : "border-neutral-300"
          } ${desabilitado ? "cursor-not-allowed opacity-60" : "cursor-text"}`}
        >
          {/* role explícito: o Safari tira a semântica de lista de um ul com display: contents */}
          <ul role="list" className="contents" aria-label="Palavras-chave adicionadas">
            {valor.map((p, i) => (
              <li
                key={`${p}-${i}`}
                className="inline-flex max-w-full items-center gap-0.5 rounded bg-[var(--areia)] py-0.5 pl-2 pr-0.5 text-[var(--tinta)]"
              >
                <span className="break-all">{p}</span>
                <button
                  type="button"
                  disabled={desabilitado}
                  onClick={() => {
                    onChange(removerPalavra(valor, i));
                    entrada.current?.focus();
                  }}
                  aria-label={`Remover palavra ${p}`}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-600 hover:bg-black/10 hover:text-[var(--tinta)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--jade)]"
                >
                  <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          <input
            ref={entrada}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={aberta}
            aria-controls={listaId}
            aria-autocomplete="list"
            aria-activedescendant={aberta && destaque >= 0 ? opcaoId(destaque) : undefined}
            aria-invalid={erro ? true : undefined}
            aria-describedby={ajudaId}
            autoComplete="off"
            disabled={desabilitado}
            value={texto}
            onChange={aoDigitar}
            onKeyDown={aoTeclar}
            onPaste={aoColar}
            className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm text-[var(--tinta)] outline-none"
          />
        </div>
        {/* Sempre no DOM (oculta quando fechada) para o aria-controls do campo apontar para algo que existe. */}
        <ul
          id={listaId}
          role="listbox"
          aria-label="Palavras já usadas"
          hidden={!aberta}
          className="absolute left-0 right-0 z-10 mt-1 max-h-60 overflow-auto rounded-md border border-neutral-300 bg-white py-1 shadow-sm"
        >
            {opcoes.map((o, i) => (
              <li
                key={o}
                id={opcaoId(i)}
                role="option"
                aria-selected={i === destaque}
                // mouseDown (e não click) para agir antes de o campo perder o foco.
                onMouseDown={(e) => {
                  e.preventDefault();
                  confirmar(o);
                  entrada.current?.focus();
                }}
                onMouseEnter={() => setDestaque(i)}
                className={`cursor-pointer px-3 py-2 text-sm text-[var(--tinta)] ${i === destaque ? "bg-[var(--areia)]" : ""}`}
              >
                {o}
              </li>
            ))}
        </ul>
      </div>
      <div id={ajudaId} className="mt-1 text-xs">
        <span className={erro ? "text-[var(--erro)]" : "text-neutral-600"}>{erro ?? AJUDA}</span>
      </div>
    </div>
  );
}
