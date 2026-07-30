"use client";

import { useEffect, useState } from "react";
import {
  lerConsentimento,
  definirConsentimento,
  EVENTO_CONSENTIMENTO,
  type EstadoConsentimento,
} from "@/lib/consentimento";

export function BannerConsentimento() {
  const [estado, setEstado] = useState<EstadoConsentimento>(null);
  // O SSR sempre lê `null` (não há localStorage no servidor). Sem esperar a
  // montagem no cliente para decidir se mostra, quem já respondeu veria um
  // flash do banner a cada carregamento de página.
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setEstado(lerConsentimento());
    setMontado(true);

    const aoMudar = (e: Event) => {
      setEstado((e as CustomEvent<EstadoConsentimento>).detail);
    };
    window.addEventListener(EVENTO_CONSENTIMENTO, aoMudar);
    return () => window.removeEventListener(EVENTO_CONSENTIMENTO, aoMudar);
  }, []);

  if (!montado || estado !== null) return null;

  return (
    <div
      className="consentimento-banner"
      role="dialog"
      aria-label="Preferências de cookies e privacidade"
    >
      <p className="consentimento-texto">
        Este site usa ferramentas de análise e publicidade (Google Analytics, Google Ads e Meta) para
        entender como você chegou até aqui e medir o retorno das campanhas — elas já estão ativas
        enquanto você navega. Você pode recusar quando quiser; veja os detalhes na{" "}
        <a href="/politica-de-privacidade/">Política de Privacidade</a>.
      </p>
      <div className="consentimento-acoes">
        <button
          type="button"
          className="consentimento-recusar"
          onClick={() => definirConsentimento("recusado")}
        >
          Recusar
        </button>
        <button
          type="button"
          className="cta consentimento-aceitar"
          onClick={() => definirConsentimento("aceito")}
        >
          Aceitar
        </button>
      </div>
    </div>
  );
}
