"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { alternarAutomacao, excluirAutomacao } from "@/app/actions/admin-instagram";
import { ConfirmarAcao } from "@/components/admin/ConfirmarAcao";
import { useToast } from "@/lib/admin/toast";
import type { AutomacaoPainel } from "@/lib/queries/admin-instagram";

function alvoTexto(a: AutomacaoPainel) {
  if (a.alvo === "qualquer") return "Qualquer publicação";
  if (a.alvo === "proxima") return "Próxima publicação";
  return null;
}

const CTA =
  "inline-flex min-h-11 items-center rounded-md bg-[var(--abissal)] px-5 text-sm font-medium text-[var(--branco)] transition hover:opacity-90";

export function ListaAutomacoes({ automacoes }: { automacoes: AutomacaoPainel[] }) {
  const { mostrarToast } = useToast();
  const [lista, setLista] = useState(automacoes);
  const [excluindo, setExcluindo] = useState<AutomacaoPainel | null>(null);
  const [pendente, executar] = useTransition();

  function alternar(a: AutomacaoPainel) {
    const nova = !a.ativa;
    setLista((l) => l.map((x) => (x.id === a.id ? { ...x, ativa: nova } : x)));
    executar(async () => {
      const r = await alternarAutomacao(a.id, nova);
      if (!r.sucesso) {
        setLista((l) => l.map((x) => (x.id === a.id ? { ...x, ativa: a.ativa } : x)));
        mostrarToast("erro", r.erro ?? "Não foi possível alterar a automação.");
      } else {
        mostrarToast("sucesso", nova ? "Automação ativada." : "Automação pausada.");
      }
    });
  }

  function confirmarExclusao() {
    const a = excluindo;
    if (!a) return;
    executar(async () => {
      const r = await excluirAutomacao(a.id);
      setExcluindo(null);
      if (!r.sucesso) {
        mostrarToast("erro", r.erro ?? "Não foi possível excluir a automação.");
        return;
      }
      setLista((l) => l.filter((x) => x.id !== a.id));
      mostrarToast("sucesso", "Automação excluída.");
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold text-[var(--abissal)]">Automações</h1>
        {lista.length > 0 && (
          <Link href="/admin/instagram/automacoes/nova/" className={CTA}>
            Nova automação
          </Link>
        )}
      </div>

      {lista.length === 0 ? (
        <div className="max-w-xl rounded-md border border-neutral-200 bg-white p-8 text-center">
          <p className="mb-1 text-base font-semibold text-[var(--abissal)]">Nenhuma automação ainda</p>
          <p className="mb-5 text-sm text-neutral-600">
            Uma automação responde quem comenta uma palavra-chave na sua publicação e envia o link por mensagem direta.
          </p>
          <Link href="/admin/instagram/automacoes/nova/" className={CTA}>
            Nova automação
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.map((a) => {
            const alvo = alvoTexto(a);
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-4 rounded-md border border-neutral-200 bg-white p-4">
                {a.midiaThumb && !alvo ? (
                  <img
                    src={a.midiaThumb}
                    alt="Publicação da automação"
                    width={48}
                    height={64}
                    className="h-16 w-12 flex-none rounded object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-12 flex-none items-center justify-center rounded bg-neutral-100 p-1 text-center text-[10px] leading-tight text-neutral-600">
                    {alvo ?? "Publicação"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/instagram/automacoes/${a.id}/`}
                    className="block truncate text-sm font-semibold text-[var(--abissal)] hover:underline"
                  >
                    {a.nome}
                  </Link>
                  <p className="truncate text-sm text-neutral-600">{alvo ?? "Publicação específica"}</p>
                  <p className="truncate text-sm text-neutral-600">
                    {a.palavras === null ? "Qualquer palavra" : `Palavras: ${a.palavras.join(", ")}`}
                  </p>
                </div>
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    role="switch"
                    checked={a.ativa}
                    onChange={() => alternar(a)}
                    disabled={pendente}
                    className="h-5 w-5 accent-[var(--jade)]"
                  />
                  {a.ativa ? "Ativa" : "Pausada"}
                </label>
                <Link
                  href={`/admin/instagram/automacoes/${a.id}/`}
                  className="inline-flex min-h-11 items-center rounded-md border border-neutral-300 px-4 text-sm font-medium text-[var(--abissal)] hover:bg-neutral-50"
                >
                  Editar
                </Link>
                <button
                  type="button"
                  onClick={() => setExcluindo(a)}
                  className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-[var(--erro)] hover:bg-black/5"
                >
                  Excluir
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmarAcao
        aberto={excluindo !== null}
        titulo="Excluir automação?"
        descricao={`"${excluindo?.nome ?? ""}" deixa de responder comentários. Não dá para desfazer.`}
        rotuloConfirmar="Excluir"
        variante="perigo"
        pendente={pendente}
        onConfirmar={confirmarExclusao}
        onCancelar={() => setExcluindo(null)}
      />
    </div>
  );
}
