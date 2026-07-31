import type { LeadTipoSlug } from "@/types/database";

/**
 * Descritor de campo do painel direito do modal de lead (docs/crm-spec.md
 * §3.4). Sem construtor de formulários e sem tabela de metacampos:
 * `PainelOrigem.tsx` (fora do escopo deste arquivo) percorre
 * `CAMPOS_POR_ORIGEM[tipo]` e renderiza — não conhece nenhuma origem em
 * particular. Adicionar campo novo é uma entrada no array; com
 * `fonte: "extra"` ele grava em `leads.campos_extras` (jsonb) sem migration.
 */
export type CampoCRM = {
  chave: string;
  label: string;
  tipo: "moeda" | "numero" | "percentual" | "texto" | "textarea" | "select" | "booleano" | "data";
  fonte: "coluna" | "extra";
  opcoes?: { valor: string; label: string }[];
  ajuda?: string;
  // veio do simulador do site: editar apagaria o que o cliente respondeu
  // (ver critério abaixo, campo a campo).
  somenteLeitura?: boolean;
  // ex.: LTV. Nunca é campo gravável — quando presente, o renderer usa isto
  // em vez de um input, mesmo que somenteLeitura não esteja marcado.
  calculado?: (dados: Record<string, unknown>) => string;
};

/**
 * Critério de somenteLeitura, campo a campo: um campo é somenteLeitura
 * quando ele é preenchido pelo argumento correspondente de um RPC
 * `criar_lead_*` (migration 003/002) — ou seja, veio da resposta do cliente
 * num simulador do site. Campos de `lead_financiamento`/`lead_home_equity`/
 * `lead_imovel` que EXISTEM na tabela mas NÃO estão nos argumentos do RPC
 * (ex.: `banco_simulado`, `valor_credito_desejado`, `imovel_desejado`) só
 * podem ter vindo de edição manual no CRM — por isso ficam editáveis.
 * Consórcio não tem RPC nenhum (não há formulário no site, decisão travada
 * #2 do docs/crm-spec.md): todo lead de consórcio nasce por criação manual,
 * então nenhum campo é somenteLeitura lá.
 */

export const CAMPOS_POR_ORIGEM: Record<LeadTipoSlug, CampoCRM[]> = {
  financiamento: [
    { chave: "valor_imovel", label: "Valor do imóvel", tipo: "moeda", fonte: "coluna", somenteLeitura: true },
    {
      chave: "percentual_entrada",
      label: "Entrada (%)",
      tipo: "percentual",
      fonte: "coluna",
      somenteLeitura: true,
    },
    { chave: "valor_entrada", label: "Valor de entrada", tipo: "moeda", fonte: "coluna", somenteLeitura: true },
    { chave: "valor_credito", label: "Crédito simulado", tipo: "moeda", fonte: "coluna", somenteLeitura: true },
    {
      chave: "prazo_meses",
      label: "Prazo (meses)",
      tipo: "numero",
      fonte: "coluna",
      somenteLeitura: true,
    },
    {
      chave: "parcela_estimada",
      label: "Parcela estimada",
      tipo: "moeda",
      fonte: "coluna",
      somenteLeitura: true,
    },
    { chave: "renda_mensal", label: "Renda mensal", tipo: "moeda", fonte: "coluna", somenteLeitura: true },
    { chave: "usa_fgts", label: "Usa FGTS", tipo: "booleano", fonte: "coluna", somenteLeitura: true },
    {
      chave: "tipo_imovel",
      label: "Tipo do imóvel",
      tipo: "select",
      fonte: "coluna",
      somenteLeitura: true,
      opcoes: [
        { valor: "Apartamento", label: "Apartamento" },
        { valor: "Casa", label: "Casa" },
        { valor: "Casa em condomínio", label: "Casa em condomínio" },
        { valor: "Terreno em condomínio", label: "Terreno em condomínio" },
        { valor: "Sala Comercial", label: "Sala Comercial" },
      ],
    },
    {
      chave: "tipo_remuneracao",
      label: "Tipo de remuneração",
      tipo: "select",
      fonte: "coluna",
      somenteLeitura: true,
      opcoes: [
        { valor: "Assalariado", label: "Assalariado" },
        { valor: "Empresário / Autônomo", label: "Empresário / Autônomo" },
      ],
    },
    {
      chave: "momento_compra",
      label: "Momento da compra",
      tipo: "select",
      fonte: "coluna",
      somenteLeitura: true,
      opcoes: [
        { valor: "Ainda procurando", label: "Ainda procurando" },
        { valor: "Já escolhi o imóvel", label: "Já escolhi o imóvel" },
        { valor: "Em negociação", label: "Em negociação" },
      ],
    },
    { chave: "cidade", label: "Cidade", tipo: "texto", fonte: "coluna", somenteLeitura: true },
    { chave: "estado", label: "UF", tipo: "texto", fonte: "coluna", somenteLeitura: true },
    // Não vêm do RPC: preenchidos pelo corretor depois da simulação.
    { chave: "banco_simulado", label: "Banco simulado", tipo: "texto", fonte: "coluna" },
    { chave: "primeiro_imovel", label: "Primeiro imóvel", tipo: "booleano", fonte: "coluna" },
  ],

  "home-equity": [
    {
      chave: "valor_imovel_garantia",
      label: "Valor do imóvel em garantia",
      tipo: "moeda",
      fonte: "coluna",
      somenteLeitura: true,
    },
    { chave: "imovel_quitado", label: "Imóvel quitado", tipo: "booleano", fonte: "coluna", somenteLeitura: true },
    { chave: "saldo_devedor", label: "Saldo devedor", tipo: "moeda", fonte: "coluna", somenteLeitura: true },
    {
      chave: "valor_credito_estimado",
      label: "Crédito estimado (simulador)",
      tipo: "moeda",
      fonte: "coluna",
      somenteLeitura: true,
    },
    {
      chave: "prazo_meses",
      label: "Prazo (meses)",
      tipo: "numero",
      fonte: "coluna",
      somenteLeitura: true,
    },
    {
      chave: "parcela_estimada",
      label: "Parcela estimada",
      tipo: "moeda",
      fonte: "coluna",
      somenteLeitura: true,
    },
    {
      chave: "finalidade",
      label: "Finalidade",
      tipo: "select",
      fonte: "coluna",
      somenteLeitura: true,
      opcoes: [
        { valor: "Investir no meu negócio", label: "Investir no meu negócio" },
        { valor: "Quitação de dívidas caras", label: "Quitação de dívidas caras" },
        { valor: "Reformas e construções", label: "Reformas e construções" },
        { valor: "Planejamento sucessório", label: "Planejamento sucessório" },
        { valor: "Consumo", label: "Consumo" },
      ],
    },
    {
      chave: "tipo_imovel",
      label: "Tipo do imóvel",
      tipo: "select",
      fonte: "coluna",
      somenteLeitura: true,
      opcoes: [
        { valor: "Apartamento", label: "Apartamento" },
        { valor: "Casa", label: "Casa" },
        { valor: "Terreno em condomínio", label: "Terreno em condomínio" },
        { valor: "Galpão", label: "Galpão" },
        { valor: "Sala Comercial", label: "Sala Comercial" },
        { valor: "Loja", label: "Loja" },
      ],
    },
    { chave: "renda_mensal", label: "Renda mensal", tipo: "moeda", fonte: "coluna", somenteLeitura: true },
    {
      chave: "tipo_remuneracao",
      label: "Tipo de remuneração",
      tipo: "select",
      fonte: "coluna",
      somenteLeitura: true,
      opcoes: [
        { valor: "Assalariado", label: "Assalariado" },
        { valor: "Empresário / Autônomo", label: "Empresário / Autônomo" },
      ],
    },
    { chave: "cep", label: "CEP", tipo: "texto", fonte: "coluna", somenteLeitura: true },
    { chave: "numero", label: "Número", tipo: "texto", fonte: "coluna", somenteLeitura: true },
    { chave: "area_m2", label: "Área (m²)", tipo: "numero", fonte: "coluna", somenteLeitura: true },
    // Não vêm do RPC: só existem depois que o corretor negocia com o cliente.
    {
      chave: "pessoa",
      label: "Pessoa",
      tipo: "select",
      fonte: "coluna",
      opcoes: [
        { valor: "fisica", label: "Física" },
        { valor: "juridica", label: "Jurídica" },
      ],
    },
    {
      chave: "valor_credito_desejado",
      label: "Crédito desejado (negociado)",
      tipo: "moeda",
      fonte: "coluna",
      ajuda: "Valor que o cliente efetivamente quer levar — pode diferir do estimado pelo simulador.",
    },
    {
      chave: "situacao_imovel",
      label: "Situação do imóvel",
      tipo: "select",
      fonte: "coluna",
      opcoes: [
        { valor: "quitado", label: "Quitado" },
        { valor: "financiado", label: "Financiado" },
        { valor: "alienado", label: "Alienado" },
        { valor: "inventario", label: "Inventário" },
      ],
    },
    // Loan-to-Value: nunca é coluna (docs/crm-spec.md §2.3) — calculado aqui
    // a partir de valor_credito_desejado / valor_imovel_garantia
    // (lib/crm/calculos.ts), para não correr o risco de o valor gravado
    // discordar das duas parcelas que o originam.
    {
      chave: "ltv",
      label: "LTV",
      tipo: "percentual",
      fonte: "coluna",
      somenteLeitura: true,
      ajuda: "Loan-to-Value: crédito desejado sobre valor do imóvel em garantia.",
      calculado: (dados) => {
        const desejado = Number(dados.valor_credito_desejado ?? 0);
        const garantia = Number(dados.valor_imovel_garantia ?? 0);
        if (!desejado || !garantia) return "—";
        return (desejado / garantia).toLocaleString("pt-BR", {
          style: "percent",
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        });
      },
    },
  ],

  imoveis: [
    {
      chave: "forma_pagamento",
      label: "Forma de pagamento",
      tipo: "select",
      fonte: "coluna",
      somenteLeitura: true,
      opcoes: [
        { valor: "financiamento", label: "Financiamento" },
        { valor: "a_vista", label: "À vista" },
        { valor: "fgts_financiamento", label: "FGTS + financiamento" },
        { valor: "permuta", label: "Permuta" },
      ],
    },
    {
      chave: "prazo_compra",
      label: "Prazo para comprar",
      tipo: "select",
      fonte: "coluna",
      somenteLeitura: true,
      opcoes: [
        { valor: "imediato", label: "Imediato" },
        { valor: "ate_3_meses", label: "Até 3 meses" },
        { valor: "ate_6_meses", label: "Até 6 meses" },
        { valor: "pesquisando", label: "Só pesquisando" },
      ],
    },
    { chave: "possui_entrada", label: "Possui entrada", tipo: "texto", fonte: "coluna", somenteLeitura: true },
    { chave: "valor_entrada", label: "Valor de entrada", tipo: "moeda", fonte: "coluna", somenteLeitura: true },
    {
      chave: "ja_tem_aprovacao",
      label: "Já tem aprovação de crédito",
      tipo: "booleano",
      fonte: "coluna",
      somenteLeitura: true,
    },
    { chave: "observacoes", label: "Observações do formulário", tipo: "textarea", fonte: "coluna", somenteLeitura: true },
    // Não vêm do RPC: preenchidos pelo corretor ao qualificar o interesse.
    { chave: "imovel_desejado", label: "Imóvel desejado (fora do catálogo)", tipo: "texto", fonte: "coluna" },
    { chave: "orcamento_max", label: "Orçamento máximo", tipo: "moeda", fonte: "coluna" },
    { chave: "cidade_preferida", label: "Cidade preferida", tipo: "texto", fonte: "coluna" },
    { chave: "dormitorios_min", label: "Dormitórios (mín.)", tipo: "numero", fonte: "coluna" },
    { chave: "tipo_imovel", label: "Tipo de imóvel", tipo: "texto", fonte: "coluna" },
  ],

  // Sem RPC de captação (não há formulário de consórcio no site — decisão
  // travada #2): todo lead nasce de criação manual, então nada é
  // somenteLeitura aqui.
  consorcio: [
    { chave: "valor_carta", label: "Valor da carta", tipo: "moeda", fonte: "coluna" },
    { chave: "prazo_meses", label: "Prazo (meses)", tipo: "numero", fonte: "coluna" },
    { chave: "parcela_estimada", label: "Parcela estimada", tipo: "moeda", fonte: "coluna" },
    { chave: "objetivo", label: "Objetivo", tipo: "texto", fonte: "coluna" },
    { chave: "ja_possui_consorcio", label: "Já possui consórcio", tipo: "booleano", fonte: "coluna" },
    {
      chave: "segmento",
      label: "Segmento",
      tipo: "select",
      fonte: "coluna",
      opcoes: [
        { valor: "imovel", label: "Imóvel" },
        { valor: "veiculo", label: "Veículo" },
        { valor: "servicos", label: "Serviços" },
      ],
    },
    { chave: "grupo", label: "Grupo", tipo: "texto", fonte: "coluna" },
    {
      chave: "contemplacao",
      label: "Contemplação",
      tipo: "select",
      fonte: "coluna",
      opcoes: [
        { valor: "nao-contemplado", label: "Não contemplado" },
        { valor: "em-lance", label: "Em lance" },
        { valor: "contemplado", label: "Contemplado" },
      ],
    },
  ],
};
