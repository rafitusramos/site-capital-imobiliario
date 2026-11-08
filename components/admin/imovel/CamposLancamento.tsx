"use client";

import { mascaraMoeda } from "@/lib/mascaras";
import { CAMPO, LABEL, type CamposProps } from "@/components/admin/imovel/camposComuns";

/**
 * Faixas (área, dormitórios, banheiros, vagas), valor "a partir de" e previsão
 * de entrega: o que só faz sentido para um empreendimento em lançamento.
 */
export function CamposLancamento({ valores, setCampo }: CamposProps) {
  return (
    <>
      <label className={LABEL}>Faixa de área (m²)</label>
      <div className="grid grid-cols-2 gap-3">
        <input
          aria-label="Área mínima"
          placeholder="mín."
          value={valores.area_min}
          onChange={(e) => setCampo("area_min", e.target.value)}
          className={CAMPO}
        />
        <input
          aria-label="Área máxima"
          placeholder="máx."
          value={valores.area_max}
          onChange={(e) => setCampo("area_max", e.target.value)}
          className={CAMPO}
        />
      </div>

      <label className={LABEL}>Faixa de dormitórios</label>
      <div className="grid grid-cols-2 gap-3">
        <input
          aria-label="Dormitórios mínimo"
          placeholder="mín."
          value={valores.dormitorios_min}
          onChange={(e) => setCampo("dormitorios_min", e.target.value)}
          className={CAMPO}
        />
        <input
          aria-label="Dormitórios máximo"
          placeholder="máx."
          value={valores.dormitorios_max}
          onChange={(e) => setCampo("dormitorios_max", e.target.value)}
          className={CAMPO}
        />
      </div>

      <label className={LABEL}>Faixa de banheiros</label>
      <div className="grid grid-cols-2 gap-3">
        <input
          aria-label="Banheiros mínimo"
          placeholder="mín."
          value={valores.banheiros_min}
          onChange={(e) => setCampo("banheiros_min", e.target.value)}
          className={CAMPO}
        />
        <input
          aria-label="Banheiros máximo"
          placeholder="máx."
          value={valores.banheiros_max}
          onChange={(e) => setCampo("banheiros_max", e.target.value)}
          className={CAMPO}
        />
      </div>

      <label className={LABEL}>Faixa de vagas</label>
      <div className="grid grid-cols-2 gap-3">
        <input
          aria-label="Vagas mínimo"
          placeholder="mín."
          value={valores.vagas_min}
          onChange={(e) => setCampo("vagas_min", e.target.value)}
          className={CAMPO}
        />
        <input
          aria-label="Vagas máximo"
          placeholder="máx."
          value={valores.vagas_max}
          onChange={(e) => setCampo("vagas_max", e.target.value)}
          className={CAMPO}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL} htmlFor="valor_a_partir_de">
            Valor a partir de (R$)
          </label>
          <input
            id="valor_a_partir_de"
            inputMode="numeric"
            placeholder="R$ 445.000"
            value={valores.valor_a_partir_de}
            onChange={(e) => setCampo("valor_a_partir_de", mascaraMoeda(e.target.value))}
            disabled={valores.valor_sob_consulta}
            className={`${CAMPO} disabled:bg-neutral-100 disabled:text-neutral-400`}
          />
          <label className="-mt-2 mb-4 flex items-center gap-2 text-sm text-[var(--abissal)]">
            <input
              type="checkbox"
              checked={valores.valor_sob_consulta}
              onChange={(e) => setCampo("valor_sob_consulta", e.target.checked)}
            />
            Sob consulta (não exibe o valor na página)
          </label>
        </div>
        <div>
          <label className={LABEL} htmlFor="previsao_entrega">
            Previsão de entrega
          </label>
          <input
            id="previsao_entrega"
            placeholder="Dez/2027"
            value={valores.previsao_entrega}
            onChange={(e) => setCampo("previsao_entrega", e.target.value)}
            className={CAMPO}
          />
        </div>
      </div>
    </>
  );
}
