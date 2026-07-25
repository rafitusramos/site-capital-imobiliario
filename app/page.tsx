import type { Metadata } from "next";
import "@/styles/home.css";
import { SITE_URL, CIDADES_ATENDIDAS } from "@/lib/site";

const TITULO = "Crédito imobiliário estruturado — Rafael Teixeira · Capital Imobiliário";
const DESCRICAO =
  "Financiamento imobiliário e home equity com cotação multibanco: a mesma operação disputada em múltiplas instituições, comparada pelo custo efetivo total. Análise sem custo. Rafael Teixeira · Capital Imobiliário.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Rafael Teixeira · Capital Imobiliário",
    title: "Crédito imobiliário estruturado — cotação multibanco",
    description:
      "Financiamento imobiliário e home equity com a mesma lógica: bancos disputando a sua operação e a recomendação partindo do menor crédito que resolve.",
    url: "/",
    images: ["/images/background.jpg"],
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crédito imobiliário estruturado — cotação multibanco",
    description:
      "Financiamento imobiliário e home equity com cotação em múltiplos bancos e comparação pelo custo efetivo total.",
    images: ["/images/background.jpg"],
  },
};

const negocioJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
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
      areaServed: CIDADES_ATENDIDAS.map((cidade) => ({ "@type": "City", name: cidade })),
      founder: { "@id": `${SITE_URL}/#rafael` },
      employee: { "@id": `${SITE_URL}/#rafael` },
      sameAs: ["https://www.instagram.com/rafaelteixeiraimovel"],
    },
    {
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
          name: "Certificação FEBRABAN em Crédito Imobiliário",
        },
      ],
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(negocioJsonLd) }}
      />

      <header className="hero hero-home" id="topo">
        <div className="wrap">
          <h1>O crédito certo depende de quem disputa por você.</h1>
          <p className="sub">
            Financiamento imobiliário e crédito com garantia de imóvel estruturados com a mesma
            lógica: a sua operação cotada em múltiplos bancos, comparada pelo custo efetivo
            total — e a recomendação partindo do menor crédito que resolve.
          </p>
          <a className="cta" href="#solucoes">
            Conhecer as soluções
          </a>
          <div className="cta-nota">Análise sem custo · resposta em até 1 dia útil</div>
        </div>
      </header>

      <div className="trust">
        <div className="wrap">
          <div className="rotulo">Cotação em instituições reguladas pelo Banco Central do Brasil</div>
          <div className="marcas">
            <span>Bancos de varejo</span>
            <span>Bancos digitais</span>
            <span>Bancos de investimento</span>
            <span>Cooperativas de crédito</span>
          </div>
        </div>
      </div>

      <section id="solucoes">
        <div className="wrap">
          <div className="eyebrow">Soluções de Crédito</div>
          <h2>Dois caminhos, um método</h2>
          <p className="intro" style={{ maxWidth: "62ch", marginBottom: 28 }}>
            Comprar um imóvel ou destravar capital de um imóvel que já é seu: cada situação pede
            uma estrutura diferente — e as duas merecem bancos concorrendo pela sua operação.
          </p>
          <div className="cards">
            <a className="card" href="/financiamento/" data-produto="financiamento">
              <div className="card-img">
                <img src="/images/card-financiamento.jpg" alt="" />
                <span className="rotulo-img">Compra · SBPE</span>
                <span className="card-seta" aria-hidden="true">→</span>
              </div>
              <div className="card-corpo">
                <h3>Financiamento Imobiliário</h3>
                <p>
                  Adquira seu imóvel com a taxa disputada banco a banco. Pré-aprovação sem custo,
                  comparação pelo Custo Efetivo Total e acompanhamento até as chaves.
                </p>
                <span className="card-meta">Simular financiamento →</span>
              </div>
            </a>

            <a className="card" href="/home_equity/" data-produto="home_equity">
              <div className="card-img">
                <img src="/images/card-home-equity.jpg" alt="" />
                <span className="rotulo-img">Garantia de imóvel</span>
                <span className="card-seta" aria-hidden="true">→</span>
              </div>
              <div className="card-corpo">
                <h3>Home Equity</h3>
                <p>
                  Capital de longo prazo usando um imóvel quitado como garantia — a uma fração do
                  custo do crédito empresarial, sem vender o patrimônio.
                </p>
                <span className="card-meta">Simular crédito →</span>
              </div>
            </a>

            <div className="card breve" aria-disabled="true">
              <div className="card-img">
                <span className="badge-breve">Em breve</span>
                <span className="rotulo-img">Planejamento de compra</span>
                <span className="card-seta" aria-hidden="true">→</span>
              </div>
              <div className="card-corpo">
                <h3>Consórcio Imobiliário</h3>
                <p>
                  Aquisição planejada sem juros, com lance estratégico e uso do FGTS. Esta solução
                  está em estruturação e entra no ar em breve.
                </p>
                <span className="card-meta" style={{ color: "#7a807c" }}>
                  Em estruturação
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="metodo-dark">
        <div className="wrap">
          <div className="eyebrow">Método</div>
          <h2>Três compromissos que valem para qualquer produto</h2>
          <div className="metodo">
            <div className="item">
              <h3>Multibanco, sem bandeira</h3>
              <p>
                A mesma operação é cotada em múltiplas instituições ao mesmo tempo. Você vê as
                propostas lado a lado, com os critérios abertos.
              </p>
            </div>
            <div className="item">
              <h3>O menor crédito que resolve</h3>
              <p>
                A recomendação parte do valor mínimo que atinge seu objetivo — nunca do máximo que
                o banco libera. Alavancagem desnecessária é risco, não conquista.
              </p>
            </div>
            <div className="item">
              <h3>Análise sem custo</h3>
              <p>
                O diagnóstico, a cotação multibanco e o comparativo de propostas não custam nada —
                em nenhuma etapa, decida avançar ou não.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="eyebrow">Quem responde</div>
          <h2>Um único interlocutor, do diagnóstico ao registro</h2>
          <div className="quem">
            <div className="foto">
              <img src="/images/rafael-teixeira.jpg" alt="Rafael Teixeira, corretor de imóveis e correspondente bancário" />
            </div>
            <div>
              <p>
                Rafael Teixeira é corretor de imóveis (CRECI-SP) e correspondente bancário com
                certificação FEBRABAN CA-600 — a combinação que permite cuidar da operação
                inteira: do crédito ao imóvel, da proposta ao cartório.
              </p>
              <a className="link-sobre" href="/sobre.html">
                Conhecer a trajetória e as credenciais →
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
