"use client";

import { useMemo, useState } from "react";
import type { ImovelComCapa } from "@/lib/queries/imoveis";
import { ImovelCard } from "@/components/imoveis/ImovelCard";
import { ORDEM_FASES, formatarFase, formatarTipo } from "@/lib/imoveis/formato";

const ORDEM_TIPOS = ["apartamento", "vila", "loteamento"] as const;

type ImoveisFiltroProps = {
  imoveis: ImovelComCapa[];
};

export function ImoveisFiltro({ imoveis }: ImoveisFiltroProps) {
  const [filtroFase, setFiltroFase] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);

  const fases = useMemo(() => {
    const vistas = new Set(imoveis.map((imovel) => imovel.fase));
    return ORDEM_FASES.filter((fase) => vistas.has(fase));
  }, [imoveis]);

  const tipos = useMemo(() => {
    const vistos = new Set(imoveis.map((imovel) => imovel.tipo));
    return ORDEM_TIPOS.filter((tipo) => vistos.has(tipo));
  }, [imoveis]);

  const filtrados = useMemo(() => {
    return imoveis.filter((imovel) => {
      if (filtroFase && imovel.fase !== filtroFase) return false;
      if (filtroTipo && imovel.tipo !== filtroTipo) return false;
      return true;
    });
  }, [imoveis, filtroFase, filtroTipo]);

  function mensagemVazio(): string {
    if (filtroFase || filtroTipo) {
      return "Nenhum empreendimento encontrado com esses filtros.";
    }
    return "Nenhum empreendimento em lançamento no momento.";
  }

  return (
    <>
      <div className="im-filtros">
        {fases.length > 1 ? (
          <div className="blog-filtro" role="group" aria-label="Filtrar por fase da obra">
            <button
              type="button"
              className={filtroFase === null ? "ativo" : undefined}
              onClick={() => setFiltroFase(null)}
            >
              Todas as fases
            </button>
            {fases.map((fase) => (
              <button
                key={fase}
                type="button"
                className={filtroFase === fase ? "ativo" : undefined}
                onClick={() => setFiltroFase(fase)}
              >
                {formatarFase(fase)}
              </button>
            ))}
          </div>
        ) : null}

        {tipos.length > 1 ? (
          <div className="blog-filtro" role="group" aria-label="Filtrar por tipo de empreendimento">
            <button
              type="button"
              className={filtroTipo === null ? "ativo" : undefined}
              onClick={() => setFiltroTipo(null)}
            >
              Todos os tipos
            </button>
            {tipos.map((tipo) => (
              <button
                key={tipo}
                type="button"
                className={filtroTipo === tipo ? "ativo" : undefined}
                onClick={() => setFiltroTipo(tipo)}
              >
                {formatarTipo(tipo)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {filtrados.length > 0 ? (
        <div className="im-grid">
          {filtrados.map((imovel) => (
            <ImovelCard key={imovel.id} imovel={imovel} />
          ))}
        </div>
      ) : (
        <div className="im-vazio">{mensagemVazio()}</div>
      )}
    </>
  );
}
