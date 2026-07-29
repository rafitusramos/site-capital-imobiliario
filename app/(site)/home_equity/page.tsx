import type { Metadata } from "next";
import { SimuladorHomeEquity } from "@/components/home-equity/SimuladorHomeEquity";
import { SITE_URL } from "@/lib/site";
import { IMAGEM_OG_PADRAO, OG_IMAGEM_PADRAO } from "@/lib/og";

const TITULO = "Home Equity em Vinhedo e Região — Crédito com Garantia de Imóvel | Rafael Teixeira";
const DESCRICAO =
  "Home equity para quem tem imóvel de alto padrão em Vinhedo, Valinhos, Louveira e Campinas: crédito com garantia de imóvel a uma fração do custo do crédito PJ, com análise independente multibanco sem custo.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/home_equity/" },
  openGraph: {
    type: "website",
    siteName: "Rafael Teixeira · Capital Imobiliário",
    title: "Home Equity em Vinhedo e Região — crédito com garantia de imóvel",
    description:
      "Capital de longo prazo a uma fração do custo do crédito empresarial, sem vender o patrimônio que você levou décadas para construir. Análise independente multibanco.",
    url: "/home_equity/",
    images: [IMAGEM_OG_PADRAO],
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Home Equity em Vinhedo e Região — crédito com garantia de imóvel",
    description:
      "Capital de longo prazo a uma fração do custo do crédito empresarial, sem se descapitalizar. Análise independente multibanco.",
    images: [OG_IMAGEM_PADRAO],
  },
};

const servicoJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": `${SITE_URL}/home_equity/#servico`,
      name: "Home equity — crédito com garantia de imóvel",
      serviceType: "Intermediação de crédito com garantia de imóvel",
      provider: { "@id": `${SITE_URL}/#negocio` },
      areaServed: [
        { "@type": "City", name: "Vinhedo" },
        { "@type": "City", name: "Valinhos" },
        { "@type": "City", name: "Louveira" },
        { "@type": "City", name: "Jundiaí" },
        { "@type": "City", name: "Campinas" },
        { "@type": "City", name: "Itatiba" },
        { "@type": "City", name: "Indaiatuba" },
        { "@type": "City", name: "Sumaré" },
      ],
      description:
        "Crédito de longo prazo com garantia de imóvel para pessoa física ou jurídica, com foco em imóveis de alto padrão em Vinhedo e região. Análise multibanco com recomendação do menor crédito que resolve o objetivo do cliente. Análise sem custo.",
    },
  ],
};

export default function HomeEquityPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicoJsonLd) }}
      />

      <header className="hero" id="topo">
        <div className="wrap">
          <h1 className="reveal d1">Seu imóvel quitado pode financiar seu próximo movimento.</h1>
          <p className="sub reveal d2">
            Capital de longo prazo a uma fração do custo do crédito empresarial — sem vender o
            patrimônio que você levou décadas para construir.
          </p>
          <a className="cta reveal d3" href="#simulador">
            Solicitar análise sem custo
          </a>
          <div className="cta-nota reveal d3">Análise preliminar sem custo · resposta em até 1 dia útil</div>
        </div>
      </header>

      <div className="trust">
        <div className="wrap">
          <div className="rotulo reveal">Cotação em instituições reguladas pelo Banco Central do Brasil</div>
          <div className="marcas reveal d1">
            <span>Bancos de varejo</span>
            <span>Bancos digitais</span>
            <span>Bancos de investimento</span>
            <span>Securitizadoras · CRI</span>
          </div>
        </div>
      </div>

      <section>
        <div className="wrap">
          <div className="eyebrow reveal">Antes de qualquer número</div>
          <h2 className="reveal d1">Uma estrutura séria exige critério</h2>
          <div className="qual">
            <div className="col sim reveal d1">
              <h3>Faz sentido avaliar se você</h3>
              <ul>
                <li>Tem imóvel quitado ou quase quitado, residencial ou comercial</li>
                <li>
                  Precisa de capital relevante para negócio, expansão ou reestruturação de dívidas
                  caras
                </li>
                <li>
                  Tem geração de renda que sustenta a parcela com folga, mesmo em cenário de
                  estresse
                </li>
              </ul>
            </div>
            <div className="col nao reveal d2">
              <h3>Não recomendo se você</h3>
              <ul>
                <li>
                  Precisa do dinheiro para consumo ou para cobrir déficit recorrente sem plano de
                  correção
                </li>
                <li>Depende do próprio imóvel como única reserva patrimonial da família</li>
                <li>Busca capital para investimento de risco alavancado</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="stats">
        <div className="wrap">
          <div className="eyebrow reveal">Por que garantia de imóvel</div>
          <h2 className="reveal d1">O que a garantia de imóvel destrava</h2>
          <div className="grade">
            <div className="cel reveal">
              <div className="rot">Custo ao ano</div>
              <div className="big mono-num">⅓</div>
              <div className="leg">Fração do custo típico do capital de giro PJ sem garantia.</div>
            </div>
            <div className="cel reveal d1">
              <div className="rot">Prazo</div>
              <div className="big mono-num">
                240<span style={{ fontSize: ".45em" }}> meses</span>
              </div>
              <div className="leg">Contra 12–36 meses das linhas de giro comuns.</div>
            </div>
            <div className="cel reveal d2">
              <div className="rot">Liberação</div>
              <div className="big mono-num">~60%</div>
              <div className="leg">Do valor de avaliação do imóvel, conforme perfil.</div>
            </div>
            <div className="cel reveal d3">
              <div className="rot">Teto de faturamento</div>
              <div className="big mono-num">0</div>
              <div className="leg">Sem limite de porte — pessoa física ou jurídica.</div>
            </div>
          </div>
          <p className="disclaimer reveal">
            Referências de ordem de grandeza para condições usuais de mercado em 2026; valores
            efetivos dependem de análise de crédito, avaliação e instituição.
          </p>
        </div>
      </section>

      <section id="regiao">
        <div className="wrap">
          <div className="eyebrow reveal">Onde atuamos</div>
          <h2 className="reveal d1">Home equity para quem construiu patrimônio em Vinhedo e região</h2>
          <p className="intro reveal d1">
            Vinhedo concentra um dos mercados imobiliários mais valorizados do interior paulista —
            condomínios como Marambaia, São Joaquim, Terras de Vinhedo e Campo de Toscana reúnem
            imóveis que, em muitos casos, já estão quitados ou perto disso. Esse patrimônio é
            justamente a base do home equity: para o empresário da região que hoje paga caro por
            capital de giro, ou para quem quer financiar uma reforma, uma expansão ou uma nova
            aquisição sem se descapitalizar, o próprio imóvel vira a garantia de um crédito mais
            barato e de prazo mais longo.
          </p>
          <div className="cidades reveal d2">
            <span>Vinhedo</span>
            <span>Valinhos</span>
            <span>Louveira</span>
            <span>Jundiaí</span>
            <span>Campinas</span>
            <span>Itatiba</span>
            <span>Indaiatuba</span>
            <span>Sumaré</span>
          </div>
        </div>
      </section>

      <section className="como-funciona">
        <div className="wrap">
          <div className="eyebrow reveal">Como funciona</div>
          <h2 className="reveal d1">Do diagnóstico ao acompanhamento</h2>
          <div className="processo">
            <div className="linha-central" aria-hidden="true" />
            <div className="etapa-v esq reveal">
              <div className="caixa">
                <div className="tempo">Sem custo · 30 min</div>
                <h3>Diagnóstico patrimonial</h3>
                <p>
                  Analisamos o imóvel, seu objetivo com o capital e as linhas que você usa hoje.
                  Se home equity não for a melhor estrutura, você sai sabendo o porquê.
                </p>
              </div>
              <div className="num-v">01</div>
            </div>
            <div className="etapa-v dir reveal">
              <div className="num-v">02</div>
              <div className="caixa">
                <div className="tempo">1 – 2 semanas</div>
                <h3>Estruturação e cotação</h3>
                <p>
                  Buscamos as melhores condições em diferentes bancos e comparamos tudo que pesa
                  no custo real: taxa, prazo, seguros e tarifas.
                </p>
              </div>
            </div>
            <div className="etapa-v esq reveal">
              <div className="caixa">
                <div className="tempo">Sua decisão</div>
                <h3>Execução acompanhada</h3>
                <p>
                  Da avaliação do imóvel ao registro em cartório, você acompanha cada fase com um
                  único interlocutor.
                </p>
              </div>
              <div className="num-v">03</div>
            </div>
            <div className="etapa-v dir reveal">
              <div className="num-v">04</div>
              <div className="caixa">
                <div className="tempo">Após a liberação</div>
                <h3>Acompanhamento</h3>
                <p>
                  A relação não termina no crédito liberado: revisões de condição, portabilidade
                  quando o mercado melhora e um canal aberto para as próximas decisões.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="compare">
        <div className="wrap">
          <div className="eyebrow reveal">O argumento em números</div>
          <h2 className="reveal d1">A mesma necessidade, custos que não se comparam</h2>
          <p className="intro reveal d1">
            Para o empresário, a comparação honesta é com o que existe de melhor no crédito PJ —
            incluindo linhas subsidiadas. Cada estrutura tem limites que os números abaixo deixam
            claros.
          </p>
          <div className="tab-scroll reveal d2" aria-label="Tabela comparativa de linhas de crédito">
            <table className="tabela">
              <thead>
                <tr>
                  <th scope="col">Linha de crédito</th>
                  <th scope="col">Custo típico</th>
                  <th scope="col">Prazo máximo</th>
                  <th scope="col">Limite de valor</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="Linha">
                    Capital de giro PJ
                    <small>bancos comerciais, sem garantia real</small>
                  </td>
                  <td data-label="Custo típico">
                    <span className="mono-num">2,5% – 4% a.m.</span>
                    <small>≈ 34% – 60% a.a.</small>
                  </td>
                  <td data-label="Prazo máximo">
                    <span className="mono-num">12 – 36 meses</span>
                  </td>
                  <td data-label="Limite de valor">conforme relacionamento</td>
                </tr>
                <tr>
                  <td data-label="Linha">
                    Pronampe
                    <small>linha federal, só empresas com faturamento até R$ 4,8 mi/ano</small>
                  </td>
                  <td data-label="Custo típico">
                    <span className="mono-num">Selic + 6% a.a.</span>
                    <small>pós-fixado; hoje acima de 20% a.a.</small>
                  </td>
                  <td data-label="Prazo máximo">
                    <span className="mono-num">96 meses</span>
                  </td>
                  <td data-label="Limite de valor">
                    <span className="mono-num">até R$ 500 mil</span>
                    <small>máx. 50% do faturamento do ano anterior</small>
                  </td>
                </tr>
                <tr>
                  <td data-label="Linha">
                    Garantia de investimentos
                    <small>aplicações financeiras em garantia; você segue investindo</small>
                  </td>
                  <td data-label="Custo típico">
                    <span className="mono-num">CDI + 3% – 6% a.a.</span>
                    <small>menor que crédito pessoal; ativos permanecem rendendo</small>
                  </td>
                  <td data-label="Prazo máximo">
                    <span className="mono-num">até 60 meses</span>
                  </td>
                  <td data-label="Limite de valor">
                    <span className="mono-num">~60% dos ativos</span>
                    <small>limitado ao valor e vencimento da carteira dada em garantia</small>
                  </td>
                </tr>
                <tr className="destaque">
                  <td data-label="Linha">
                    Home equity
                    <small>garantia de imóvel · alienação fiduciária</small>
                  </td>
                  <td data-label="Custo típico">
                    <span className="mono-num">IPCA + 9% – 12% a.a.</span>
                    <small>prefixado ao índice; menor custo da comparação</small>
                  </td>
                  <td data-label="Prazo máximo">
                    <span className="mono-num">até 240 meses</span>
                  </td>
                  <td data-label="Limite de valor">
                    <span className="mono-num">até ~60% do imóvel</span>
                    <small>sem teto de faturamento — PF ou PJ</small>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="disclaimer">
            Valores ilustrativos, referências de mercado em julho/2026, para comparação de ordem
            de grandeza. Pronampe: condições do programa federal (FGO) — taxa pós-fixada,
            elegibilidade e teto dependem de faturamento e disponibilidade de recursos. Home
            equity: taxas efetivas dependem de análise de crédito, avaliação do imóvel, prazo e
            instituição; operação com alienação fiduciária — o imóvel é dado em garantia e pode
            ser tomado em caso de inadimplência. Crédito sujeito a aprovação.
          </p>
        </div>
      </section>

      <SimuladorHomeEquity />

      <section className="metodo-dark">
        <div className="wrap">
          <div className="eyebrow reveal">Método</div>
          <h2 className="reveal d1">Três compromissos que regem a análise</h2>
          <div className="metodo">
            <div className="item reveal">
              <h3>Multibanco, sem bandeira</h3>
              <p>
                A cotação percorre múltiplas instituições e compara custo efetivo total. Você vê
                as propostas lado a lado, com os critérios abertos.
              </p>
            </div>
            <div className="item reveal d1">
              <h3>O menor crédito que resolve</h3>
              <p>
                A recomendação parte do valor mínimo que atinge seu objetivo — nunca do máximo que
                o banco libera. Alavancagem desnecessária é risco, não conquista.
              </p>
            </div>
            <div className="item reveal d2">
              <h3>Análise sem custo</h3>
              <p>
                O diagnóstico, a cotação multibanco e o comparativo de propostas não custam nada
                para você — em nenhuma etapa, decida avançar ou não.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="eyebrow reveal">Perguntas diretas</div>
          <h2 className="reveal d1">Antes de decidir, as dúvidas reais</h2>
          <details>
            <summary>Perco a propriedade do imóvel?</summary>
            <div className="resp">
              Não. Você permanece dono e com posse plena. O imóvel fica alienado fiduciariamente à
              instituição durante o contrato — a mesma estrutura de um financiamento imobiliário
              comum. Quitou, a garantia é baixada.
            </div>
          </details>
          <details>
            <summary>Quanto do valor do imóvel consigo liberar?</summary>
            <div className="resp">
              Em geral até 60% do valor de avaliação, variando por instituição e perfil. Minha
              recomendação parte sempre do menor crédito que resolve o seu objetivo — não do
              máximo que o banco libera.
            </div>
          </details>
          <details>
            <summary>Minha empresa fatura mais de R$ 4,8 milhões. Tenho alternativa ao Pronampe?</summary>
            <div className="resp">
              O Pronampe é restrito a empresas até esse faturamento. Acima dele, as opções usuais
              são capital de giro a taxas altas ou crédito estruturado com garantias — e é
              exatamente onde o home equity costuma ser a estrutura mais eficiente: custo menor,
              prazo maior e valores compatíveis com operações relevantes.
            </div>
          </details>
          <details>
            <summary>Qual o risco real da operação?</summary>
            <div className="resp">
              O risco é a garantia: em caso de inadimplência prolongada, a instituição pode
              executar o imóvel. Por isso a etapa de diagnóstico avalia sua capacidade de
              pagamento em cenário de estresse antes de qualquer proposta. Se a conta não fecha
              com folga, eu digo.
            </div>
          </details>
          <details>
            <summary>Qual a diferença entre home equity e financiamento imobiliário?</summary>
            <div className="resp">
              No financiamento imobiliário, você pega dinheiro emprestado para comprar um imóvel.
              No home equity, você usa um imóvel que já é seu como garantia para pegar dinheiro
              emprestado para qualquer finalidade — quitar dívidas, investir, reformar, entre
              outras.
            </div>
          </details>
          <details>
            <summary>Quais são as taxas de juros?</summary>
            <div className="resp">
              As taxas começam a partir de 1,09% a.m. + IPCA. A taxa exata depende do banco, do
              seu perfil de crédito, do valor do imóvel e da relação entre o valor do crédito e o
              valor do imóvel (LTV).
            </div>
          </details>
          <details>
            <summary>Quanto tempo demora para liberar o crédito?</summary>
            <div className="resp">
              O prazo médio é de 20 a 40 dias úteis, desde a simulação até a liberação do crédito
              na conta. O acompanhamento de cada etapa ajuda a manter o processo dentro desse
              prazo.
            </div>
          </details>
          <details>
            <summary>Que tipos de imóvel são aceitos?</summary>
            <div className="resp">
              Casas, apartamentos, salas comerciais e terrenos urbanos. O imóvel precisa ter
              matrícula regular e estar em área urbana. Imóveis rurais geralmente não são
              aceitos.
            </div>
          </details>
          <details>
            <summary>Como a Capital Imobiliário consegue taxas melhores?</summary>
            <div className="resp">
              Porque comparamos simultaneamente as condições de mais de 30 bancos para o seu
              perfil. Essa concorrência entre instituições resulta em ofertas melhores do que você
              conseguiria indo sozinho a um único banco.
            </div>
          </details>
        </div>
      </section>
    </>
  );
}
