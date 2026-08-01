"use client";

import type { CampoCRM } from "@/lib/crm/campos";
import { mascaraMoeda, mascaraNum } from "@/lib/mascaras";
import { valorParaExibicao } from "@/components/admin/crm/conversorCampo";

const LABEL = "mb-1 block text-sm font-medium text-[var(--abissal)]";
const CAMPO =
  "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-[var(--jade)] focus:outline-none focus:ring-1 focus:ring-[var(--jade)]";
const CAMPO_MONO = `${CAMPO} [font-family:var(--mono),monospace]`;
const CAMPO_ESTATICO =
  "rounded-md border border-dashed border-black/10 bg-black/[0.02] px-2.5 py-1.5 text-sm text-neutral-600";

/** Máscara por `tipo` do descritor, aplicada a cada tecla — mesma convenção de components/admin/ImovelEditor.tsx. */
function aplicarMascara(tipo: CampoCRM["tipo"], valorDigitado: string): string {
  if (tipo === "moeda") return mascaraMoeda(valorDigitado);
  if (tipo === "numero") return mascaraNum(valorDigitado);
  return valorDigitado;
}

export type CampoOrigemInputProps = {
  campo: CampoCRM;
  /** Dados completos do formulário (comum + origem), para `campo.calculado` recalcular ao vivo. */
  dadosParaCalculo?: Record<string, unknown>;
  /** `undefined` = usa `campo.somenteLeitura`; passar `true` força edição mesmo em campo normalmente somenteLeitura (uso de NovoLeadModal.tsx: lead manual não tem simulador para proteger). */
  forcarEditavel?: boolean;
  /** Valor bruto atual (do banco ou do estado local) — só relevante quando o campo é somenteLeitura/calculado, para exibição. */
  valorBruto?: unknown;
  /** String controlada do input — só relevante quando o campo é editável. */
  valor?: string;
  onChange?: (novoValor: string) => void;
  erro?: string;
};

/**
 * Renderiza UM campo do painel de origem, genericamente por `campo.tipo`
 * (docs/crm-spec.md §3.4) — não conhece nenhuma origem em particular.
 * Compartilhado por PainelOrigem.tsx (lead existente, respeita
 * `somenteLeitura`) e NovoLeadModal.tsx (`forcarEditavel`, lead novo não tem
 * nada de simulador para proteger) para as duas telas nunca divergirem no
 * catálogo de tipos de campo.
 */
export function CampoOrigemInput({
  campo,
  dadosParaCalculo,
  forcarEditavel,
  valorBruto,
  valor,
  onChange,
  erro,
}: CampoOrigemInputProps) {
  const id = `campo-origem-${campo.chave}`;
  const idErro = erro ? `${id}-erro` : undefined;

  // `calculado` nunca é editável, mesmo em criação — não é uma coluna, é
  // derivado de outros campos (ex.: LTV em lib/crm/campos.ts).
  if (campo.calculado) {
    const texto = campo.calculado(dadosParaCalculo ?? {});
    return (
      <div>
        <span className={LABEL}>{campo.label}</span>
        <p className={CAMPO_ESTATICO} title={campo.ajuda}>
          {texto}
        </p>
      </div>
    );
  }

  const somenteLeitura = forcarEditavel ? false : (campo.somenteLeitura ?? false);

  if (somenteLeitura) {
    return (
      <div>
        <span className={LABEL}>{campo.label}</span>
        <p className={CAMPO_ESTATICO} title={campo.ajuda}>
          {valorParaExibicao(campo, valorBruto)}
        </p>
      </div>
    );
  }

  const valorAtual = valor ?? "";

  function emitir(novoValor: string) {
    onChange?.(novoValor);
  }

  let controle: React.ReactNode;
  switch (campo.tipo) {
    case "textarea":
      controle = (
        <textarea
          id={id}
          value={valorAtual}
          onChange={(e) => emitir(e.target.value)}
          rows={3}
          maxLength={5000}
          aria-describedby={idErro}
          aria-invalid={erro ? true : undefined}
          className={`${CAMPO} ${erro ? "border-[var(--erro)]" : ""}`}
        />
      );
      break;
    case "select":
      controle = (
        <select
          id={id}
          value={valorAtual}
          onChange={(e) => emitir(e.target.value)}
          aria-describedby={idErro}
          aria-invalid={erro ? true : undefined}
          className={`${CAMPO} ${erro ? "border-[var(--erro)]" : ""}`}
        >
          <option value="">Selecione…</option>
          {campo.opcoes?.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.label}
            </option>
          ))}
        </select>
      );
      break;
    case "booleano":
      controle = (
        <select
          id={id}
          value={valorAtual}
          onChange={(e) => emitir(e.target.value)}
          aria-describedby={idErro}
          className={`${CAMPO} ${erro ? "border-[var(--erro)]" : ""}`}
        >
          <option value="">Não informado</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      );
      break;
    case "data":
      controle = (
        <input
          id={id}
          type="date"
          value={valorAtual}
          onChange={(e) => emitir(e.target.value)}
          aria-describedby={idErro}
          aria-invalid={erro ? true : undefined}
          className={`${CAMPO} ${erro ? "border-[var(--erro)]" : ""}`}
        />
      );
      break;
    case "moeda":
    case "numero":
    case "percentual":
      controle = (
        <input
          id={id}
          type="text"
          inputMode={campo.tipo === "percentual" ? "decimal" : "numeric"}
          value={valorAtual}
          onChange={(e) => emitir(aplicarMascara(campo.tipo, e.target.value))}
          aria-describedby={idErro}
          aria-invalid={erro ? true : undefined}
          className={`${CAMPO_MONO} ${erro ? "border-[var(--erro)]" : ""}`}
        />
      );
      break;
    default:
      controle = (
        <input
          id={id}
          type="text"
          value={valorAtual}
          onChange={(e) => emitir(e.target.value)}
          aria-describedby={idErro}
          aria-invalid={erro ? true : undefined}
          className={`${CAMPO} ${erro ? "border-[var(--erro)]" : ""}`}
        />
      );
  }

  return (
    <div>
      <label className={LABEL} htmlFor={id}>
        {campo.label}
      </label>
      {controle}
      {campo.ajuda ? <p className="mt-1 text-xs text-neutral-500">{campo.ajuda}</p> : null}
      {erro ? (
        <p id={idErro} role="alert" className="mt-1 text-xs text-[var(--erro)]">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
