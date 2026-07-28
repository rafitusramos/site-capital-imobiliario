import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getImovelBySlug,
  getImoveisPublicados,
  getImoveisRelacionados,
  getTiposEFases,
} from "@/lib/queries/imoveis";
import { Carrossel } from "@/components/imoveis/Carrossel";
import { GaleriaPlantas } from "@/components/imoveis/GaleriaPlantas";
import { LeadImovelModal } from "@/components/imoveis/LeadImovelModal";
import { ImovelCard } from "@/components/imoveis/ImovelCard";
import { obterIcone } from "@/components/imoveis/icones";
import {
  extrairIdYoutube,
  formatarFaixaArea,
  formatarFaixaDormitorios,
  formatarFaixaVagas,
  formatarPrecoAPartir,
} from "@/lib/imoveis/formato";
import { SITE_URL } from "@/lib/site";

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

export async function generateStaticParams() {
  const imoveis = await getImoveisPublicados();
  return imoveis.map((imovel) => ({ slug: imovel.slug }));
}

export async function generateMetadata({ params }: PaginaImovelProps): Promise<Metadata> {
  const { slug } = await params;
  const imovel = await getImovelBySlug(slug);
  if (!imovel) return {};

  return {
    title: imovel.seo_title ?? imovel.titulo,
    description: imovel.seo_description ?? imovel.descricao_breve ?? undefined,
    alternates: { canonical: `/imoveis/${imovel.slug}/` },
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

  const capa = imagensEmpreendimento[0]?.url ?? imovel.imagens[0]?.url ?? null;
  const local = [imovel.bairro, imovel.cidade].filter(Boolean).join(", ");

  const area = formatarFaixaArea(imovel.area_min, imovel.area_max);
  const dormitorios = formatarFaixaDormitorios(imovel.dormitorios_min, imovel.dormitorios_max);
  const vagas = formatarFaixaVagas(imovel.vagas_min, imovel.vagas_max);
  // "Sob consulta" tem precedência sobre o valor: quando marcado no cadastro, o
  // preço não aparece em lugar nenhum da página.
  const precoFormatado = imovel.valor_sob_consulta
    ? null
    : formatarPrecoAPartir(imovel.valor_a_partir_de);
  const idVideo = extrairIdYoutube(imovel.video_youtube_url);
  const enderecoMapa = imovel.endereco || local || imovel.titulo;

  const IconeArea = obterIcone("area");
  const IconeDormitorio = obterIcone("dormitorio");
  const IconeVaga = obterIcone("vaga");

  const indiceFaseAtual = fases.findIndex((fase) => fase.slug === imovel.fase.slug);

  // Teto de preço e nº de ofertas saem das tipologias — o Search Console avisa
  // quando um AggregateOffer traz só lowPrice.
  const precosTipologias = imovel.tipologias
    .map((tipologia) => tipologia.valor_a_partir_de)
    .filter((valor): valor is number => typeof valor === "number");
  const maiorPreco = precosTipologias.length > 0 ? Math.max(...precosTipologias) : null;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: imovel.titulo,
    description: imovel.seo_description ?? imovel.descricao_breve ?? undefined,
    image: urlAbsoluta(capa),
    brand: imovel.construtora ? { "@type": "Organization", name: imovel.construtora } : undefined,
    // Preço sob consulta não vai para o JSON-LD: anunciar um valor que a página
    // não mostra seria inconsistente para o Google.
    offers: imovel.valor_a_partir_de && !imovel.valor_sob_consulta
      ? {
          "@type": "AggregateOffer",
          lowPrice: imovel.valor_a_partir_de,
          // highPrice só entra com dado real e acima do piso: um teto menor que
          // o piso reprova o rich result.
          ...(maiorPreco !== null && maiorPreco > imovel.valor_a_partir_de
            ? { highPrice: maiorPreco }
            : {}),
          ...(imovel.tipologias.length > 0 ? { offerCount: imovel.tipologias.length } : {}),
          priceCurrency: "BRL",
          availability: "https://schema.org/InStock",
        }
      : undefined,
  };

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}

      <div className="im-lp-com-barra">
        {/* 1 + 2. Hero (capa, nome, localização, preço, CTA) e fatos rápidos */}
        <header className="hero im-hero" id="topo">
          {capa ? (
            /* Elemento LCP da página: <img> real (e não background-image) para o
               browser poder priorizar o download e para aceitar srcset depois.
               O overlay .hero::after do lp.css pinta por cima e preserva o
               contraste do texto. */
            // eslint-disable-next-line @next/next/no-img-element
            <img className="im-hero-capa" src={capa} alt="" fetchPriority="high" />
          ) : null}
          <div className="wrap">
            <span className="im-badge-fase im-badge-fase--inline" data-fase={imovel.fase.slug}>
              {imovel.fase.nome}
            </span>
            <h1 className="reveal d1">{imovel.titulo}</h1>
            {local ? (
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
              {imovel.previsao_entrega ? (
                <span className="im-fato">Entrega prevista: {imovel.previsao_entrega}</span>
              ) : null}
            </div>

            {imovel.valor_sob_consulta ? (
              <div className="im-hero-preco reveal d3">Preço: Sob consulta</div>
            ) : precoFormatado ? (
              <div className="im-hero-preco reveal d3">
                <small>A partir de</small>
                {precoFormatado}
              </div>
            ) : null}

            <button type="button" className="cta reveal d3" data-abrir-lead="Solicite informações">
              Solicite informações
            </button>
          </div>
        </header>

        {/* 3. O projeto */}
        {imovel.descricao_completa ? (
          <section id="projeto">
            <div className="wrap">
              <div className="eyebrow reveal">O projeto</div>
              <p className="im-projeto reveal d2">{imovel.descricao_completa}</p>
            </div>
          </section>
        ) : null}

        {/* 3.1 Vídeo do empreendimento */}
        {idVideo ? (
          <section id="video">
            <div className="wrap">
              <div className="eyebrow reveal">Vídeo</div>
              <div className="im-video reveal d2">
                {/* O YouTube não permite escolher botões individualmente: ou a
                    barra inteira ou nenhuma (controls=0). Estes parâmetros são
                    o mínimo alcançável sem construir um player próprio. */}
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${idVideo}?rel=0&modestbranding=1&fs=0&disablekb=1&iv_load_policy=3`}
                  title={`Vídeo do ${imovel.titulo}`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </div>
          </section>
        ) : null}

        {/* 4. Galeria do empreendimento */}
        {imagensEmpreendimento.length > 0 ? (
          <section id="galeria">
            <div className="wrap">
              <div className="eyebrow reveal">Galeria</div>
            </div>
            <Carrossel
              imagens={imagensEmpreendimento.map((img) => ({ url: img.url, ambiente: img.ambiente }))}
              ariaLabel={`Galeria do empreendimento ${imovel.titulo}`}
              primeiraEager
            />
          </section>
        ) : null}

        {/* 5. Fase da obra */}
        <section id="fase-obra">
          <div className="wrap">
            <div className="eyebrow reveal">Fase da obra</div>
            <ol className="im-fases" aria-label="Linha do tempo da obra">
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
        {diferenciaisLazer.length > 0 ? (
          <section id="lazer">
            <div className="wrap">
              <div className="eyebrow reveal">Lazer e convívio</div>
              <ul className="im-lazer">
                {diferenciaisLazer.map((item) => {
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
        ) : null}

        {/* 7. As unidades */}
        {imovel.descricao_unidades || imagensDecorado.length > 0 ? (
          <section id="unidades">
            <div className="wrap">
              <div className="eyebrow reveal">As unidades</div>
              {imovel.descricao_unidades ? (
                <p className="im-projeto reveal d2">{imovel.descricao_unidades}</p>
              ) : null}
            </div>
            {imagensDecorado.length > 0 ? (
              <Carrossel
                imagens={imagensDecorado.map((img) => ({ url: img.url, ambiente: img.ambiente }))}
                ariaLabel={`Decorado das unidades do ${imovel.titulo}`}
              />
            ) : null}
          </section>
        ) : null}

        {/* 8. Plantas e quadro de áreas */}
        {imagensPlanta.length > 0 || imovel.tipologias.length > 0 ? (
          <section id="plantas">
            <div className="wrap">
              <div className="eyebrow reveal">Plantas e quadro de áreas</div>
            </div>
            {imagensPlanta.length > 0 ? (
              <GaleriaPlantas
                imagens={imagensPlanta.map((img) => ({ url: img.url, ambiente: img.ambiente }))}
                ariaLabel={`Plantas do ${imovel.titulo}`}
              />
            ) : null}
            {imovel.tipologias.length > 0 ? (
              <div className="wrap">
                <div className="tab-scroll" aria-label="Quadro de áreas">
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
        {diferenciaisGerais.length > 0 ? (
          <section id="diferenciais">
            <div className="wrap">
              <div className="eyebrow reveal">Diferenciais</div>
              <div className="im-diferenciais">
                {diferenciaisGerais.map((item) => {
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
        ) : null}

        {/* 10. Localização */}
        {imovel.endereco || local ? (
          <section id="localizacao">
            <div className="wrap">
              <div className="eyebrow reveal">Localização</div>
              <div className="im-localizacao">
                {imovel.endereco ? <p className="endereco">{imovel.endereco}</p> : null}
                {/* Prévia embutida sem chave de API (embed clássico do Maps). O
                    iframe não recebe cliques; o link por cima abre o mapa cheio
                    numa aba nova, para o visitante não perder a LP. */}
                <div className="im-mapa">
                  <iframe
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(
                      enderecoMapa,
                    )}&z=15&output=embed`}
                    title={`Mapa da localização do ${imovel.titulo}`}
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
                    aria-label={`Abrir a localização do ${imovel.titulo} no Google Maps, em uma nova aba`}
                  >
                    <span>Abrir no Google Maps</span>
                  </a>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* 11. Realização */}
        {imovel.construtora ? (
          <section id="realizacao">
            <div className="wrap">
              <div className="eyebrow reveal">Realização</div>
              <div className="im-realizacao-centro reveal d1">
                {imovel.construtora_logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imovel.construtora_logo_url} alt={imovel.construtora} loading="lazy" />
                ) : null}
                <span>{imovel.construtora}</span>
              </div>
            </div>
          </section>
        ) : null}

        {/* 12. FAQ */}
        {imovel.faqs.length > 0 ? (
          <section id="faq">
            <div className="wrap">
              <div className="eyebrow reveal">Perguntas frequentes</div>
              {imovel.faqs.map((faq) => (
                <details key={faq.id}>
                  <summary>{faq.pergunta}</summary>
                  <div className="resp">{faq.resposta}</div>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {/* 13. CTA final + outros empreendimentos */}
        <section id="cta-final">
          <div className="wrap">
            <div className="artigo-cta">
              <h3>Quer saber mais sobre o {imovel.titulo}?</h3>
              <div className="im-cta-final-acoes">
                <button
                  type="button"
                  className="cta"
                  data-abrir-lead={`Quero saber mais sobre o ${imovel.titulo}`}
                >
                  Quero saber mais
                </button>
                <a className="cta cta-secundaria" href="/financiamento/#simulador">
                  Simular financiamento
                </a>
              </div>
            </div>
          </div>
        </section>

        {relacionados.length > 0 ? (
          <section id="outros-empreendimentos">
            <div className="wrap">
              <div className="eyebrow reveal">Continue pesquisando</div>
              <div className="im-grid">
                {relacionados.map((relacionado) => (
                  <ImovelCard key={relacionado.id} imovel={relacionado} />
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </div>

      {/* Barra de CTA fixa em mobile */}
      <div className="im-barra-cta">
        <div className="preco">
          {precoFormatado ? <small>A partir de</small> : null}
          <strong>{precoFormatado ?? "Preço: Sob consulta"}</strong>
        </div>
        <button type="button" className="cta" data-abrir-lead="Fale com um corretor agora">
          Fale conosco
        </button>
      </div>

      <LeadImovelModal imovelId={imovel.id} imovelTitulo={imovel.titulo} />
    </>
  );
}
