import type { FaqItem } from "@/lib/seo/faq";

// FAQ das landings. É a ÚNICA fonte: a página renderiza os <details> a partir
// destes arrays e o FAQPage JSON-LD sai dos mesmos itens (lib/seo/faq.ts).
// Marcação tem de representar o conteúdo visível — editar aqui muda os dois.

export const FAQ_FINANCIAMENTO: FaqItem[] = [
  {
    "pergunta": "Preciso já ter escolhido o imóvel para começar?",
    "resposta": "Não — e o ideal é começar antes. A pré-aprovação de crédito vale por cerca de 90 dias e define seu teto real de compra. Negociar um imóvel com carta pré-aprovada na mão é negociar de outra posição."
  },
  {
    "pergunta": "Qual a entrada mínima?",
    "resposta": "Em geral 20% do valor do imóvel. Alguns bancos, em programas especiais como o Santander Select, chegam a financiar até 90% — os demais 10% de entrada podem, inclusive, ser compostos com FGTS, dentro das regras de uso do fundo."
  },
  {
    "pergunta": "Posso usar meu FGTS?",
    "resposta": "Sim, se você tem 3 anos de trabalho sob o regime do FGTS (somando períodos), não possui outro imóvel residencial na mesma cidade e o imóvel é residencial urbano dentro do teto do SFH — hoje R$ 2,25 milhões. O fundo pode entrar na entrada e, depois, a cada 2 anos, para amortizar o saldo."
  },
  {
    "pergunta": "SAC ou Price: qual escolher?",
    "resposta": "No SAC a parcela começa maior e cai todo mês, com menos juros no total do contrato. Na Price a parcela é fixa, mais leve no início, mas o custo total é maior. A escolha certa depende do seu fluxo de renda — essa conta faz parte do diagnóstico."
  },
  {
    "pergunta": "Quais os custos além da entrada?",
    "resposta": "ITBI (imposto municipal de transmissão) e registro em cartório, que juntos somam por volta de 4% a 5% do valor do imóvel, além da tarifa de avaliação do banco. Esses valores precisam estar reservados fora da entrada — e entram no planejamento desde a primeira conversa."
  },
  {
    "pergunta": "Sou autônomo ou empresário. Consigo financiar?",
    "resposta": "Sim. A comprovação de renda muda de formato: extratos bancários, declaração de imposto de renda, pró-labore, faturamento da empresa ou DECORE. Cada banco pesa esses documentos de um jeito — mais um motivo para cotar em vários."
  },
  {
    "pergunta": "Posso somar renda com outra pessoa?",
    "resposta": "Sim. A composição de renda com cônjuge, companheiro ou familiar é aceita pela maioria dos bancos e aumenta o valor financiável. Os participantes entram juntos na análise de crédito e no contrato."
  },
  {
    "pergunta": "Quanto tempo demora até as chaves?",
    "resposta": "A pré-aprovação sai em horas ou poucos dias, dependendo do banco. Da proposta aceita até o registro e a liberação do recurso, o processo completo costuma levar de 30 a 60 dias — e o acompanhamento de cada etapa serve para mantê-lo nesse prazo."
  },
  {
    "pergunta": "E se as taxas caírem depois que eu assinar?",
    "resposta": "Existe a portabilidade de crédito: você transfere o saldo devedor para outro banco com taxa menor, sem refazer a compra. Quem financia hoje garante o preço do imóvel de hoje — e mantém a porta aberta para reduzir a taxa amanhã. Esse monitoramento faz parte do acompanhamento pós-contrato."
  }
];

export const FAQ_HOME_EQUITY: FaqItem[] = [
  {
    "pergunta": "Perco a propriedade do imóvel?",
    "resposta": "Não. Você permanece dono e com posse plena. O imóvel fica alienado fiduciariamente à instituição durante o contrato — a mesma estrutura de um financiamento imobiliário comum. Quitou, a garantia é baixada."
  },
  {
    "pergunta": "Quanto do valor do imóvel consigo liberar?",
    "resposta": "Em geral até 60% do valor de avaliação, variando por instituição e perfil. Minha recomendação parte sempre do menor crédito que resolve o seu objetivo — não do máximo que o banco libera."
  },
  {
    "pergunta": "Minha empresa fatura mais de R$ 4,8 milhões. Tenho alternativa ao Pronampe?",
    "resposta": "O Pronampe é restrito a empresas até esse faturamento. Acima dele, as opções usuais são capital de giro a taxas altas ou crédito estruturado com garantias — e é exatamente onde o home equity costuma ser a estrutura mais eficiente: custo menor, prazo maior e valores compatíveis com operações relevantes."
  },
  {
    "pergunta": "Qual o risco real da operação?",
    "resposta": "O risco é a garantia: em caso de inadimplência prolongada, a instituição pode executar o imóvel. Por isso a etapa de diagnóstico avalia sua capacidade de pagamento em cenário de estresse antes de qualquer proposta. Se a conta não fecha com folga, eu digo."
  },
  {
    "pergunta": "Qual a diferença entre home equity e financiamento imobiliário?",
    "resposta": "No financiamento imobiliário, você pega dinheiro emprestado para comprar um imóvel. No home equity, você usa um imóvel que já é seu como garantia para pegar dinheiro emprestado para qualquer finalidade — quitar dívidas, investir, reformar, entre outras."
  },
  {
    "pergunta": "Quais são as taxas de juros?",
    "resposta": "As taxas começam a partir de 1,09% a.m. + IPCA. A taxa exata depende do banco, do seu perfil de crédito, do valor do imóvel e da relação entre o valor do crédito e o valor do imóvel (LTV)."
  },
  {
    "pergunta": "Quanto tempo demora para liberar o crédito?",
    "resposta": "O prazo médio é de 20 a 40 dias úteis, desde a simulação até a liberação do crédito na conta. O acompanhamento de cada etapa ajuda a manter o processo dentro desse prazo."
  },
  {
    "pergunta": "Que tipos de imóvel são aceitos?",
    "resposta": "Casas, apartamentos, salas comerciais e terrenos urbanos. O imóvel precisa ter matrícula regular e estar em área urbana. Imóveis rurais geralmente não são aceitos."
  },
  {
    "pergunta": "Como a Capital Imobiliário consegue taxas melhores?",
    "resposta": "Porque comparamos simultaneamente as condições de mais de 30 bancos para o seu perfil. Essa concorrência entre instituições resulta em ofertas melhores do que você conseguiria indo sozinho a um único banco."
  }
];
