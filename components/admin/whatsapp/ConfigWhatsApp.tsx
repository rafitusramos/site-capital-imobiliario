"use client";

import { useState, useTransition, type FormEvent } from "react";
import { assinarWebhooksWhatsApp, salvarNumeroOficial } from "@/app/actions/admin-whatsapp";
import { useToast } from "@/lib/admin/toast";

/** Campo "Número oficial" (digitado livre; o servidor valida e normaliza). */
export function FormNumeroOficial({ inicial }: { inicial: string }) {
  const { mostrarToast } = useToast();
  const [pendente, iniciar] = useTransition();
  const [valor, setValor] = useState(inicial);

  function enviar(e: FormEvent) {
    e.preventDefault();
    iniciar(async () => {
      const r = await salvarNumeroOficial(valor);
      mostrarToast(r.sucesso ? "sucesso" : "erro", r.sucesso ? "Número oficial salvo." : (r.erro ?? "Não foi possível salvar."));
    });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="numero-oficial" className="mb-1 block text-sm font-medium text-[var(--abissal)]">
          Número oficial
        </label>
        <input
          id="numero-oficial"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          aria-describedby="numero-oficial-ajuda"
          className="min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-800"
        />
        <p id="numero-oficial-ajuda" className="mt-1 text-xs text-neutral-500">
          O número do dono que recebe os avisos. Com DDD, por exemplo (19) 99999-9999.
        </p>
      </div>
      <button
        type="submit"
        disabled={pendente}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--abissal)] px-5 text-sm font-medium text-[var(--branco)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pendente ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}

/** Assina a WABA aos webhooks. Só aparece com o WhatsApp configurado. */
export function BotaoAssinarWebhooks() {
  const { mostrarToast } = useToast();
  const [pendente, iniciar] = useTransition();

  function clicar() {
    iniciar(async () => {
      const r = await assinarWebhooksWhatsApp();
      mostrarToast(r.sucesso ? "sucesso" : "erro", r.sucesso ? "Webhooks assinados." : (r.erro ?? "Não foi possível assinar."));
    });
  }

  return (
    <button
      type="button"
      onClick={clicar}
      disabled={pendente}
      className="inline-flex min-h-11 items-center rounded-md border border-[var(--abissal)] bg-white px-5 text-sm font-medium text-[var(--abissal)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pendente ? "Assinando..." : "Assinar webhooks"}
    </button>
  );
}
