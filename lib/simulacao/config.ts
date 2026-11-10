import type { ConfigSimulacao } from "./tipos";

/**
 * Regras e textos fixos do documento (config.json do pacote rt-simulacao).
 * O contato é o de produção; as regras de comparação são decisão comercial:
 * só TR compara, Volpi não aparece, a Creditas escreve "Brasil".
 */
export const CONFIG_SIMULACAO: ConfigSimulacao = {
  contato: {
    email: "rafael@rtcapitalimobiliario.com.br",
    telefone: "(19) 99783-4187",
    site: "rtcapitalimobiliario.com.br/financiamento",
  },
  tituloCabecalho: "Simulação de financiamento imobiliário",
  saudacao: "Olá, {cliente}. Sua simulação está pronta.",
  clientePadrao: "Nome do cliente",
  comprometimentoRenda: 0.3,
  indexadoresComparaveis: ["TR"],
  excluirBancos: ["Volpi"],
  nomesBancos: { Brasil: "Banco do Brasil" },
  // O documento tem 6 etapas e a atual é a 1, ainda que o CRM tenha 5.
  etapaAtual: 1,
  etapas: [
    ["Simulação", "Comparativo entre bancos e escolha da melhor condição."],
    ["Análise de crédito", "Envio de documentos pessoais e de renda para aprovação do crédito."],
    ["Escolha do imóvel", "Definição do imóvel e envio da documentação do imóvel e dos vendedores."],
    ["Avaliação do imóvel", "Vistoria do engenheiro do banco e análise jurídica da documentação."],
    ["Assinatura", "Emissão e assinatura do contrato de financiamento com o banco."],
    ["Registro e liberação", "Registro em cartório e pagamento ao vendedor."],
  ],
};
