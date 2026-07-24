import type { Metadata } from "next";
import { SimuladorFinanciamento } from "@/components/financiamento/SimuladorFinanciamento";
import { SITE_URL } from "@/lib/site";

const TITULO = "Financiamento imobiliário multibanco — Rafael Teixeira · Capital Imobiliário";
const DESCRICAO =
  "Financiamento imobiliário SBPE com cotação em múltiplos bancos: a diferença entre a melhor e a pior taxa pode passar de R$ 200 mil no mesmo contrato. Pré-aprovação e análise sem custo. Rafael Teixeira · Capital Imobiliário.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/financiamento/" },
  openGraph: {
    type: "website",
    siteName: "Rafael Teixeira · Capital Imobiliário",
    title: "Financiamento imobiliário multibanco — a taxa certa vale R$ 200 mil",
    description:
      "O imóvel você escolhe. O financiamento, a gente disputa banco a banco. Cotação multibanco, comparação por CET e acompanhamento até as chaves.",
    url: "/financiamento/",
    images: ["/images/background.jpg"],
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Financiamento imobiliário multibanco — a taxa certa vale R$ 200 mil",
    description:
      "Cotação em múltiplos bancos, comparação por Custo Efetivo Total e acompanhamento da pré-aprovação ao registro.",
    images: ["/images/background.jpg"],
  },
};

const servicoJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": `${SITE_URL}/financiamento/#servico`,
      name: "Financiamento imobiliário SBPE — cotação multibanco",
      serviceType: "Intermediação de financiamento imobiliário",
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
        "Pré-aprovação de crédito, cotação simultânea em múltiplos bancos e comparação por Custo Efetivo Total (taxa, seguros e tarifas), com acompanhamento até o registro do imóvel. Análise sem custo.",
    },
  ],
};

export default function FinanciamentoPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicoJsonLd) }}
      />

      <header className="hero" id="topo">
        <div className="wrap">
          <h1>O imóvel você escolhe. O financiamento, a gente disputa banco a banco.</h1>
          <p className="sub">
            No mesmo contrato de 30 anos, a diferença entre a melhor e a pior taxa do mercado
            pode passar de R$ 200 mil. A cotação multibanco existe para essa diferença ficar com
            você.
          </p>
          <a className="cta" href="#simulador">
            Simular meu financiamento
          </a>
          <div className="cta-nota">Pré-aprovação sem custo · resposta em até 1 dia útil</div>
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

      <section>
        <div className="wrap">
          <div className="eyebrow">Antes de qualquer número</div>
          <h2>Financiar bem começa antes do banco</h2>
          <div className="qual">
            <div className="col sim">
              <h3>Faz sentido avaliar se você</h3>
              <ul>
                <li>
                  Tem entrada a partir de 20% do valor do imóvel — em dinheiro, FGTS ou os dois
                  somados
                </li>
                <li>
                  Tem renda comprovável, própria ou composta com cônjuge ou familiar, que comporta
                  a parcela com folga
                </li>
                <li>
                  Vai comprar para morar ou investir com horizonte longo — e quer o menor custo
                  total, não só a menor parcela
                </li>
              </ul>
            </div>
            <div className="col nao">
              <h3>Não recomendo avançar se você</h3>
              <ul>
                <li>Ainda não tem entrada nem FGTS — o SBPE não financia 100% do imóvel</li>
                <li>
                  Precisaria comprometer muito mais de 30% da renda com a parcela para a conta
                  fechar
                </li>
                <li>
                  Não reservou os custos de transação — ITBI e cartório somam por volta de 4% a 5%
                  além da entrada
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="stats">
        <div className="wrap">
          <div className="eyebrow">O que o SBPE permite hoje</div>
          <h2>As regras do jogo em 2026</h2>
          <div className="grade">
            <div className="cel">
              <div className="rot">Financiamento</div>
              <div className="big mono-num">90%</div>
              <div className="leg">
                Do valor do imóvel em programas especiais, como o Santander Select — entrada
                usual a partir de 20%.
              </div>
            </div>
            <div className="cel">
              <div className="rot">Prazo</div>
              <div className="big mono-num">
                420<span style={{ fontSize: ".45em" }}> meses</span>
              </div>
              <div className="leg">Até 35 anos para diluir a parcela e preservar o fluxo de caixa.</div>
            </div>
            <div className="cel">
              <div className="rot">Teto do SFH</div>
              <div className="big mono-num">
                R$ 2,25<span style={{ fontSize: ".45em" }}> mi</span>
              </div>
              <div className="leg">Valor de imóvel que permite uso do FGTS e as melhores condições.</div>
            </div>
            <div className="cel">
              <div className="rot">Entre bancos</div>
              <div className="big mono-num">
                ~2,3<span style={{ fontSize: ".45em" }}> p.p.</span>
              </div>
              <div className="leg">
                Diferença de taxa ao ano para o mesmo perfil — é aqui que a cotação trabalha.
              </div>
            </div>
          </div>
          <p className="disclaimer">
            Referências de condições usuais de mercado em julho/2026; valores efetivos dependem de
            análise de crédito, avaliação do imóvel e instituição.
          </p>
        </div>
      </section>

      <section className="como-funciona">
        <div className="wrap">
          <div className="eyebrow">Como funciona</div>
          <h2>Da pré-aprovação às chaves</h2>
          <div className="processo">
            <div className="linha-central" aria-hidden="true" />
            <div className="etapa-v esq">
              <div className="caixa">
                <div className="tempo">Até 1 dia útil</div>
                <h3>Cotação e comparação</h3>
                <p>
                  A partir do seu perfil e do imóvel de interesse, montamos a cotação em
                  diferentes bancos e comparamos pelo Custo Efetivo Total — taxa, seguros
                  obrigatórios e tarifas, lado a lado.
                </p>
              </div>
              <div className="num-v">01</div>
            </div>
            <div className="etapa-v dir">
              <div className="num-v">02</div>
              <div className="caixa">
                <div className="tempo">1 a 5 dias úteis</div>
                <h3>Pré-aprovação multibanco</h3>
                <p>
                  Submetemos seu crédito às instituições selecionadas. Comprar com carta
                  pré-aprovada em mãos muda sua posição na negociação do imóvel.
                </p>
              </div>
            </div>
            <div className="etapa-v esq">
              <div className="caixa">
                <div className="tempo">30 a 60 dias</div>
                <h3>Avaliação e contratação</h3>
                <p>
                  O banco escolhido avalia o imóvel e emite o contrato. Cada condição é conferida
                  contra a proposta antes da assinatura.
                </p>
              </div>
              <div className="num-v">03</div>
            </div>
            <div className="etapa-v dir">
              <div className="num-v">04</div>
              <div className="caixa">
                <div className="tempo">Até 30 dias</div>
                <h3>Registro e chaves</h3>
                <p>
                  ITBI, cartório e liberação do recurso ao vendedor, com um único interlocutor.
                  Depois, monitoramento: se o mercado melhorar, a portabilidade reduz sua taxa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="compare">
        <div className="wrap">
          <div className="eyebrow">O argumento em números</div>
          <h2>O mesmo imóvel, contratos que não se comparam</h2>
          <p className="intro">
            A simulação abaixo usa um financiamento de R$ 800 mil em 360 meses, pelo sistema SAC,
            apenas variando a taxa entre as praticadas hoje no mercado. A taxa parece um detalhe
            de vitrine — o total pago mostra que não é.
          </p>
          <div className="tab-scroll" aria-label="Tabela comparativa do impacto da taxa no financiamento">
            <table className="tabela">
              <thead>
                <tr>
                  <th scope="col">Cenário de taxa</th>
                  <th scope="col">Custo ao ano</th>
                  <th scope="col">Parcela inicial</th>
                  <th scope="col">Total pago no contrato</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="Cenário">
                    Banco digital / balcão caro
                    <small>contratação direta, sem comparação</small>
                  </td>
                  <td data-label="Custo ao ano">
                    <span className="mono-num">13,99% a.a. + TR</span>
                  </td>
                  <td data-label="Parcela inicial">
                    <span className="mono-num">R$ 10.999</span>
                  </td>
                  <td data-label="Total pago">
                    <span className="mono-num">≈ R$ 2,38 mi</span>
                    <small>R$ 248 mil a mais que a melhor taxa</small>
                  </td>
                </tr>
                <tr>
                  <td data-label="Cenário">
                    Taxa média de balcão
                    <small>primeira proposta do gerente</small>
                  </td>
                  <td data-label="Custo ao ano">
                    <span className="mono-num">12,8% a.a. + TR</span>
                  </td>
                  <td data-label="Parcela inicial">
                    <span className="mono-num">R$ 10.292</span>
                  </td>
                  <td data-label="Total pago">
                    <span className="mono-num">≈ R$ 2,26 mi</span>
                    <small>R$ 120 mil a mais que a melhor taxa</small>
                  </td>
                </tr>
                <tr className="destaque">
                  <td data-label="Cenário">
                    Melhor taxa em cotação
                    <small>bancos disputando a mesma operação</small>
                  </td>
                  <td data-label="Custo ao ano">
                    <span className="mono-num">11,69% a.a. + TR</span>
                  </td>
                  <td data-label="Parcela inicial">
                    <span className="mono-num">R$ 9.627</span>
                  </td>
                  <td data-label="Total pago">
                    <span className="mono-num">≈ R$ 2,14 mi</span>
                    <small>referência: menor taxa de banco privado no mercado</small>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="disclaimer">
            Valores ilustrativos calculados pelo sistema SAC, sem TR, seguros e tarifas, com taxas
            de bancos privados praticadas no mercado em julho/2026 (11,69% a 13,99% a.a.) — para
            comparação de ordem de grandeza entre cenários. As condições efetivas dependem de
            análise de crédito, avaliação do imóvel, relacionamento e instituição. Não constitui
            oferta de crédito. Crédito sujeito a aprovação.
          </p>
        </div>
      </section>

      <SimuladorFinanciamento />

      <section className="metodo-dark">
        <div className="wrap">
          <div className="eyebrow">Método</div>
          <h2>Três compromissos que regem a análise</h2>
          <div className="metodo">
            <div className="item">
              <h3>Multibanco, sem bandeira</h3>
              <p>
                A mesma operação é cotada em múltiplas instituições ao mesmo tempo. Você vê as
                propostas lado a lado, com os critérios abertos — e a concorrência trabalha a seu
                favor.
              </p>
            </div>
            <div className="item">
              <h3>CET, não taxa de vitrine</h3>
              <p>
                A comparação é sempre pelo Custo Efetivo Total: taxa, seguros obrigatórios e
                tarifas. A menor taxa anunciada nem sempre é o menor contrato — e é o contrato que
                você paga.
              </p>
            </div>
            <div className="item">
              <h3>Do crédito às chaves</h3>
              <p>
                Corretor e correspondente bancário na mesma pessoa: da pré-aprovação à avaliação,
                do contrato ao registro em cartório, um único interlocutor responde por cada
                etapa.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="wrap">
          <div className="eyebrow">Perguntas diretas</div>
          <h2>Antes de decidir, as dúvidas reais</h2>
          <details>
            <summary>Preciso já ter escolhido o imóvel para começar?</summary>
            <div className="resp">
              Não — e o ideal é começar antes. A pré-aprovação de crédito vale por cerca de 90
              dias e define seu teto real de compra. Negociar um imóvel com carta pré-aprovada na
              mão é negociar de outra posição.
            </div>
          </details>
          <details>
            <summary>Qual a entrada mínima?</summary>
            <div className="resp">
              Em geral 20% do valor do imóvel. Alguns bancos, em programas especiais como o
              Santander Select, chegam a financiar até 90% — os demais 10% de entrada podem,
              inclusive, ser compostos com FGTS, dentro das regras de uso do fundo.
            </div>
          </details>
          <details>
            <summary>Posso usar meu FGTS?</summary>
            <div className="resp">
              Sim, se você tem 3 anos de trabalho sob o regime do FGTS (somando períodos), não
              possui outro imóvel residencial na mesma cidade e o imóvel é residencial urbano
              dentro do teto do SFH — hoje R$ 2,25 milhões. O fundo pode entrar na entrada e,
              depois, a cada 2 anos, para amortizar o saldo.
            </div>
          </details>
          <details>
            <summary>SAC ou Price: qual escolher?</summary>
            <div className="resp">
              No SAC a parcela começa maior e cai todo mês, com menos juros no total do contrato.
              Na Price a parcela é fixa, mais leve no início, mas o custo total é maior. A escolha
              certa depende do seu fluxo de renda — essa conta faz parte do diagnóstico.
            </div>
          </details>
          <details>
            <summary>Quais os custos além da entrada?</summary>
            <div className="resp">
              ITBI (imposto municipal de transmissão) e registro em cartório, que juntos somam por
              volta de 4% a 5% do valor do imóvel, além da tarifa de avaliação do banco. Esses
              valores precisam estar reservados fora da entrada — e entram no planejamento desde a
              primeira conversa.
            </div>
          </details>
          <details>
            <summary>Sou autônomo ou empresário. Consigo financiar?</summary>
            <div className="resp">
              Sim. A comprovação de renda muda de formato: extratos bancários, declaração de
              imposto de renda, pró-labore, faturamento da empresa ou DECORE. Cada banco pesa
              esses documentos de um jeito — mais um motivo para cotar em vários.
            </div>
          </details>
          <details>
            <summary>Posso somar renda com outra pessoa?</summary>
            <div className="resp">
              Sim. A composição de renda com cônjuge, companheiro ou familiar é aceita pela
              maioria dos bancos e aumenta o valor financiável. Os participantes entram juntos na
              análise de crédito e no contrato.
            </div>
          </details>
          <details>
            <summary>Quanto tempo demora até as chaves?</summary>
            <div className="resp">
              A pré-aprovação sai em horas ou poucos dias, dependendo do banco. Da proposta aceita
              até o registro e a liberação do recurso, o processo completo costuma levar de 30 a
              60 dias — e o acompanhamento de cada etapa serve para mantê-lo nesse prazo.
            </div>
          </details>
          <details>
            <summary>E se as taxas caírem depois que eu assinar?</summary>
            <div className="resp">
              Existe a portabilidade de crédito: você transfere o saldo devedor para outro banco
              com taxa menor, sem refazer a compra. Quem financia hoje garante o preço do imóvel
              de hoje — e mantém a porta aberta para reduzir a taxa amanhã. Esse monitoramento faz
              parte do acompanhamento pós-contrato.
            </div>
          </details>
        </div>
      </section>
    </>
  );
}
