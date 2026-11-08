"use client";

import { useState, useTransition } from "react";
import { salvarNotificaLead } from "@/app/actions/admin-parametros";
import { useToast } from "@/lib/admin/toast";
import { etapasComTextoParaLead } from "@/lib/email/templates/etapa-lead";
import { ORIGEM_LABEL } from "@/lib/email/templates/base";
import type { LeadEtapaSlug, LeadTipoSlug } from "@/types/database";

export interface EtapaEmail {
  tipo: LeadTipoSlug;
  slug: LeadEtapaSlug;
  label: string;
  notificaLead: boolean;
}

const ORIGENS: LeadTipoSlug[] = ["financiamento", "home-equity", "consorcio", "imoveis"];

function chave(tipo: LeadTipoSlug, slug: LeadEtapaSlug) {
  return `${tipo}/${slug}`;
}

export function EmailsCrmForm({ etapas }: { etapas: EtapaEmail[] }) {
  const { mostrarToast } = useToast();
  const [ligadas, setLigadas] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(etapas.map((e) => [chave(e.tipo, e.slug), e.notificaLead])),
  );
  const [, iniciar] = useTransition();
  const [salvando, setSalvando] = useState<string | null>(null);

  function alternar(etapa: EtapaEmail) {
    const k = chave(etapa.tipo, etapa.slug);
    const novo = !ligadas[k];
    setLigadas((atual) => ({ ...atual, [k]: novo }));
    setSalvando(k);
    iniciar(async () => {
      const r = await salvarNotificaLead({ tipo: etapa.tipo, etapa: etapa.slug, notifica: novo });
      setSalvando(null);
      if (!r.sucesso) {
        setLigadas((atual) => ({ ...atual, [k]: !novo }));
        mostrarToast("erro", r.erro ?? "Não foi possível salvar.");
        return;
      }
      mostrarToast("sucesso", novo ? `E-mail ao lead ligado em ${etapa.label}.` : `E-mail ao lead desligado em ${etapa.label}.`);
    });
  }

  return (
    <div className="max-w-2xl">
      {ORIGENS.map((origem) => {
        const comTexto = new Set(etapasComTextoParaLead(origem));
        const daOrigem = etapas.filter((e) => e.tipo === origem);
        if (daOrigem.length === 0) return null;
        return (
          <fieldset key={origem} className="mb-6 rounded-md border border-neutral-200 p-4">
            <legend className="px-1 text-sm font-semibold text-[var(--abissal)]">{ORIGEM_LABEL[origem]}</legend>
            <ul className="divide-y divide-neutral-100">
              {daOrigem.map((etapa) => {
                const k = chave(etapa.tipo, etapa.slug);
                const temTexto = comTexto.has(etapa.slug);
                const id = `email-${k.replace("/", "-")}`;
                return (
                  <li key={k} className="flex min-h-11 items-center justify-between gap-4 py-2">
                    <label htmlFor={id} className="text-sm text-neutral-700">
                      {etapa.label}
                      {!temTexto && <span className="ml-2 text-xs text-neutral-400">sem e-mail ao lead nesta etapa</span>}
                    </label>
                    <input
                      id={id}
                      type="checkbox"
                      role="switch"
                      className="h-5 w-5 cursor-pointer accent-[var(--jade)] disabled:cursor-not-allowed"
                      checked={temTexto && Boolean(ligadas[k])}
                      disabled={!temTexto || salvando === k}
                      onChange={() => alternar(etapa)}
                      aria-label={`Enviar e-mail ao lead ao entrar em ${etapa.label}`}
                    />
                  </li>
                );
              })}
            </ul>
          </fieldset>
        );
      })}
    </div>
  );
}
