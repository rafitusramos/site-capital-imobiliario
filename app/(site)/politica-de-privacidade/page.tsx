import type { Metadata } from "next";
import "@/styles/legal.css";
import { IMAGEM_OG_PADRAO } from "@/lib/og";
import {
  CONTROLADOR,
  ENCARREGADO,
  EMAIL_LGPD,
  RETENCAO_ANOS,
  ATUALIZADO_EM,
  TEXTO_CONSENTIMENTO,
} from "@/lib/legal";

const TITULO = "Política de Privacidade — Rafael Teixeira · Capital Imobiliário";
const DESCRICAO =
  "Como a RT Capital Imobiliário coleta, usa e protege os dados pessoais informados nos formulários de pré-qualificação de crédito, em conformidade com a LGPD (Lei 13.709/2018).";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRICAO,
  alternates: { canonical: "/politica-de-privacidade/" },
  openGraph: {
    type: "website",
    siteName: "Rafael Teixeira · Capital Imobiliário",
    title: TITULO,
    description: DESCRICAO,
    url: "/politica-de-privacidade/",
    images: [IMAGEM_OG_PADRAO],
    locale: "pt_BR",
  },
};

const SECOES = [
  { id: "quem-controla-seus-dados", titulo: "Quem controla seus dados" },
  { id: "quais-dados-coletamos", titulo: "Quais dados coletamos" },
  { id: "por-que-coletamos", titulo: "Por que coletamos" },
  { id: "base-legal", titulo: "Base legal" },
  { id: "com-quem-compartilhamos", titulo: "Com quem compartilhamos" },
  { id: "transferencia-internacional", titulo: "Transferência internacional" },
  { id: "por-quanto-tempo-guardamos", titulo: "Por quanto tempo guardamos" },
  { id: "seus-direitos", titulo: "Seus direitos" },
  { id: "como-revogar-o-consentimento", titulo: "Como revogar o consentimento" },
  { id: "seguranca", titulo: "Segurança" },
  { id: "cookies-e-rastreamento", titulo: "Cookies e rastreamento" },
  { id: "criancas-e-adolescentes", titulo: "Crianças e adolescentes" },
  { id: "alteracoes-nesta-politica", titulo: "Alterações nesta política" },
  { id: "fale-com-a-gente", titulo: "Fale com a gente" },
];

export default function PoliticaDePrivacidadePage() {
  return (
    <>
      <header className="legal-header">
        <div className="wrap">
          <div className="eyebrow">Documentos legais</div>
          <h1>Política de Privacidade</h1>
          <p className="legal-atualizado">Atualizado em {ATUALIZADO_EM}</p>
        </div>
      </header>

      <section>
        <div className="wrap">
          <nav className="legal-toc" aria-label="Índice da política de privacidade">
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
            <section id="quem-controla-seus-dados">
              <h2>
                <span className="num">1.</span>Quem controla seus dados
              </h2>
              <p>
                O controlador dos dados pessoais tratados por este site é:
              </p>
              <div className="legal-destaque">
                <span className="rot">Razão social</span>
                {CONTROLADOR.razaoSocial}
                <br />
                <span className="rot">CNPJ</span>
                {CONTROLADOR.cnpj}
                <br />
                <span className="rot">Endereço</span>
                {CONTROLADOR.endereco}
              </div>
              <p>
                O encarregado pelo tratamento de dados pessoais, na forma do art. 41 da LGPD, é{" "}
                <strong>{ENCARREGADO}</strong>, que atende pelo e-mail{" "}
                <a href={`mailto:${EMAIL_LGPD}`}>{EMAIL_LGPD}</a>.
              </p>
              <p>
                Qualquer pedido relacionado aos seus dados pessoais — acesso, correção,
                eliminação ou qualquer um dos direitos listados no item 8 — deve ser
                encaminhado para esse mesmo endereço.
              </p>
            </section>

            <section id="quais-dados-coletamos">
              <h2>
                <span className="num">2.</span>Quais dados coletamos
              </h2>
              <p>Coletamos três grupos de dados, sempre a partir do que você mesmo informa ou gera ao usar o site:</p>
              <p>
                <strong>a) Dados que você informa no formulário:</strong> nome, e-mail,
                telefone, CPF (opcional), renda mensal, tipo de remuneração, valor e tipo do
                imóvel, cidade e estado, e o momento da compra. No formulário de home equity,
                coletamos ainda CEP, número, área do imóvel, se ele está quitado e, quando não
                estiver, o saldo devedor.
              </p>
              <p>
                <strong>b) Dados gerados pelo simulador no envio:</strong> o valor de crédito
                estimado, o prazo, a parcela estimada e o percentual de entrada calculados a
                partir dos números que você informou.
              </p>
              <p>
                <strong>c) Dados técnicos:</strong> o endereço IP de onde o formulário foi
                enviado, a URL da página de origem e os parâmetros de campanha (utm_source,
                utm_medium, utm_campaign, utm_term, utm_content), quando presentes.
              </p>
            </section>

            <section id="por-que-coletamos">
              <h2>
                <span className="num">3.</span>Por que coletamos
              </h2>
              <p>Usamos esses dados para:</p>
              <ul>
                <li>Fazer a pré-qualificação de crédito da sua solicitação;</li>
                <li>Encaminhar sua solicitação aos bancos e instituições financeiras parceiras;</li>
                <li>Entrar em contato com você sobre a solicitação enviada;</li>
                <li>Prevenir fraude e abuso no formulário (por exemplo, o limite de tentativas por IP);</li>
                <li>Cumprir obrigações legais e regulatórias aplicáveis à atividade de correspondente bancário.</li>
              </ul>
            </section>

            <section id="base-legal">
              <h2>
                <span className="num">4.</span>Base legal
              </h2>
              <p>
                Tratamos seus dados com base nas hipóteses do art. 7º da Lei 13.709/2018 (LGPD):
              </p>
              <ul>
                <li>
                  <strong>Consentimento (inciso I):</strong> para a pré-qualificação de crédito e
                  o encaminhamento às instituições financeiras parceiras. O consentimento abrange
                  os dados que você informa no formulário, incluindo o CPF quando você opta por
                  informá-lo. O texto que você marca antes de enviar é este:
                  <p className="legal-cita">&ldquo;{TEXTO_CONSENTIMENTO}&rdquo;</p>
                </li>
                <li>
                  <strong>Execução de contrato (inciso V):</strong> quando o tratamento é
                  necessário para viabilizar o serviço solicitado por você;
                </li>
                <li>
                  <strong>Cumprimento de obrigação legal ou regulatória (inciso II):</strong>{" "}
                  decorrente da atuação como correspondente bancário;
                </li>
                <li>
                  <strong>Legítimo interesse (inciso IX):</strong> apenas para segurança e
                  prevenção a fraude, como o limite de tentativas de envio por IP — nunca para
                  finalidades de marketing ou perfilamento.
                </li>
              </ul>
            </section>

            <section id="com-quem-compartilhamos">
              <h2>
                <span className="num">5.</span>Com quem compartilhamos
              </h2>
              <ul>
                <li>
                  <strong>Bancos e instituições financeiras parceiras</strong> — este é o
                  compartilhamento central do serviço: sem ele não é possível fazer a
                  pré-qualificação nem encaminhar sua solicitação de crédito;
                </li>
                <li>
                  <strong>Operadores de tecnologia:</strong> Supabase (banco de dados e
                  armazenamento) e Vercel (hospedagem do site), que processam os dados em nosso
                  nome, sob instrução nossa;
                </li>
                <li>
                  <strong>Autoridades públicas</strong>, quando houver exigência legal ou ordem
                  de autoridade competente.
                </li>
              </ul>
              <p>
                Não vendemos dados pessoais e não os cedemos para publicidade de terceiros, em
                nenhuma hipótese.
              </p>
            </section>

            <section id="transferencia-internacional">
              <h2>
                <span className="num">6.</span>Transferência internacional
              </h2>
              <p>
                Seus dados são armazenados em servidores localizados nos <strong>Estados
                Unidos</strong> (Supabase, região us-west-2, e Vercel), na forma do art. 33 da
                LGPD. Essa transferência ocorre exclusivamente para viabilizar a execução do
                serviço — hospedar o site e armazenar as informações que você envia — e os
                fornecedores contratados são vinculados por cláusulas contratuais de proteção de
                dados equivalentes às exigidas pela legislação brasileira.
              </p>
            </section>

            <section id="por-quanto-tempo-guardamos">
              <h2>
                <span className="num">7.</span>Por quanto tempo guardamos
              </h2>
              <p>
                Guardamos seus dados por {RETENCAO_ANOS} anos contados do último contato, prazo
                alinhado à prescrição civil e à guarda de registros de operações de crédito.
                Depois desse período, os dados são excluídos ou anonimizados. Quando uma norma
                específica exigir prazo de guarda maior — por exemplo, obrigações regulatórias do
                setor financeiro — esse prazo maior prevalece.
              </p>
            </section>

            <section id="seus-direitos">
              <h2>
                <span className="num">8.</span>Seus direitos
              </h2>
              <p>Conforme o art. 18 da LGPD, você tem direito a:</p>
              <ul>
                <li>Confirmação da existência de tratamento dos seus dados;</li>
                <li>Acesso aos seus dados;</li>
                <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
                <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos;</li>
                <li>Portabilidade dos seus dados a outro fornecedor de serviço;</li>
                <li>Eliminação dos dados tratados com base no seu consentimento;</li>
                <li>Informação sobre com quem compartilhamos seus dados;</li>
                <li>Informação sobre a possibilidade de não consentir e as consequências de negar o consentimento;</li>
                <li>Revogação do consentimento, a qualquer momento.</li>
              </ul>
              <p>
                Para exercer qualquer um desses direitos, escreva para{" "}
                <a href={`mailto:${EMAIL_LGPD}`}>{EMAIL_LGPD}</a>. Respondemos em até 15 dias.
              </p>
            </section>

            <section id="como-revogar-o-consentimento">
              <h2>
                <span className="num">9.</span>Como revogar o consentimento
              </h2>
              <p>
                Você pode revogar seu consentimento a qualquer momento, sem custo, escrevendo
                para <a href={`mailto:${EMAIL_LGPD}`}>{EMAIL_LGPD}</a>. É importante entender a
                consequência com honestidade: sem o consentimento, não é possível seguir com a
                pré-qualificação de crédito nem com o encaminhamento da sua solicitação ao banco.
                A revogação não desfaz os tratamentos já realizados de forma lícita antes dela.
              </p>
            </section>

            <section id="seguranca">
              <h2>
                <span className="num">10.</span>Segurança
              </h2>
              <p>
                Protegemos seus dados com tráfego cifrado (HTTPS) em todo o site, acesso
                restrito e autenticado ao painel administrativo, regras de acesso por linha no
                banco de dados (RLS) e limite de tentativas por IP no formulário de envio. Nenhum
                sistema é absolutamente seguro, mas trabalhamos para reduzir os riscos ao mínimo
                razoável.
              </p>
            </section>

            <section id="cookies-e-rastreamento">
              <h2>
                <span className="num">11.</span>Cookies e rastreamento
              </h2>
              <p>
                O site público <strong>não usa cookies de rastreamento</strong>, não roda Google
                Analytics, Meta Pixel nem qualquer ferramenta de perfilamento de terceiros. Os
                vídeos incorporados nas páginas usam o domínio youtube-nocookie.com, justamente
                para não carregar cookies do YouTube. Cookies existem apenas na área
                administrativa restrita, e servem unicamente para manter a sessão de quem
                administra o site. É por isso que este site não exibe banner de cookies — não há
                rastreamento para consentir.
              </p>
            </section>

            <section id="criancas-e-adolescentes">
              <h2>
                <span className="num">12.</span>Crianças e adolescentes
              </h2>
              <p>
                Este site e os serviços oferecidos são dirigidos a maiores de 18 anos. Não
                coletamos intencionalmente dados pessoais de crianças ou adolescentes.
              </p>
            </section>

            <section id="alteracoes-nesta-politica">
              <h2>
                <span className="num">13.</span>Alterações nesta política
              </h2>
              <p>
                A versão vigente desta política é sempre a publicada nesta página, com a data de
                atualização indicada no topo. Mudanças relevantes serão comunicadas a quem tiver
                contato ativo conosco.
              </p>
            </section>

            <section id="fale-com-a-gente">
              <h2>
                <span className="num">14.</span>Fale com a gente
              </h2>
              <p>
                Dúvidas sobre esta política ou sobre o tratamento dos seus dados podem ser
                enviadas para <a href={`mailto:${EMAIL_LGPD}`}>{EMAIL_LGPD}</a>. Você também pode
                recorrer à Autoridade Nacional de Proteção de Dados (ANPD).
              </p>

              <div className="legal-cross">
                <a href="/termos-de-uso/">Ler também os Termos de Uso →</a>
              </div>
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
