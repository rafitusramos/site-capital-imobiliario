"use client";

import { useState, useTransition } from "react";
import { iniciarConexao } from "@/app/actions/admin-instagram";
import { useToast } from "@/lib/admin/toast";

/** Botão que abre o login da Meta. O servidor guarda o state em cookie e devolve a URL. */
export function BotaoConectar({ reconectar }: { reconectar: boolean }) {
  const { mostrarToast } = useToast();
  const [pendente, iniciar] = useTransition();
  const [navegando, setNavegando] = useState(false);
  const ocupado = pendente || navegando;

  function clicar() {
    iniciar(async () => {
      const r = await iniciarConexao();
      if (!r.sucesso || !r.url) {
        mostrarToast("erro", r.erro ?? "Não foi possível iniciar a conexão.");
        return;
      }
      setNavegando(true);
      window.location.assign(r.url);
    });
  }

  return (
    <button
      type="button"
      onClick={clicar}
      disabled={ocupado}
      className="inline-flex min-h-11 items-center rounded-md bg-[var(--abissal)] px-5 text-sm font-medium text-[var(--branco)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {ocupado ? "Abrindo a Meta..." : reconectar ? "Reconectar" : "Conectar Instagram"}
    </button>
  );
}
