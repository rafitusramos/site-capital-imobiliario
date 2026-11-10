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

const INSTAGRAM_URL = "https://www.instagram.com/rafaelteixeiraimovel";

// URL da ficha do Google Business por `cid` (feature id
// 0x820c5b6b68c2c4e9:0x1bb6fa95f094f1a6, kgmid /g/11nr8xzsff). É estável e
// canônica, ao contrário do encurtador share.google que ela substituiu.
const GOOGLE_MAPS_URL = "https://www.google.com/maps?cid=1997059006678757798";

/**
 * FinancialService — o negócio. Conteúdo copiado integralmente do que
 * antes vivia em app/(site)/page.tsx, com o acréscimo do campo `address`
 * (decisão do dono do projeto: só cidade/estado, sem `streetAddress`,
 * `postalCode` ou `geo`).
 *
 * `logo` é o PNG quadrado de marca (public/images/logo-rt.png, gerado por
 * scripts/gerar-logo.mjs): o Google espera um logo quadrado de pelo menos
 * 112x112 px, e a foto retangular que ocupava o campo não servia. O `image`
 * segue sendo a foto de fundo. Fica de fora, por falta de dado, o
 * `openingHoursSpecification` (pendente do dono).
 */
export const NEGOCIO_NODE = {
  "@type": "FinancialService",
  "@id": `${SITE_URL}/#negocio`,
  name: "Rafael Teixeira · Capital Imobiliário",
  alternateName: "Capital Imobiliário",
  url: `${SITE_URL}/`,
  image: `${SITE_URL}/images/background.jpg`,
  logo: `${SITE_URL}/images/logo-rt.png`,
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
  // O link do Google Business é a URL por `cid` da ficha (feature id
  // 0x820c5b6b68c2c4e9:0x1bb6fa95f094f1a6, kgmid /g/11nr8xzsff), estável e
  // canônica; o encurtador share.google que estava aqui resolve por
  // JavaScript e não identifica o lugar. `hasMap` aponta para a mesma ficha.
  sameAs: [INSTAGRAM_URL, GOOGLE_MAPS_URL],
  hasMap: GOOGLE_MAPS_URL,
};

/**
 * Person — Rafael Teixeira. Usa a versão de app/(site)/sobre/page.tsx,
 * a mais completa (3 credenciais, incluindo o registro CVM, mais a
 * affiliation com RE/MAX Clarity e XP Investimentos), e não a versão
 * reduzida que antes vivia na home (2 credenciais, sem affiliation).
 *
 * `url` aponta para /sobre/ (a página da pessoa) e `image` é a foto dela:
 * sem os dois o Google não tem o que associar à entidade. `identifier` do
 * CRECI-SP é o número que já aparece visível em /sobre/. `knowsAbout` lista
 * as áreas de atuação, as mesmas do restante do site.
 */
export const RAFAEL_NODE = {
  "@type": "Person",
  "@id": `${SITE_URL}/#rafael`,
  name: "Rafael Teixeira",
  url: `${SITE_URL}/sobre/`,
  image: `${SITE_URL}/images/rafael-teixeira.jpg`,
  jobTitle: "Corretor de Imóveis · Correspondente Bancário",
  // Só o Instagram por enquanto; o LinkedIn entra depois, quando houver URL.
  sameAs: [INSTAGRAM_URL],
  knowsAbout: [
    "Financiamento imobiliário",
    "Home equity",
    "Crédito com garantia de imóvel",
    "Consórcio imobiliário",
  ],
  worksFor: { "@id": `${SITE_URL}/#negocio` },
  hasCredential: [
    {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "license",
      recognizedBy: { "@type": "Organization", name: "CRECI-SP" },
      name: "Corretor de Imóveis registrado no CRECI-SP",
      identifier: "283020-F",
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

/**
 * WebSite — o site como entidade. Sem SearchAction: não há busca interna.
 * `publisher` referencia #negocio, declarado no mesmo grafo do layout.
 */
export const WEBSITE_NODE = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "Rafael Teixeira · Capital Imobiliário",
  url: `${SITE_URL}/`,
  inLanguage: "pt-BR",
  publisher: { "@id": `${SITE_URL}/#negocio` },
};
