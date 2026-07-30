import type { Metadata } from "next";
import "@/styles/sobre.css";
import { IMAGEM_OG_PADRAO } from "@/lib/og";

const TITULO = "Sobre — Rafael Teixeira · Capital Imobiliário";
const DESCRICAO =
  "Rafael Teixeira: corretor de imóveis (CRECI-SP) e correspondente bancário especializado em crédito com garantia de imóvel, financiamento SBPE e consórcio. Certificação FEBRABAN CA-600.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/sobre/" },
  openGraph: {
    type: "profile",
    siteName: "Rafael Teixeira · Capital Imobiliário",
    title: TITULO,
    description:
      "Corretor de imóveis e correspondente bancário especializado em crédito com garantia de imóvel, financiamento SBPE e consórcio.",
    url: "/sobre/",
    images: [IMAGEM_OG_PADRAO],
    locale: "pt_BR",
  },
};

export default function SobrePage() {
  return (
    <>
      <header className="hero hero-sobre">
        <div className="wrap">
          <div>
            <div className="eyebrow reveal">Sobre</div>
            <h1 className="reveal d1">Um corretor que aprendeu a pensar como analista de crédito.</h1>
            <p className="sub reveal d2">
              Antes de estruturar crédito, Rafael Teixeira vendia imóveis — e percebeu que a
              decisão mais cara da vida de um cliente quase nunca era sobre o imóvel em si, mas
              sobre como financiá-lo.
            </p>
          </div>
          <div className="reveal d1">
            <div className="foto-rafael">
              <span className="fallback" aria-hidden="true">RT</span>
              <img
                src="/images/rafael-teixeira.jpg"
                alt="Rafael Teixeira, corretor de imóveis e correspondente bancário"
              />
            </div>
          </div>
        </div>
      </header>

      <section className="bio">
        <div className="wrap">
          <div className="eyebrow reveal">Trajetória</div>
          <h2 className="reveal d1">Da corretagem à estruturação de crédito</h2>
          <div className="reveal d2">
            <p>
              Rafael Teixeira é corretor de imóveis registrado no CRECI-SP, atuando pela RE/MAX
              Clarity em Vinhedo (SP). Foi na prática diária da corretagem — negociando prazos,
              entradas e financiamentos — que a especialização em crédito se tornou natural: o
              mesmo cliente que precisava de um bom imóvel também precisava de uma boa estrutura
              de capital para pagá-lo.
            </p>
            <p>
              Hoje a atuação é dupla: como corretor, e como correspondente bancário especializado
              em crédito com garantia de imóvel (home equity), financiamento imobiliário SBPE e
              consórcio. A cotação percorre múltiplas instituições simultaneamente, e a
              recomendação parte sempre do menor crédito que resolve o objetivo do cliente — não
              do maior valor que o banco libera.
            </p>
            <p>
              Essa lógica é a mesma que rege o restante do trabalho: transparência sobre como a
              remuneração funciona, clareza sobre riscos antes de qualquer proposta, e a
              disposição de dizer não quando a operação não faz sentido para quem está do outro
              lado da mesa.
            </p>
          </div>
        </div>
      </section>

      <section className="creds-dark">
        <div className="wrap">
          <div className="eyebrow reveal">Credenciais</div>
          <h2 className="reveal d1">Registros e certificações</h2>
          <div className="creds">
            <div className="cred-card reveal">
              <span className="tag">Licença profissional</span>
              <h3>Corretor de Imóveis</h3>
              <p>
                Registro CRECI-SP nº 283020-F — autoriza a intermediação de compra, venda e
                locação de imóveis no estado de São Paulo.
              </p>
            </div>
            <div className="cred-card reveal d1">
              <span className="tag">Certificação</span>
              <h3>FEBRABAN CA-600</h3>
              <p>
                Certificação da Federação Brasileira de Bancos em crédito imobiliário e
                consórcio — formação específica para estruturar esse tipo de operação.
              </p>
            </div>
            <div className="cred-card reveal d2">
              <span className="tag">Registro CVM</span>
              <h3>Assessor de Investimentos</h3>
              <p>
                Vinculado à XP Investimentos sob a Resolução CVM 178. Atividade regulatória
                distinta da intermediação de crédito, não comercializada por meio deste site.
              </p>
            </div>
            <div className="cred-card reveal">
              <span className="tag">Afiliação</span>
              <h3>RE/MAX Clarity</h3>
              <p>
                Atuação afiliada à RE/MAX Clarity, em Vinhedo (SP), na intermediação imobiliária
                tradicional.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="eyebrow reveal">Método</div>
          <h2 className="reveal d1">Um método, não um produto</h2>
          <div className="metodo-link reveal d2">
            <p>
              Multibanco, sem bandeira. O menor crédito que resolve, não o maior que o banco
              libera. Análise sem custo, em qualquer etapa — o mesmo critério aplicado a home
              equity, financiamento e consórcio.
            </p>
            <a className="cta" href="/#solucoes">
              Ver como funciona a análise
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
