import type { CampoEmail } from "./templates/base";

/**
 * Campos do formulário que entram no e-mail ao dono, por origem. Lista
 * fechada de propósito: nome, e-mail e telefone já vão no topo do e-mail, e
 * o resto (CPF, UTM, CEP) não precisa ir por e-mail.
 */
type Formato = "texto" | "moeda" | "booleano" | "numero";

const CAMPOS: Record<string, Array<[chave: string, rotulo: string, formato: Formato]>> = {
  financiamento: [
    ["valorImovel", "Valor do imóvel", "moeda"],
    ["valorCredito", "Crédito desejado", "moeda"],
    ["entradaDisponivel", "Entrada disponível", "moeda"],
    ["renda", "Renda", "moeda"],
    ["tipoRemuneracao", "Tipo de renda", "texto"],
    ["usaFgts", "Usa FGTS", "booleano"],
    ["tipoImovel", "Tipo de imóvel", "texto"],
    ["cidade", "Cidade", "texto"],
    ["momentoCompra", "Momento da compra", "texto"],
    ["prazoMeses", "Prazo (meses)", "numero"],
  ],
  "home-equity": [
    ["objetivoCredito", "Objetivo do crédito", "texto"],
    ["valorCreditoEstimado", "Crédito estimado", "moeda"],
    ["valorImovel", "Valor do imóvel", "moeda"],
    ["imovelQuitado", "Imóvel quitado", "booleano"],
    ["tipoImovel", "Tipo de imóvel", "texto"],
    ["renda", "Renda", "moeda"],
    ["prazoMeses", "Prazo (meses)", "numero"],
  ],
  imoveis: [
    ["formaPagamento", "Forma de pagamento", "texto"],
    ["prazoCompra", "Prazo para comprar", "texto"],
    ["valorEntrada", "Entrada", "moeda"],
    ["jaTemAprovacao", "Já tem crédito aprovado", "booleano"],
    ["observacoes", "Observações", "texto"],
  ],
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatar(valor: unknown, formato: Formato): string | null {
  if (valor === undefined || valor === null || valor === "") return null;
  switch (formato) {
    case "moeda":
      return typeof valor === "number" ? BRL.format(valor) : String(valor);
    case "booleano":
      return valor ? "Sim" : "Não";
    default:
      return String(valor);
  }
}

export function camposDoFormulario(tipo: string, dados: Record<string, unknown>): CampoEmail[] {
  const campos: CampoEmail[] = [];
  for (const [chave, rotulo, formato] of CAMPOS[tipo] ?? []) {
    const valor = formatar(dados[chave], formato);
    if (valor !== null) campos.push({ rotulo, valor });
  }
  return campos;
}
