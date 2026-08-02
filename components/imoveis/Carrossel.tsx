"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";

export type ImagemCarrossel = { url: string; ambiente: string | null };

type CarrosselProps = {
  imagens: ImagemCarrossel[];
  /** Legenda de acessibilidade da região (ex.: "Galeria do empreendimento"). */
  ariaLabel: string;
  /** A primeira imagem do primeiro carrossel da página pode carregar eager (acima da dobra). */
  primeiraEager?: boolean;
  /**
   * Quando informado, clicar na imagem já centralizada a amplia (usado nas
   * plantas). Clicar numa lateral continua apenas centralizando-a.
   */
  aoAmpliar?: (indice: number) => void;
};

// `duration` do Embla é expresso na escala interna dele, não em ms: 25 é o
// padrão da lib e 0 faz o deslocamento ser instantâneo.
const DURACAO_PADRAO = 25;
const DURACAO_SEM_MOVIMENTO = 0;

/**
 * Carrossel com efeito de foco central (docs/carousel-spec.md), adaptado à
 * paleta e tipografia do site: Embla `align:"center"`, `dragFree:false`,
 * sem plugin de autoplay (autoplay em galeria de imóvel atrapalha e
 * conflita com prefers-reduced-motion — desvio consciente do spec original).
 *
 * Componente fino: só decide entre a foto única (sem Embla) e o carrossel de
 * verdade. Os hooks do Embla vivem em `CarrosselMultiplo` para nunca ficarem
 * depois de um return condicional.
 */
export function Carrossel({ imagens, ariaLabel, primeiraEager = false, aoAmpliar }: CarrosselProps) {
  if (imagens.length === 0) return null;

  if (imagens.length === 1) {
    const [imagem] = imagens;
    return (
      <figure className="im-carrossel-unica">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagem.url}
          alt={imagem.ambiente ?? ""}
          decoding="async"
          fetchPriority={primeiraEager ? "high" : "low"}
        />
        {/* aria-hidden: o `alt` da imagem já anuncia o ambiente, e sem isso o
            leitor de tela leria a mesma frase duas vezes seguidas. */}
        {imagem.ambiente ? (
          <figcaption className="im-carrossel-legenda" aria-hidden="true">
            <span>{imagem.ambiente}</span>
          </figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <CarrosselMultiplo
      imagens={imagens}
      ariaLabel={ariaLabel}
      primeiraEager={primeiraEager}
      aoAmpliar={aoAmpliar}
    />
  );
}

/**
 * O carrossel de verdade (2+ imagens), com Embla.
 *
 * `loop:false` e `containScroll:false`: medido no navegador que, com poucos
 * slides e pouca folga de viewport (ex.: 649px de viewport para 777px de
 * slides), `loop:true` faz o Embla travar a rolagem por completo — o
 * `transform` do trilho nunca muda e nenhum aviso aparece no console. O
 * Rafael autorizou abrir mão do loop infinito do spec original
 * (docs/carousel-spec.md) para resolver. Sem `containScroll`, todo slide
 * — inclusive o primeiro e o último — consegue chegar ao centro do
 * viewport, sobrando espaço vazio nas bordas quando necessário (comportamento
 * desejado, não um bug).
 */
function CarrosselMultiplo({ imagens, ariaLabel, primeiraEager, aoAmpliar }: CarrosselProps) {
  // O CSS já desliga a transição de escala/opacidade dos slides, mas o
  // deslocamento do próprio Embla continuaria animado — daí zerar `duration`.
  // Começa `false` para o servidor e o cliente renderizarem igual; o valor real
  // entra no efeito abaixo, e o hook do Embla re-inicializa ao ver a opção mudar.
  const [reduzirMovimento, setReduzirMovimento] = useState(false);

  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduzirMovimento(consulta.matches);
    const aoMudar = (e: MediaQueryListEvent) => setReduzirMovimento(e.matches);
    consulta.addEventListener("change", aoMudar);
    return () => consulta.removeEventListener("change", aoMudar);
  }, []);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
    dragFree: false,
    containScroll: false,
    duration: reduzirMovimento ? DURACAO_SEM_MOVIMENTO : DURACAO_PADRAO,
  });

  const [indiceSelecionado, setIndiceSelecionado] = useState(0);
  // Sem loop, as setas nas pontas ficam mortas — desabilitadas via estado em
  // vez de escondidas, para o teclado/leitor de tela também saber que
  // chegaram no fim.
  const [podeVoltar, setPodeVoltar] = useState(false);
  const [podeAvancar, setPodeAvancar] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;

    const aoAtualizar = () => {
      setIndiceSelecionado(emblaApi.selectedScrollSnap());
      setPodeVoltar(emblaApi.canScrollPrev());
      setPodeAvancar(emblaApi.canScrollNext());
    };
    aoAtualizar();

    emblaApi.on("select", aoAtualizar);
    emblaApi.on("reInit", aoAtualizar);

    return () => {
      emblaApi.off("select", aoAtualizar);
      emblaApi.off("reInit", aoAtualizar);
    };
  }, [emblaApi]);

  const aoTeclar = useCallback(
    (e: React.KeyboardEvent) => {
      if (!emblaApi) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        emblaApi.scrollPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        emblaApi.scrollNext();
      }
    },
    [emblaApi],
  );

  return (
    <div
      className="im-carrossel"
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={aoTeclar}
    >
      <div className="im-carrossel-viewport" ref={emblaRef}>
        <div className="im-carrossel-trilho">
          {imagens.map((imagem, indice) => (
            <div
              className={`im-carrossel-slide${indice === indiceSelecionado ? " ativo" : ""}`}
              key={`${imagem.url}-${indice}`}
            >
              {/* tabIndex -1 nos slides: centralizar por clique é conveniência de
                  mouse redundante (as setas e o ← → na região fazem o mesmo), e
                  sem isso cada galeria somaria um tab stop por imagem. A exceção
                  é quando há ampliação: aí o slide central fica focável, para o
                  teclado também conseguir abrir a planta. */}
              <button
                type="button"
                className="im-carrossel-slide-botao"
                tabIndex={aoAmpliar && indice === indiceSelecionado ? 0 : -1}
                onClick={() => {
                  if (aoAmpliar && indice === indiceSelecionado) aoAmpliar(indice);
                  else emblaApi?.scrollTo(indice);
                }}
                aria-label={
                  aoAmpliar && indice === indiceSelecionado
                    ? `Ampliar ${imagem.ambiente ?? `imagem ${indice + 1}`}`
                    : (imagem.ambiente ?? `Imagem ${indice + 1} de ${imagens.length}`)
                }
              >
                {/* Sem loading="lazy": medido no navegador que imagens lazy dentro
                    do overflow:hidden do viewport do Embla nunca disparam o
                    carregamento, nem com a galeria centralizada na tela — só a
                    primeira (eager) aparecia. Galeria é conteúdo principal e
                    finita, então carrega tudo; `fetchPriority` baixo nas demais
                    evita competir com a capa do hero (LCP). */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagem.url}
                  alt={imagem.ambiente ?? ""}
                  decoding="async"
                  fetchPriority={primeiraEager && indice === 0 ? "high" : "low"}
                />
                {/* `span`, e não `figcaption`: o elemento vive dentro do
                    `button` do slide, e figcaption só é válido dentro de
                    figure. aria-hidden porque o aria-label do botão acima já
                    anuncia o ambiente. */}
                {imagem.ambiente ? (
                  <span className="im-carrossel-legenda" aria-hidden="true">
                    <span>{imagem.ambiente}</span>
                  </span>
                ) : null}
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="im-carrossel-seta im-carrossel-seta-prev"
        aria-label="Imagem anterior"
        onClick={() => emblaApi?.scrollPrev()}
        disabled={!podeVoltar}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12.5 4.5 6 10l6.5 5.5" />
        </svg>
      </button>
      <button
        type="button"
        className="im-carrossel-seta im-carrossel-seta-next"
        aria-label="Próxima imagem"
        onClick={() => emblaApi?.scrollNext()}
        disabled={!podeAvancar}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7.5 4.5 14 10l-6.5 5.5" />
        </svg>
      </button>
    </div>
  );
}
