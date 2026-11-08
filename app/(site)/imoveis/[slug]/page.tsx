import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getImovelBySlug,
  getImoveisPublicados,
  getImoveisRelacionados,
  getTiposEFases,
  type ImovelCompleto,
  type ImovelComCapa,
} from "@/lib/queries/imoveis";
import Image from "next/image";
import { ehImagemOtimizavel } from "@/lib/imoveis/imagem-otimizada";
import { Carrossel } from "@/components/imoveis/Carrossel";
import { GaleriaPlantas } from "@/components/imoveis/GaleriaPlantas";
import { LeadImovelModal } from "@/components/imoveis/LeadImovelModal";
import { ImovelCard } from "@/components/imoveis/ImovelCard";
import { obterIcone } from "@/components/imoveis/icones";
import { extrairIdYoutube, formatarPrecoAPartir } from "@/lib/imoveis/formato";
import {
  custosMensaisDoPronto,
  fatosDoImovel,
  fichaDoPronto,
  precoDoImovel,
  valorParaFiltro,
} from "@/lib/imoveis/ficha";
import { capaDaPagina } from "@/lib/imoveis/capa";
import {
  montarOfferSchema,
  montarRealEstateListingSchema,
  montarVideoObjectSchema,
} from "@/lib/imoveis/schema";
import {
  altDoImovel,
  contextoDoImovel,
  descricaoDoImovel,
  tituloDoImovel,
} from "@/lib/imoveis/seo";
import { SITE_URL } from "@/lib/site";
import { imagemOg, SITE_NOME } from "@/lib/og";

export const revalidate = 3600;

type PaginaImovelProps = {
  params: Promise<{ slug: string }>;
};

// Ícones da timeline de fase — deliberadamente fora do catálogo de
// components/imoveis/icones.tsx (aquele é o catálogo de amenidades/fatos
// do imóvel; a timeline usa uma semântica própria: bandeira → megafone →
// guindaste → chave). Cor sozinha nunca marca a fase atual (regra de
// acessibilidade do plano) — sempre cor + ícone + texto.
const ICONE_FASE: Record<string, React.ReactNode> = {
  pre_lancamento: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17.5V3" />
      <path d="M5 3.5h9l-2 3 2 3H5" />
    </svg>
  ),
  lancamento: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 8.5 13 4v12L2.5 11.5v-3z" />
      <path d="M13 6.5c2 .4 3.5 1.8 3.5 3.5s-1.5 3.1-3.5 3.5" />
      <path d="M5 11.5V15a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2.3" />
    </svg>
  ),
  em_construcao: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 17.5h15" />
      <path d="M4.5 17.5V9l6-4.5 6 4.5v8.5" />
      <path d="M8 17.5v-4h4v4" />
    </svg>
  ),
  pronto: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M6.8 10.2 9 12.5l4.2-5" />
    </svg>
  ),
};

function urlAbsoluta(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith("http") ? url : `${SITE_URL}${url}`;
}

/** Capa do hero e do og:image (lançamento: fachada; pronto: grupo escolhido em capa_origem). */
function capaDoImovel(imovel: ImovelCompleto): string | null {
  return capaDaPagina(imovel.imagens, imovel.modalidade, imovel.capa_origem);
}

type Diferenciais = ImovelCompleto["diferenciais"];

function SecaoVideo({ idVideo, titulo }: { idVideo: string | null; titulo: string }) {
  if (!idVideo) return null;
  return (
    <section id="video">
      <div className="wrap">
        <h2 className="eyebrow reveal">Vídeo</h2>
        <div className="im-video reveal d2">
          {/* O YouTube não permite escolher botões individualmente: ou a
              barra inteira ou nenhuma (controls=0). Estes parâmetros são
              o mínimo alcançável sem construir um player próprio. */}
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${idVideo}?rel=0&modestbranding=1&fs=0&disablekb=1&iv_load_policy=3`}
            title={`Vídeo do ${titulo}`}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      </div>
    </section>
  );
}

function SecaoLazer({ itens }: { itens: Diferenciais }) {
  if (itens.length === 0) return null;
  return (
    <section id="lazer">
      <div className="wrap">
        <h2 className="eyebrow reveal">Lazer e convívio</h2>
        <ul className="im-lazer reveal d2">
          {itens.map((item) => {
            const Icone = obterIcone(item.icone);
            return (
              <li key={item.id} className="im-lazer-item">
                <Icone aria-hidden="true" /> {item.nome}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function SecaoDiferenciais({ itens }: { itens: Diferenciais }) {
  if (itens.length === 0) return null;
  return (
    <section id="diferenciais">
      <div className="wrap">
        <h2 className="eyebrow reveal">Diferenciais</h2>
        <div className="im-diferenciais reveal d2">
          {itens.map((item) => {
            const Icone = obterIcone(item.icone);
            return (
              <div key={item.id} className="im-diferencial">
                <Icone aria-hidden="true" />
                <span>{item.nome}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SecaoLocalizacao({
  endereco,
  enderecoMapa,
  titulo,
  mostrar,
}: {
  endereco: string | null;
  enderecoMapa: string;
  titulo: string;
  mostrar: boolean;
}) {
  if (!mostrar) return null;
  return (
    <section id="localizacao">
      <div className="wrap">
        <h2 className="eyebrow reveal">Localização</h2>
        <div className="im-localizacao reveal d2">
          {endereco ? <p className="endereco">{endereco}</p> : null}
          {/* Prévia embutida sem chave de API (embed clássico do Maps). O
              iframe não recebe cliques; o link por cima abre o mapa cheio
              numa aba nova, para o visitante não perder a LP. */}
          <div className="im-mapa">
            <iframe
              src={`https://maps.google.com/maps?q=${encodeURIComponent(enderecoMapa)}&z=15&output=embed`}
              title={`Mapa da localização do ${titulo}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <a
              className="im-mapa-link"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                enderecoMapa,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir a localização do ${titulo} no Google Maps, em uma nova aba`}
            >
              <span>Abrir no Google Maps</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function SecaoFaq({ faqs }: { faqs: ImovelCompleto["faqs"] }) {
  if (faqs.length === 0) return null;
  return (
    <section id="faq">
      <div className="wrap">
        <h2 className="eyebrow reveal">Perguntas frequentes</h2>
        {faqs.map((faq) => (
          <details key={faq.id} className="reveal d2">
            <summary>{faq.pergunta}</summary>
            <div className="resp">{faq.resposta}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

function SecaoCtaFinal({
  pronto,
  titulo,
  hrefSimulador,
}: {
  pronto: boolean;
  titulo: string;
  hrefSimulador: string;
}) {
  return (
    <section id="cta-final">
      <div className="wrap">
        <div className="artigo-cta reveal">
          <h3>Quer saber mais sobre {pronto ? "este imóvel" : `o ${titulo}`}?</h3>
          <div className="im-cta-final-acoes">
            <button
              type="button"
              className="cta"
              data-abrir-lead={`Quero saber mais sobre o ${titulo}`}
            >
              Quero saber mais
            </button>
            <a className="cta cta-secundaria" href={hrefSimulador}>
              Simular financiamento
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function SecaoOutros({ relacionados, pronto }: { relacionados: ImovelComCapa[]; pronto: boolean }) {
  if (relacionados.length === 0) return null;
  return (
    <section id={pronto ? "outros-imoveis" : "outros-empreendimentos"}>
      <div className="wrap">
        <h2 className="eyebrow reveal">{pronto ? "Outros imóveis" : "Continue pesquisando"}</h2>
        {/* Sem reveal na grade: quem anima é cada `ImovelCard`, para os
            cards entrarem conforme aparecem em vez de a grade inteira
            surgir de uma vez quando o topo dela toca a viewport. */}
        <div className="im-grid">
          {relacionados.map((relacionado) => (
            <ImovelCard key={relacionado.id} imovel={relacionado} />
          ))}
        </div>
      </div>
    </section>
  );
}


export async function generateStaticParams() {
  const imoveis = await getImoveisPublicados();
  return imoveis.map((imovel) => ({ slug: imovel.slug }));
}

export async function generateMetadata({ params }: PaginaImovelProps): Promise<Metadata> {
  const { slug } = await params;
  const imovel = await getImovelBySlug(slug);
  if (!imovel) return {};

  // `seo_title`/`seo_description` mandam quando existem; sem elas o texto é
  // montado do cadastro em vez de cair no título cru (ou em description
  // nenhuma). Ver lib/imoveis/seo.ts.
  const titulo = tituloDoImovel(imovel);
  const descricao = descricaoDoImovel(imovel);
  const caminho = `/imoveis/${imovel.slug}/`;
  const imagem = imagemOg(capaDoImovel(imovel), altDoImovel(imovel));

  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: caminho },
    openGraph: {
      type: "website",
      siteName: SITE_NOME,
      title: titulo,
      description: descricao,
      url: caminho,
      images: [imagem],
      locale: "pt_BR",
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description: descricao,
      images: [imagem.url],
    },
  };
}

export default async function PaginaImovel({ params }: PaginaImovelProps) {
  const { slug } = await params;
  const imovel = await getImovelBySlug(slug);
  if (!imovel) notFound();

  const relacionados = imovel.cidade
    ? await getImoveisRelacionados(imovel.id, imovel.cidade, 3)
    : [];
  // Jornada completa do empreendimento: todas as fases ativas do banco, na
  // ordem cadastrada — não só as "em uso" entre os imóveis publicados (essa
  // regra vale para os chips de filtro da home, não para a timeline da LP).
  const { fases } = await getTiposEFases();

  const imagensEmpreendimento = imovel.imagens.filter((img) => img.grupo === "empreendimento");
  const imagensDecorado = imovel.imagens.filter((img) => img.grupo === "decorado");
  const imagensPlanta = imovel.imagens.filter((img) => img.grupo === "planta");

  const diferenciaisLazer = imovel.diferenciais.filter((d) => d.grupo === "lazer");
  const diferenciaisGerais = imovel.diferenciais.filter((d) => d.grupo === "diferencial");

  // Mesma capa que vai para o og:image, para o preview do link bater com o hero.
  const capa = capaDoImovel(imovel);
  const local = [imovel.bairro, imovel.cidade].filter(Boolean).join(", ");

  // Duas modalidades, dois layouts: lançamento tem faixas, fase de obra,
  // plantas e realização; imóvel pronto tem a ficha de uma unidade só.
  const pronto = imovel.modalidade === "pronto";
  const { area, dormitorios, vagas } = fatosDoImovel(imovel);
  const ficha = pronto ? fichaDoPronto(imovel) : [];
  const custos = pronto ? custosMensaisDoPronto(imovel) : [];
  const descricaoUnidade = pronto ? (imovel.descricao_unidade?.trim() ?? "") : "";
  // "Sob consulta" tem precedência sobre o valor: quando marcado no cadastro, o
  // preço não aparece em lugar nenhum da página.
  const preco = precoDoImovel(imovel);
  const valorReferencia = valorParaFiltro(imovel);
  // Leva o valor do imóvel para o simulador de financiamento já preenchido.
  // Usa a mesma condição do preço na página: "sob consulta" tem precedência
  // sobre o valor, então um imóvel marcado assim manda o visitante ao
  // simulador em branco em vez de revelar por query string o preço que a LP
  // esconde.
  const hrefSimulador = valorReferencia
    ? `/financiamento/?valor=${Math.round(valorReferencia)}#simulador`
    : "/financiamento/#simulador";

  const idVideo = extrairIdYoutube(imovel.video_youtube_url);
  // Imóvel pronto é residência de alguém: o endereço exato só aparece (texto e
  // mapa) quando o cadastro libera em `exibir_endereco`. Sem isso o mapa fica
  // no nível do bairro/cidade.
  const enderecoPublico = pronto && !imovel.exibir_endereco ? null : imovel.endereco;
  const enderecoMapa = enderecoPublico || local || imovel.titulo;

  const IconeArea = obterIcone("area");
  const IconeDormitorio = obterIcone("dormitorio");
  const IconeVaga = obterIcone("vaga");

  const indiceFaseAtual = fases.findIndex((fase) => fase.slug === imovel.fase.slug);

  // "Gran VIC Niágara, Vinhedo" — entra no `alt` de toda foto de galeria.
  const contexto = contextoDoImovel(imovel);

  const offers = montarOfferSchema(imovel);

  // Sem preço publicável não existe `Product` válido: o Google exige offers,
  // review ou aggregateRating, e imóvel não tem os dois últimos. Emitir
  // `Product` mesmo assim é erro crítico no teste de resultados aprimorados —
  // pior que não marcar, porque põe em dúvida o resto da marcação da página.
  // Nesse caso a página cai para `Residence`, que descreve a mesma coisa, não
  // exige oferta e valida limpo. Não é `RealEstateListing`: essa é camada
  // futura, decidida em docs/handoff-schema-offers-imoveis.md.
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": offers ? "Product" : "Residence",
    name: imovel.titulo,
    description: imovel.seo_description ?? imovel.descricao_breve ?? undefined,
    image: urlAbsoluta(capa),
    brand:
      !pronto && imovel.construtora
        ? { "@type": "Organization", name: imovel.construtora }
        : undefined,
    ...(offers ? { offers } : {}),
  };

  // Camada complementar do imóvel pronto: nunca substitui o Product acima.
  const listingJsonLd = montarRealEstateListingSchema({
    modalidade: imovel.modalidade,
    slug: imovel.slug,
    titulo: imovel.titulo,
    descricao: descricaoDoImovel(imovel),
    imagem: urlAbsoluta(capa),
    criadoEm: imovel.created_at,
    offers,
  });

  // Só sai com todos os campos obrigatórios (inclui `video_data_publicacao`).
  const videoJsonLd = montarVideoObjectSchema({
    titulo: imovel.titulo,
    descricao: descricaoDoImovel(imovel),
    urlVideo: imovel.video_youtube_url,
    dataPublicacao: imovel.video_data_publicacao,
  });

  const faqJsonLd =
    imovel.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: imovel.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.pergunta,
            acceptedAnswer: { "@type": "Answer", text: faq.resposta },
          })),
        }
      : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Início",
        item: `${SITE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Imóveis",
        item: `${SITE_URL}/imoveis/`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: imovel.titulo,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      {listingJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(listingJsonLd) }}
        />
      ) : null}
      {videoJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }}
        />
      ) : null}
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="im-lp-com-barra">
        {/* 1 + 2. Hero (capa, nome, localização, preço, CTA) e fatos rápidos */}
        <header className="hero im-hero" id="topo">
          {capa ? (
            /* Elemento LCP da página: <img> real (e não background-image) para o
               browser poder priorizar o download e para aceitar srcset depois.
               O overlay .hero::after do lp.css pinta por cima e preserva o
               contraste do texto. */
            <Image
              className="im-hero-capa"
              src={capa}
              alt={altDoImovel(imovel)}
              fill
              sizes="100vw"
              priority
              unoptimized={!ehImagemOtimizavel(capa)}
            />
          ) : null}
          <div className="wrap">
            <span className="im-badge-fase im-badge-fase--inline" data-fase={imovel.fase.slug}>
              {imovel.fase.nome}
            </span>
            <h1 className="reveal d1">{imovel.titulo}</h1>
            {pronto ? (
              <p className="sub reveal d2">
                {[imovel.nome_condominio, local].filter(Boolean).join(" — ")}
              </p>
            ) : local ? (
              <p className="sub reveal d2">
                {imovel.fase.nome} em {local}
              </p>
            ) : null}

            <div className="im-hero-fatos reveal d2">
              {area ? (
                <span className="im-fato">
                  <IconeArea aria-hidden="true" /> {area}
                </span>
              ) : null}
              {dormitorios ? (
                <span className="im-fato">
                  <IconeDormitorio aria-hidden="true" /> {dormitorios}
                </span>
              ) : null}
              {vagas ? (
                <span className="im-fato">
                  <IconeVaga aria-hidden="true" /> {vagas}
                </span>
              ) : null}
              {!pronto && imovel.previsao_entrega ? (
                <span className="im-fato">Entrega prevista: {imovel.previsao_entrega}</span>
              ) : null}
            </div>

            {imovel.valor_sob_consulta ? (
              <div className="im-hero-preco reveal d3">Preço: Sob consulta</div>
            ) : preco ? (
              <div className="im-hero-preco reveal d3">
                {preco.rotulo ? <small>{preco.rotulo}</small> : null}
                {preco.valor}
              </div>
            ) : null}

            {custos.length > 0 ? (
              <ul className="im-hero-custos reveal d3" aria-label="Custos mensais">
                {custos.map((item) => (
                  <li key={item.rotulo}>
                    <span>{item.rotulo}</span> {item.valor}
                  </li>
                ))}
              </ul>
            ) : null}

            <button type="button" className="cta reveal d3" data-abrir-lead="Solicite informações">
              Solicite informações
            </button>
          </div>
        </header>

        {pronto ? (
          <>
            {/* Imóvel pronto: vídeo, unidade, condomínio, lazer, diferenciais, localização. */}
            <SecaoVideo idVideo={idVideo} titulo={imovel.titulo} />

            {imagensDecorado.length > 0 ? (
              <section id="fotos-unidade">
                <div className="wrap">
                  <h2 className="eyebrow reveal">Fotos da unidade</h2>
                </div>
                <div className="reveal d2">
                  <Carrossel
                    imagens={imagensDecorado.map((img) => ({ url: img.url, ambiente: img.ambiente }))}
                    ariaLabel={`Fotos da unidade de ${imovel.titulo}`}
                    contexto={contexto}
                    primeiraEager
                  />
                </div>
              </section>
            ) : null}

            {descricaoUnidade || ficha.length > 0 ? (
              <section id="descricao-unidade">
                <div className="wrap">
                  <h2 className="eyebrow reveal">Descrição da unidade</h2>
                  {descricaoUnidade ? (
                    <p className="im-projeto reveal d2">{descricaoUnidade}</p>
                  ) : null}
                  {ficha.length > 0 ? (
                    <dl className="im-ficha reveal d2" aria-label="Ficha do imóvel">
                      {ficha.map((item) => (
                        <div key={item.rotulo} className="im-ficha-item">
                          <dt>{item.rotulo}</dt>
                          <dd>{item.valor}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>
              </section>
            ) : null}

            {imagensEmpreendimento.length > 0 ? (
              <section id="fotos-condominio">
                <div className="wrap">
                  <h2 className="eyebrow reveal">Fotos do condomínio</h2>
                </div>
                <div className="reveal d2">
                  <Carrossel
                    imagens={imagensEmpreendimento.map((img) => ({
                      url: img.url,
                      ambiente: img.ambiente,
                    }))}
                    ariaLabel={`Fotos do condomínio de ${imovel.titulo}`}
                    contexto={contexto}
                    primeiraEager={imagensDecorado.length === 0}
                  />
                </div>
              </section>
            ) : null}

            {imovel.descricao_completa ? (
              <section id="condominio">
                <div className="wrap">
                  <h2 className="eyebrow reveal">O condomínio</h2>
                  <p className="im-projeto reveal d2">{imovel.descricao_completa}</p>
                </div>
              </section>
            ) : null}

            <SecaoLazer itens={diferenciaisLazer} />
            <SecaoDiferenciais itens={diferenciaisGerais} />
            <SecaoLocalizacao
              endereco={enderecoPublico}
              enderecoMapa={enderecoMapa}
              titulo={imovel.titulo}
              mostrar={Boolean(enderecoPublico || local)}
            />
            <SecaoCtaFinal pronto titulo={imovel.titulo} hrefSimulador={hrefSimulador} />
            <SecaoOutros relacionados={relacionados} pronto />
            <SecaoFaq faqs={imovel.faqs} />
          </>
        ) : (
          <>
            {/* 3. O projeto */}
            {imovel.descricao_completa ? (
              <section id="projeto">
                <div className="wrap">
                  <h2 className="eyebrow reveal">O projeto</h2>
                  <p className="im-projeto reveal d2">{imovel.descricao_completa}</p>
                </div>
              </section>
            ) : null}

            {/* 3.1 Vídeo do empreendimento */}
            <SecaoVideo idVideo={idVideo} titulo={imovel.titulo} />

        {/* 4. Galeria do empreendimento */}
        {imagensEmpreendimento.length > 0 ? (
          <section id="galeria">
            <div className="wrap">
              <h2 className="eyebrow reveal">Galeria</h2>
            </div>
            {/* `Carrossel`, `GaleriaPlantas` e `ImovelCard` não recebem
                `className`; o reveal vem por um wrapper em vez de alargar a API
                dos três só por causa da animação. */}
            <div className="reveal d2">
              <Carrossel
                imagens={imagensEmpreendimento.map((img) => ({ url: img.url, ambiente: img.ambiente }))}
                ariaLabel={`Galeria do empreendimento ${imovel.titulo}`}
                contexto={contexto}
                primeiraEager
              />
            </div>
          </section>
        ) : null}

        {/* 5. Fase da obra (só lançamento) */}
        <section id="fase-obra">
          <div className="wrap">
            <h2 className="eyebrow reveal">Fase da obra</h2>
            <ol className="im-fases reveal d2" aria-label="Linha do tempo da obra">
              {fases.map((fase, indiceFase) => {
                const feita = indiceFase < indiceFaseAtual;
                const atual = fase.slug === imovel.fase.slug;
                return (
                  <li
                    key={fase.id}
                    className={`im-fase${feita ? " feita" : ""}`}
                    aria-current={atual ? "step" : undefined}
                  >
                    <span className="im-fase-marca">{ICONE_FASE[fase.slug]}</span>
                    <span className="im-fase-rotulo">{fase.nome}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

            {/* 6. Lazer e convívio */}
            <SecaoLazer itens={diferenciaisLazer} />

        {/* 7. As unidades */}
        {(imovel.descricao_unidades || imagensDecorado.length > 0) ? (
          <section id="unidades">
            <div className="wrap">
              <h2 className="eyebrow reveal">As unidades</h2>
              {imovel.descricao_unidades ? (
                <p className="im-projeto reveal d2">{imovel.descricao_unidades}</p>
              ) : null}
            </div>
            {imagensDecorado.length > 0 ? (
              <div className="reveal d3">
                <Carrossel
                  imagens={imagensDecorado.map((img) => ({ url: img.url, ambiente: img.ambiente }))}
                  ariaLabel={`Decorado das unidades do ${imovel.titulo}`}
                  contexto={contexto}
                />
              </div>
            ) : null}
          </section>
        ) : null}

        {/* 8. Plantas e quadro de áreas */}
        {(imagensPlanta.length > 0 || imovel.tipologias.length > 0) ? (
          <section id="plantas">
            <div className="wrap">
              <h2 className="eyebrow reveal">Plantas e quadro de áreas</h2>
            </div>
            {imagensPlanta.length > 0 ? (
              /* Só seguro porque `.visivel` agora zera o `will-change` (lp.css):
                 com ele ativo este wrapper viraria containing block e o
                 lightbox `position:fixed` das plantas pararia de cobrir a tela. */
              <div className="reveal d2">
                <GaleriaPlantas
                  imagens={imagensPlanta.map((img) => ({ url: img.url, ambiente: img.ambiente }))}
                  ariaLabel={`Plantas do ${imovel.titulo}`}
                  contexto={contexto}
                />
              </div>
            ) : null}
            {imovel.tipologias.length > 0 ? (
              <div className="wrap">
                <div className="tab-scroll reveal d3" aria-label="Quadro de áreas">
                  <table className="tabela">
                    <thead>
                      <tr>
                        <th scope="col">Tipologia</th>
                        <th scope="col">Área</th>
                        <th scope="col">Dorms / Suítes</th>
                        <th scope="col">Banheiros</th>
                        <th scope="col">Vagas</th>
                        <th scope="col">A partir de</th>
                      </tr>
                    </thead>
                    <tbody>
                      {imovel.tipologias.map((tipologia) => (
                        <tr key={tipologia.id}>
                          <td data-label="Tipologia">{tipologia.nome}</td>
                          <td data-label="Área">
                            <span className="mono-num">
                              {tipologia.area !== null ? `${tipologia.area} m²` : "—"}
                            </span>
                          </td>
                          <td data-label="Dorms / Suítes">
                            {tipologia.dormitorios ?? "—"}
                            {tipologia.suites ? (
                              <small>
                                {tipologia.suites} suíte{tipologia.suites > 1 ? "s" : ""}
                              </small>
                            ) : null}
                          </td>
                          <td data-label="Banheiros">{tipologia.banheiros ?? "—"}</td>
                          <td data-label="Vagas">{tipologia.vagas ?? "—"}</td>
                          {/* O quadro de áreas herda a marcação do empreendimento:
                              com "sob consulta" ligado, nenhuma tipologia mostra
                              preço. Aqui não repete "Preço:" porque a própria
                              coluna já se chama "A partir de". */}
                          <td data-label="A partir de">
                            {imovel.valor_sob_consulta ? (
                              "Sob consulta"
                            ) : (
                              <span className="mono-num">
                                {formatarPrecoAPartir(tipologia.valor_a_partir_de) ?? "—"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

            {/* 9. Diferenciais */}
            <SecaoDiferenciais itens={diferenciaisGerais} />

            {/* 10. Localização */}
            <SecaoLocalizacao
              endereco={enderecoPublico}
              enderecoMapa={enderecoMapa}
              titulo={imovel.titulo}
              mostrar={Boolean(enderecoPublico || local)}
            />

        {/* 11. Realização */}
        {imovel.construtora ? (
          <section id="realizacao">
            <div className="wrap">
              <h2 className="eyebrow reveal">Realização</h2>
              <div className="im-realizacao-centro reveal d1">
                {imovel.construtora_logo_url ? (
                  <img src={imovel.construtora_logo_url} alt={imovel.construtora} loading="lazy" />
                ) : null}
                <span>{imovel.construtora}</span>
              </div>
            </div>
          </section>
        ) : null}

            {/* 12. FAQ */}
            <SecaoFaq faqs={imovel.faqs} />

            {/* 13. CTA final + outros empreendimentos */}
            <SecaoCtaFinal pronto={false} titulo={imovel.titulo} hrefSimulador={hrefSimulador} />
            <SecaoOutros relacionados={relacionados} pronto={false} />
          </>
        )}
      </div>

      {/* Barra de CTA fixa em mobile */}
      <div className="im-barra-cta">
        <div className="preco">
          {preco?.rotulo ? <small>{preco.rotulo}</small> : null}
          <strong>{preco?.valor ?? "Preço: Sob consulta"}</strong>
        </div>
        <button type="button" className="cta" data-abrir-lead="Fale com um corretor agora">
          Fale conosco
        </button>
      </div>

      <LeadImovelModal imovelId={imovel.id} imovelTitulo={imovel.titulo} />
    </>
  );
}
