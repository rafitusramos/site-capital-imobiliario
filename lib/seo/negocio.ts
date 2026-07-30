import { SITE_URL, CIDADES_ATENDIDAS } from "@/lib/site";

// As duas entidades centrais do grafo JSON-LD do site (o negócio e o
// Rafael) moram aqui, e só aqui, porque são referenciadas por "@id" a
// partir de várias páginas independentes: financiamento e home_equity
// apontam `provider` para "#negocio", sobre aponta `worksFor` para
// "#negocio", e o próprio "#negocio" aponta `founder`/`employee` para
// "#rafael". Antes desses nós serem centralizados, cada página que
// precisava de um deles declarava sua própria cópia — o que produzia
// descrições divergentes da mesma entidade (a home tinha um Person com
// 2 credenciais, /sobre tinha o mesmo "@id" com 3 credenciais e
// affiliation) e, em páginas que só referenciavam o "@id" sem declarar
// o nó, uma referência pendurada que não resolve em lugar nenhum do
// grafo. Os dois nós são declarados uma única vez (no layout, ver
// app/(site)/layout.tsx) e todo o resto do site só referencia o "@id".

/**
 * FinancialService — o negócio. Conteúdo copiado integralmente do que
 * antes vivia em app/(site)/page.tsx, com o acréscimo do campo `address`
 * (decisão do dono do projeto: só cidade/estado, sem `streetAddress`,
 * `postalCode` ou `geo`).
 */
export const NEGOCIO_NODE = {
  "@type": "FinancialService",
  "@id": `${SITE_URL}/#negocio`,
  name: "Rafael Teixeira · Capital Imobiliário",
  alternateName: "Capital Imobiliário",
  url: `${SITE_URL}/`,
  image: `${SITE_URL}/images/background.jpg`,
  logo: `${SITE_URL}/images/background.jpg`,
  description:
    "Correspondente bancário especializado em crédito com garantia de imóvel (home equity), financiamento imobiliário SBPE e consórcio. Análise multibanco com recomendação do menor crédito que resolve o objetivo do cliente.",
  telephone: "+55-19-99783-4187",
  email: "contato@rtcapitalimobiliario.com.br",
  priceRange: "Análise sem custo",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Vinhedo",
    addressRegion: "SP",
    addressCountry: "BR",
  },
  areaServed: CIDADES_ATENDIDAS.map((cidade) => ({ "@type": "City", name: cidade })),
  founder: { "@id": `${SITE_URL}/#rafael` },
  employee: { "@id": `${SITE_URL}/#rafael` },
  // sameAs liga o site aos perfis externos da mesma entidade — é o que
  // ajuda o Google a associar este domínio à ficha local do negócio.
  // O link do Google Business é um encurtador share.google: ele resolve
  // para a ficha, mas não é a URL canônica do lugar (não deu para extrair
  // o destino, porque o share.google resolve por JavaScript). Se um dia
  // esse atalho deixar de valer, trocar pela URL do Maps com o /maps/place/
  // completo, que é estável.
  sameAs: [
    "https://www.instagram.com/rafaelteixeiraimovel",
    "https://share.google/r5Dwdcu8M2LxUP9zp",
  ],
};

/**
 * Person — Rafael Teixeira. Usa a versão de app/(site)/sobre/page.tsx,
 * a mais completa (3 credenciais, incluindo o registro CVM, mais a
 * affiliation com RE/MAX Clarity e XP Investimentos), e não a versão
 * reduzida que antes vivia na home (2 credenciais, sem affiliation).
 */
export const RAFAEL_NODE = {
  "@type": "Person",
  "@id": `${SITE_URL}/#rafael`,
  name: "Rafael Teixeira",
  jobTitle: "Corretor de Imóveis · Correspondente Bancário",
  worksFor: { "@id": `${SITE_URL}/#negocio` },
  hasCredential: [
    {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "license",
      recognizedBy: { "@type": "Organization", name: "CRECI-SP" },
      name: "Corretor de Imóveis registrado no CRECI-SP",
    },
    {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "certificate",
      recognizedBy: { "@type": "Organization", name: "FEBRABAN" },
      name: "Certificação FEBRABAN CA-600 em Crédito Imobiliário e Consórcio",
    },
    {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "license",
      recognizedBy: { "@type": "Organization", name: "CVM" },
      name: "Assessor de Investimentos (AAI) sob a Resolução CVM 178",
    },
  ],
  affiliation: [
    { "@type": "Organization", name: "RE/MAX Clarity" },
    { "@type": "Organization", name: "XP Investimentos" },
  ],
};
