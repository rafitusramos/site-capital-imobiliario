import type { Metadata } from "next";
import "@/styles/legal.css";
import { IMAGEM_OG_PADRAO } from "@/lib/og";
import { ATUALIZADO_EM } from "@/lib/legal";

const TITULO = "Termos de Uso — Rafael Teixeira · Capital Imobiliário";
const DESCRICAO =
  "Condições de uso do site RT Capital Imobiliário: o que os simuladores representam, a atuação como correspondente bancário e corretor de imóveis, e os limites de responsabilidade do serviço.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/termos-de-uso/" },
  openGraph: {
    type: "website",
    siteName: "Rafael Teixeira · Capital Imobiliário",
    title: TITULO,
    description: DESCRICAO,
    url: "/termos-de-uso/",
    images: [IMAGEM_OG_PADRAO],
    locale: "pt_BR",
  },
};

const SECOES = [
  { id: "aceitacao", titulo: "Aceitação" },
  { id: "o-que-este-site-e", titulo: "O que este site é" },
  { id: "correspondente-bancario", titulo: "Atuação como correspondente bancário" },
  { id: "assessoria-de-investimentos", titulo: "Assessoria de investimentos" },
  { id: "intermediacao-imobiliaria", titulo: "Intermediação imobiliária" },
  { id: "simuladores-sao-estimativas", titulo: "Os simuladores são estimativas" },
  { id: "suas-responsabilidades", titulo: "Suas responsabilidades" },
  { id: "propriedade-intelectual", titulo: "Propriedade intelectual" },
  { id: "conteudo-de-terceiros", titulo: "Conteúdo de terceiros" },
  { id: "limitacao-de-responsabilidade", titulo: "Limitação de responsabilidade" },
  { id: "privacidade", titulo: "Privacidade" },
  { id: "alteracoes-destes-termos", titulo: "Alterações destes termos" },
  { id: "lei-aplicavel-e-foro", titulo: "Lei aplicável e foro" },
];

export default function TermosDeUsoPage() {
  return (
    <>
      <header className="legal-header">
        <div className="wrap">
          <div className="eyebrow">Documentos legais</div>
          <h1>Termos de Uso</h1>
          <p className="legal-atualizado">Atualizado em {ATUALIZADO_EM}</p>
        </div>
      </header>

      <section>
        <div className="wrap">
          <nav className="legal-toc" aria-label="Índice dos termos de uso">
            <p className="legal-toc-titulo">Nesta página</p>
            <ol>
              {SECOES.map((secao, i) => (
                <li key={secao.id}>
                  <a href={`#${secao.id}`}>
                    <span className="num">{i + 1}.</span>
                    {secao.titulo}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="legal-body">
            <section id="aceitacao">
              <h2>
                <span className="num">1.</span>Aceitação
              </h2>
              <p>
                Ao usar este site, você concorda com estes Termos de Uso e com a{" "}
                <a href="/politica-de-privacidade/">Política de Privacidade</a>. Se não
                concordar com algum ponto, o uso do site e o envio de formulários não devem
                continuar.
              </p>
            </section>

            <section id="o-que-este-site-e">
              <h2>
                <span className="num">2.</span>O que este site é
              </h2>
              <p>
                Este site é uma apresentação institucional do trabalho de Rafael Teixeira e uma
                ferramenta de pré-qualificação de crédito e de intermediação imobiliária. O
                conteúdo publicado — textos, simuladores, tabelas comparativas e material do
                blog — tem caráter informativo.
              </p>
            </section>

            <section id="correspondente-bancario">
              <h2>
                <span className="num">3.</span>Atuação como correspondente bancário
              </h2>
              <p>
                A atuação na intermediação de crédito ocorre na forma da Resolução CMN
                4.935/2021, que rege a atividade de correspondente bancário. Isso significa, com
                todas as letras: <strong>não somos instituição financeira, não concedemos
                crédito e não garantimos aprovação.</strong> A decisão de conceder ou não o
                crédito é sempre do banco, sujeita à análise dele.
              </p>
            </section>

            <section id="assessoria-de-investimentos">
              <h2>
                <span className="num">4.</span>Assessoria de investimentos
              </h2>
              <p>
                O vínculo como Assessor de Investimentos (AAI), sob a Resolução CVM 178 e
                vinculado à XP Investimentos, é uma atividade regulatória distinta da
                intermediação de crédito e de imóveis. Essa atividade{" "}
                <strong>não é comercializada por meio deste site.</strong>
              </p>
            </section>

            <section id="intermediacao-imobiliaria">
              <h2>
                <span className="num">5.</span>Intermediação imobiliária
              </h2>
              <p>
                A intermediação de compra, venda e locação de imóveis é exercida na condição de
                corretor de imóveis registrado no CRECI-SP, com afiliação à RE/MAX Clarity, em
                Vinhedo (SP).
              </p>
            </section>

            <section id="simuladores-sao-estimativas">
              <h2>
                <span className="num">6.</span>Os simuladores são estimativas
              </h2>
              <p>
                Os valores de parcela, prazo e crédito exibidos nos simuladores são cálculos
                aproximados, feitos a partir dos números que você mesmo informa, usando taxas de
                referência que mudam ao longo do tempo.{" "}
                <strong>
                  Esses valores não constituem proposta, oferta firme nem garantia de condições.
                </strong>{" "}
                As condições reais de crédito — taxa, prazo e valor aprovado — dependem sempre da
                análise do banco.
              </p>
            </section>

            <section id="suas-responsabilidades">
              <h2>
                <span className="num">7.</span>Suas responsabilidades
              </h2>
              <p>Ao usar este site, você se compromete a:</p>
              <ul>
                <li>Informar dados verdadeiros e que sejam seus;</li>
                <li>Ter capacidade civil para os atos praticados no site;</li>
                <li>Não usar o site para qualquer finalidade ilícita;</li>
                <li>Não tentar burlar os mecanismos de segurança do site, como o limite de tentativas por IP.</li>
              </ul>
            </section>

            <section id="propriedade-intelectual">
              <h2>
                <span className="num">8.</span>Propriedade intelectual
              </h2>
              <p>
                Os textos, imagens, marca, código e demais materiais publicados neste site
                pertencem ao seu titular. O uso desses materiais sem autorização prévia é vedado.
              </p>
            </section>

            <section id="conteudo-de-terceiros">
              <h2>
                <span className="num">9.</span>Conteúdo de terceiros
              </h2>
              <p>
                O site pode conter links e vídeos incorporados de terceiros (por exemplo, do
                YouTube). Não respondemos pelo conteúdo publicado em sites de terceiros
                referenciados a partir daqui.
              </p>
            </section>

            <section id="limitacao-de-responsabilidade">
              <h2>
                <span className="num">10.</span>Limitação de responsabilidade
              </h2>
              <p>
                O site pode ficar indisponível temporariamente para manutenção. Não respondemos
                por decisões de crédito tomadas por instituições financeiras, nem por prejuízo
                decorrente de dado incorreto informado por você nos formulários.
              </p>
            </section>

            <section id="privacidade">
              <h2>
                <span className="num">11.</span>Privacidade
              </h2>
              <p>
                O tratamento dos seus dados pessoais é descrito em detalhe na nossa{" "}
                <a href="/politica-de-privacidade/">Política de Privacidade</a>, que integra
                estes Termos de Uso.
              </p>
            </section>

            <section id="alteracoes-destes-termos">
              <h2>
                <span className="num">12.</span>Alterações destes termos
              </h2>
              <p>
                A versão vigente destes termos é sempre a publicada nesta página, com a data de
                atualização indicada no topo.
              </p>
            </section>

            <section id="lei-aplicavel-e-foro">
              <h2>
                <span className="num">13.</span>Lei aplicável e foro
              </h2>
              <p>
                Estes termos são regidos pela legislação brasileira. Fica eleito o foro do
                domicílio do consumidor para dirimir eventuais controvérsias, na forma do art. 51,
                IV, e do art. 101, I, do Código de Defesa do Consumidor.
              </p>

              <div className="legal-cross">
                <a href="/politica-de-privacidade/">Ler também a Política de Privacidade →</a>
              </div>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
