"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { listarPublicacoes } from "@/app/actions/admin-instagram";
import type { Publicacao } from "@/lib/instagram/graph";

type Props = {
  midiaId: string | null;
  miniaturaAtual: string | null;
  onEscolher: (p: Publicacao) => void;
};

/** Grade de publicações da conta, carregada só quando a pessoa pede. */
export function SeletorPublicacao({ midiaId, miniaturaAtual, onEscolher }: Props) {
  const [pubs, setPubs] = useState<Publicacao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, carregar] = useTransition();

  function abrir() {
    setErro(null);
    carregar(async () => {
      const r = await listarPublicacoes();
      if (!r.sucesso || !r.publicacoes) {
        setErro(r.erro ?? "Não foi possível carregar as publicações.");
        return;
      }
      setPubs(r.publicacoes);
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        {miniaturaAtual ? (
          <img
            src={miniaturaAtual}
            alt="Publicação escolhida"
            width={56}
            height={72}
            className="h-[72px] w-14 rounded object-cover outline outline-2 outline-[var(--jade)]"
          />
        ) : (
          <p className="text-sm text-neutral-500">{midiaId ? "Publicação escolhida." : "Nenhuma publicação escolhida."}</p>
        )}
        <button
          type="button"
          onClick={abrir}
          disabled={pendente}
          className="inline-flex min-h-11 items-center rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-[var(--abissal)] transition hover:bg-neutral-50 disabled:opacity-50"
        >
          {pendente ? "Carregando..." : pubs ? "Recarregar publicações" : "Escolher publicação"}
        </button>
      </div>

      {erro && (
        <p role="alert" className="text-sm text-[var(--erro)]">
          {erro}{" "}
          {erro.includes("Conecte") && (
            <Link href="/admin/instagram/conexao/" className="underline">
              Ir para Conexão
            </Link>
          )}
        </p>
      )}

      {pubs && pubs.length === 0 && <p className="text-sm text-neutral-500">Nenhuma publicação encontrada na conta.</p>}
      {pubs && pubs.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {pubs.map((p) => {
            const ativa = p.id === midiaId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onEscolher(p)}
                  aria-pressed={ativa}
                  aria-label={p.legenda ? `Escolher: ${p.legenda.slice(0, 60)}` : `Escolher publicação (${p.tipo})`}
                  className={`block aspect-[3/4] w-full overflow-hidden rounded bg-neutral-200 ${
                    ativa ? "outline outline-[3px] outline-offset-1 outline-[var(--jade)]" : "hover:opacity-80"
                  }`}
                >
                  {p.miniatura && <img src={p.miniatura} alt="" className="h-full w-full object-cover" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
