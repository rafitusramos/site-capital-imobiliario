# Especificação: Componente de Carrossel de Cartões

> Referência visual: "Carousel experimentation" (Sacha Jerrems, Dribbble).
> Stack: **Next.js (App Router, React, TypeScript) + Tailwind CSS + Embla Carousel**.

## Objetivo

Carrossel horizontal de cartões de notícias sobre fundo teal (`#096164`), com **efeito de foco central**: o cartão do meio fica em destaque (escala 1.0, opacidade 100%, sombra forte) e os cartões vizinhos aparecem menores (~0.9) e mais apagados (~65%), criando profundidade. Parte dos cartões adjacentes fica visível nas laterais (efeito *peek*). **Loop infinito** com *snap* ao centro.

## Dependências

```bash
npm install embla-carousel-react embla-carousel-autoplay
# ícones (opcional, para a seta do "Read more")
npm install lucide-react
```

- Loop infinito nativo do Embla (`loop: true`).
- Efeito de escala/opacidade implementado via API de scroll do Embla (sem lib visual), para reproduzir fielmente o design.
- Estilos estruturais em classes **Tailwind**; valores dinâmicos (escala/opacidade por slide) via **CSS variables inline**.

## Estrutura de arquivos
components/
Carousel/
Carousel.tsx       # "use client" — lógica do Embla + render
CarouselCard.tsx   # cartão individual
types.ts           # tipos dos dados

> Não há arquivo CSS Module — toda a estilização usa classes utilitárias Tailwind + CSS vars inline para os valores dinâmicos.

## Tema (tailwind.config.ts)

Estender as cores da paleta para reuso semântico:

```ts
colors: {
  brand: {
    teal:  "#096164",
    teal2: "#659EA7",
    mist:  "#BFCBC0",
    ink:   "#0E2024",
    sand:  "#7B7466",
    sky:   "#A3CBD8",
    slate: "#3E4B4C",
  },
  accent: "#F0463C", // badge NEWS (vermelho/laranja)
}
```

## Tipos de dados

```ts
export type CarouselItem = {
  id: string;
  image: string;      // URL da imagem de fundo
  imageAlt: string;
  tag: { label: string; color: string }; // ex.: { label: "NEWS", color: "#F0463C" }
  title: string;
  timestamp: string;  // ex.: "5 mins ago"
  href: string;       // destino do "Read more"
};
```

O componente `Carousel` recebe `items: CarouselItem[]` e uma prop opcional `autoplay?: boolean`.

## Configuração do Embla

- Opções: `loop: true`, `align: "center"`, `dragFree: false` (snap firme).
- Plugin **Autoplay** opcional (delay ~4000ms, pausa em hover e ao interagir), habilitado pela prop `autoplay`.
- **Efeito de destaque central:** registrar `emblaApi.on("scroll", onScroll)` (e `reInit`). No callback, usar `emblaApi.scrollProgress()` + `emblaApi.scrollSnapList()` para calcular a distância de cada slide ao centro e definir, por slide, as CSS vars:
  - `--scale`: `1.0` no centro → `0.9` nas bordas.
  - `--opacity`: `1` no centro → `0.65` nas bordas.
- Recalcular em `reInit` e no `resize`.
- No slide, consumir as vars:

```tsx
style={{ transform: "scale(var(--scale))", opacity: "var(--opacity)" }}
className="transition-transform transition-opacity duration-300 ease-out motion-reduce:transition-none"
```

## Anatomia do cartão (CarouselCard)

- Proporção retrato: `aspect-[3/4]`, `rounded-2xl`, `overflow-hidden`, `shadow-xl`.
- Imagem de fundo: `next/image` com `fill` + `object-cover`.
- **Badge** (canto superior esquerdo): `rounded-md px-2 py-1 text-xs font-bold uppercase text-white`, cor de fundo via `style={{ backgroundColor: tag.color }}`.
- **Gradiente inferior** (legibilidade): `bg-gradient-to-t from-black/70 to-transparent`.
- **Título**: branco, `font-bold`, 2–3 linhas (`line-clamp-3`), na porção inferior.
- **Timestamp**: `text-sm text-white/80`, abaixo do título.
- **"Read more"**: `next/link` para `href`, com ícone circular de seta (`lucide-react` ou SVG inline) + texto.

## Interações

- Arrastar/swipe (nativo do Embla), snap ao centro, **loop infinito**.
- Setas prev/next (`emblaApi.scrollPrev()` / `scrollNext()`) e navegação por teclado (← →) com `aria-label`.
- Clicar num cartão lateral centraliza-o: `emblaApi.scrollTo(index)`.
- Autoplay pausa em hover e ao interagir.

## Responsividade

Largura do slide por breakpoint (calibrar o *peek*):

| Breakpoint | Classe        |
|------------|---------------|
| mobile     | `basis-[85%]` |
| md         | `md:basis-[60%]` |
| lg         | `lg:basis-[45%]` |

Container com `overflow-hidden` e padding lateral para revelar o *peek* dos vizinhos. Fontes e paddings escalam por breakpoint.

## Acessibilidade

- `alt` descritivo em todas as imagens.
- Controles com `aria-label`.
- Container com `role="region"` e `aria-roledescription="carousel"`.
- Respeitar `prefers-reduced-motion`: usar `motion-reduce:transition-none` e desativar autoplay quando a preferência estiver ativa.

## Paleta de cores (referência)

`#096164` (fundo) · `#659EA7` · `#BFCBC0` · `#0E2024` · `#7B7466` · `#A3CBD8` · `#3E4B4C` · badge de destaque em vermelho/laranja (`#F0463C`).

## Critérios de aceite

- [ ] Cartão central sempre em destaque, com transição suave ao navegar.
- [ ] Loop infinito sem "salto" visível.
- [ ] *Peek* dos cartões vizinhos visível nas laterais.
- [ ] Drag, setas, teclado e clique-para-centralizar funcionando.
- [ ] Totalmente responsivo (mobile → desktop).
- [ ] Sem CLS (dimensões definidas no `next/image`).
- [ ] `prefers-reduced-motion` respeitado.
- [ ] Nenhum CSS fora das classes Tailwind + CSS vars inline para valores dinâmicos.

## Adaptação — Imóveis RT Capital

Implementado em `components/imoveis/Carrossel.tsx`, para as galerias das landing pages de
empreendimentos (`app/(site)/imoveis/[slug]/page.tsx`). Mantém o comportamento essencial deste
spec (Embla `loop:true`/`align:"center"`/`dragFree:false`, foco central via `scrollProgress()` +
`scrollSnapList()` escrevendo `--escala`/`--opacidade`, peek lateral, setas, teclado ← →, clique
no slide lateral centraliza), com os seguintes desvios conscientes por causa do design system e
das restrições do repo (ver `CLAUDE.md`):

- **Paleta e tipografia do site**, não o teal `#096164` da referência: `--jade`/`--bronze`/
  `--abissal`/`--areia`/`--marfim` e `var(--display)`/`var(--sans)` (que já mapeiam para Libre
  Caslon Display e Archivo via `next/font` em `app/(site)/layout.tsx`), em vez de Libre Caslon +
  Archivo "direto" e da paleta de referência.
- **CSS em arquivo próprio (`styles/imoveis.css`)**, não classes Tailwind — o projeto não usa
  Tailwind nas páginas públicas (só no admin); os valores dinâmicos de escala/opacidade continuam
  via CSS vars inline, exatamente como o spec pede.
- **`<img>` simples com `aspect-ratio` fixo em CSS**, não `next/image` — o restante do codebase
  usa `<img>` puro (`components/blog/post-card.tsx`, `app/(site)/blog/[slug]/page.tsx`) e
  `next.config.ts` não declara `images.remotePatterns` para o domínio do Supabase Storage. A
  proteção contra CLS vem do `aspect-ratio` no lugar das dimensões do `next/image`.
- **Sem plugin de autoplay** (`embla-carousel-autoplay` não foi instalado e não deve ser
  adicionado): autoplay numa galeria de imóvel atrapalha a leitura das fotos e conflita com
  `prefers-reduced-motion` — decisão consciente, não uma omissão.