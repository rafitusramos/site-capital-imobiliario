"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { salvarParametros } from "@/app/actions/admin-parametros";
import { useToast } from "@/lib/admin/toast";
import { formatarAtualizacao } from "@/lib/parametros/atualizacao";

type Valores = {
  financiamentoTaxaAnual: number;
  homeEquityTaxaMensal: number;
};

const CAMPO =
  "mb-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]";
const LABEL = "mb-1 block text-sm font-medium text-[var(--abissal)]";

export function ParametrosForm({
  valoresIniciais,
  atualizadoEm,
  atualizadoPorNome,
}: {
  valoresIniciais: Valores;
  atualizadoEm: string | null;
  atualizadoPorNome: string | null;
}) {
  const router = useRouter();
  const [valores, setValores] = useState<Valores>(valoresIniciais);
  const [salvando, setSalvando] = useState(false);
  const { mostrarToast } = useToast();

  function setValor<K extends keyof Valores>(campo: K, valor: number) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvar() {
    setSalvando(true);
    const resultado = await salvarParametros(valores);
    setSalvando(false);

    if (!resultado.sucesso) {
      mostrarToast("erro", resultado.erro ?? "Não foi possível salvar as taxas.");
      return;
    }
    mostrarToast("sucesso", "Taxas salvas.");
    // Refaz a leitura no servidor (page.tsx) para trazer o updated_at e o
    // nome de quem editou já refletindo o salvamento que acabou de ocorrer.
    router.refresh();
  }

  return (
    <div className="max-w-md">
      <div className="mb-5">
        <label className={LABEL} htmlFor="taxa-financiamento">
          Taxa de financiamento
        </label>
        <div className="flex items-center gap-2">
          <input
            id="taxa-financiamento"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            max={30}
            // Limpar o campo faz valueAsNumber virar NaN. Passar NaN para
            // `value` de um input controlado gera aviso do React, então o
            // campo vazio é renderizado como string vazia. O NaN continua no
            // estado de propósito: ao salvar, o schema zod o reprova com
            // "Informe a taxa de financiamento." em vez de gravar um zero
            // silencioso.
            value={Number.isNaN(valores.financiamentoTaxaAnual) ? "" : valores.financiamentoTaxaAnual}
            onChange={(e) => setValor("financiamentoTaxaAnual", e.target.valueAsNumber)}
            className={CAMPO}
          />
          <span className="whitespace-nowrap text-sm text-neutral-500">% ao ano</span>
        </div>
        <p className="text-xs text-neutral-400">Usada pelo simulador em /financiamento (sistema SAC/PRICE).</p>
      </div>

      <div className="mb-5">
        <label className={LABEL} htmlFor="taxa-home-equity">
          Taxa de home equity
        </label>
        <div className="flex items-center gap-2">
          <input
            id="taxa-home-equity"
            type="number"
            inputMode="decimal"
            // step de 0.001 (e não 0.01 como o campo acima) para permitir
            // digitar taxas mensais finas do tipo 1,095% — é a precisão que a
            // coluna numeric(8,6) da migration 013 foi dimensionada para
            // guardar.
            step="0.001"
            min={0}
            max={5}
            value={Number.isNaN(valores.homeEquityTaxaMensal) ? "" : valores.homeEquityTaxaMensal}
            onChange={(e) => setValor("homeEquityTaxaMensal", e.target.valueAsNumber)}
            className={CAMPO}
          />
          <span className="whitespace-nowrap text-sm text-neutral-500">% ao mês</span>
        </div>
        <p className="text-xs text-neutral-400">Usada pelo simulador em /home_equity (tabela Price).</p>
      </div>

      <p className="mb-4 text-xs text-neutral-500">
        Última atualização: {formatarAtualizacao(atualizadoEm)}
        {atualizadoPorNome ? ` · por ${atualizadoPorNome}` : ""}
      </p>

      <button
        type="button"
        disabled={salvando}
        onClick={salvar}
        className="rounded-md bg-[var(--jade)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#175840] disabled:opacity-50"
      >
        {salvando ? "Salvando…" : "Salvar taxas"}
      </button>
    </div>
  );
}
