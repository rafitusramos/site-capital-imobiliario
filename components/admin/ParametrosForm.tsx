"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { salvarParametros } from "@/app/actions/admin-parametros";

type Valores = {
  financiamentoTaxaAnual: number;
  homeEquityTaxaMensal: number;
};

const CAMPO =
  "mb-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]";
const LABEL = "mb-1 block text-sm font-medium text-[var(--abissal)]";

function formatarData(iso: string | null): string {
  if (!iso) return "nunca editado — valor de fábrica";
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

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
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  function setValor<K extends keyof Valores>(campo: K, valor: number) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvar() {
    setErro(null);
    setMensagem(null);
    setSalvando(true);
    const resultado = await salvarParametros(valores);
    setSalvando(false);

    if (!resultado.sucesso) {
      setErro(resultado.erro ?? "Não foi possível salvar as taxas.");
      return;
    }
    setMensagem("Taxas salvas.");
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
        Última atualização: {formatarData(atualizadoEm)}
        {atualizadoPorNome ? ` · por ${atualizadoPorNome}` : ""}
      </p>

      {erro ? <p className="mb-3 text-sm text-[var(--erro)]">{erro}</p> : null}
      {mensagem ? <p className="mb-3 text-sm text-[var(--jade)]">{mensagem}</p> : null}

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
