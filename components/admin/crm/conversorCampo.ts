import type { CampoCRM } from "@/lib/crm/campos";
import { formatarMoeda } from "@/lib/crm/calculos";
import { mascaraMoeda } from "@/lib/mascaras";

/**
 * Conversões puras entre o descritor de campo do CRM (lib/crm/campos.ts,
 * chaves em snake_case — iguais às colunas do banco) e o formato que as
 * server actions esperam (lib/validations/crm.ts, chaves em camelCase, mesmo
 * padrão de lib/validations/lead.ts). PainelOrigem.tsx e NovoLeadModal.tsx
 * usam isto para nunca "inventar" o nome da chave campo a campo — um typo
 * manual faria o valor cair silenciosamente fora do payload (o Zod só veria
 * a chave errada como omitida, sem erro nenhum). Por isso tem teste
 * (tests/unidade/crm-conversor-campo.test.ts).
 */

/** "valor_credito_desejado" -> "valorCreditoDesejado". */
export function chaveParaCamel(chaveSnake: string): string {
  return chaveSnake.replace(/_([a-z0-9])/g, (_match, letra: string) => letra.toUpperCase());
}

/** Tri-state de campo booleano|null do banco -> valor do <select> ("" = não informado). */
export function booleanoParaCampo(valor: boolean | null | undefined): "" | "sim" | "nao" {
  if (valor === true) return "sim";
  if (valor === false) return "nao";
  return "";
}

/** Inverso de `booleanoParaCampo` — "" volta `undefined` (não confundir com `false`). */
export function campoParaBooleano(valor: string): boolean | undefined {
  if (valor === "sim") return true;
  if (valor === "nao") return false;
  return undefined;
}

/**
 * Máscara de moeda (lib/mascaras.ts `mascaraMoeda`) grava só reais inteiros,
 * sem centavos — mesma convenção de components/admin/ImovelEditor.tsx
 * (`paraMoedaOuNull`). Devolve `undefined` para campo vazio: nunca `0`, que
 * é um valor diferente de "não informado" e faria o payload gravar zero.
 */
export function moedaParaNumero(valorMascarado: string): number | undefined {
  const digitos = valorMascarado.replace(/\D/g, "");
  return digitos === "" ? undefined : Number(digitos);
}

/** Campo "numero" do descritor — sempre inteiro nos usos atuais de lib/crm/campos.ts. */
export function numeroParaInteiro(valor: string): number | undefined {
  const digitos = valor.replace(/\D/g, "");
  return digitos === "" ? undefined : parseInt(digitos, 10);
}

/**
 * Campo "percentual" do descritor — ao contrário das taxas dos simuladores
 * (lib/parametros/taxa.ts, que gravam fração 0–1), o único uso atual
 * (`percentual_entrada`) é validado em `lib/validations/crm.ts` como
 * `gte(0).lte(100)`: escala 0–100, não fração. Aceita vírgula decimal
 * (padrão pt-BR).
 */
export function percentualParaNumero(valor: string): number | undefined {
  const t = valor.trim().replace(",", ".");
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isNaN(n) ? undefined : n;
}

/** "R$ 445.000" a partir de um número (ou string) bruto do banco — mesma convenção de mascaraMoeda. */
function moedaParaTextoEditavel(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const arredondado = Math.round(Number(valor));
  if (Number.isNaN(arredondado)) return "";
  return mascaraMoeda(String(arredondado));
}

/**
 * Valor bruto do banco (number | string | boolean | null) -> string
 * controlada do input editável, por `tipo` do descritor. Usada tanto para o
 * valor inicial de um campo editável quanto, indiretamente, para o texto
 * digitado (o próprio `CampoOrigemInput` já devolve string pronta a cada
 * `onChange`, então esta função só precisa resolver o valor INICIAL).
 */
export function valorParaTextoEditavel(tipo: CampoCRM["tipo"], valor: unknown): string {
  if (tipo === "booleano") return booleanoParaCampo(valor as boolean | null | undefined);
  if (valor === null || valor === undefined) return "";
  if (tipo === "moeda") return moedaParaTextoEditavel(valor);
  if (tipo === "data") return String(valor).slice(0, 10);
  return String(valor);
}

/**
 * String do input editável -> valor pronto para o payload da action, por
 * `tipo`. Sempre `undefined` (nunca `null`) para "vazio": os schemas de
 * `lib/validations/crm.ts` são `.optional()`, não `.nullable()` — mandar
 * `null` explícito faria o Zod rejeitar o campo inteiro em vez de tratá-lo
 * como "não informado".
 */
export function textoEditavelParaValor(tipo: CampoCRM["tipo"], texto: string): unknown {
  switch (tipo) {
    case "moeda":
      return moedaParaNumero(texto);
    case "numero":
      return numeroParaInteiro(texto);
    case "percentual":
      return percentualParaNumero(texto);
    case "booleano":
      return campoParaBooleano(texto);
    default: {
      const t = texto.trim();
      return t === "" ? undefined : t;
    }
  }
}

/**
 * Texto de EXIBIÇÃO (somenteLeitura ou calculado) — diferente do texto
 * editável: aqui o objetivo é ficar legível para humano, não voltar a ser
 * digitável. "select" resolve o label da opção; "moeda" usa o mesmo
 * formatador do card (lib/crm/calculos.ts `formatarMoeda`).
 */
export function valorParaExibicao(campo: CampoCRM, valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  switch (campo.tipo) {
    case "moeda":
      return formatarMoeda(Number(valor));
    case "percentual":
      return `${Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
    case "booleano":
      return valor === true ? "Sim" : valor === false ? "Não" : "—";
    case "select": {
      const opcao = campo.opcoes?.find((o) => o.valor === valor);
      return opcao?.label ?? String(valor);
    }
    case "data": {
      // "YYYY-MM-DD" é uma data de CALENDÁRIO (mesmo formato de <input
      // type="date">), não um instante — `new Date("2026-07-30")` é
      // interpretado como meia-noite UTC, e formatar isso de volta com
      // timeZone "America/Sao_Paulo" (UTC-3) mostraria 29/07, um dia antes
      // (mesma classe de armadilha de fuso que lib/crm/lembretes.ts
      // documenta). Por isso os componentes são lidos direto da string, sem
      // passar por `Date`.
      const [ano, mes, dia] = String(valor).slice(0, 10).split("-");
      return ano && mes && dia ? `${dia}/${mes}/${ano}` : "—";
    }
    default:
      return String(valor);
  }
}
