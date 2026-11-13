# Plano de SEO e visibilidade em IA

Levantado em 2026-11-10. Cada fase é uma branch própria (`feature/<nome>` a partir de
`main`) e segue as cinco etapas do `CLAUDE.md`. A ordem é por custo x impacto: primeiro
o que não cria página, depois o que depende de decisão e de texto.

Estado da ficha do Google na data do levantamento: categoria única "Finance broker",
horário "Aberto 24 horas", **nenhuma avaliação**.

## Fase 1 — Entidades do JSON-LD (`feature/seo-entidades`)

Não cria página nem muda texto visível. Arquivos: `lib/seo/negocio.ts`,
`app/(site)/sobre/page.tsx`, `tests/unidade/seo-estruturados.test.ts`.

- `#rafael` ganha `url` (`/sobre/`), `image` (`/images/rafael-teixeira.jpg`), `sameAs`,
  `knowsAbout` e o número do CRECI (`283020-F`, já visível em `/sobre/`) como
  `identifier` da credencial.
- `#negocio`: `logo` deixa de ser `background.jpg` e passa a um PNG quadrado 512x512
  gerado do desenho do `favicon.svg` (`public/images/logo-rt.png`, commitado, com script
  em `scripts/`). O `sameAs` troca o encurtador `share.google` pela URL estável
  `https://www.google.com/maps?cid=1997059006678757798`, repetida em `hasMap`.
- `/sobre/` emite `ProfilePage` com `mainEntity` apontando para `#rafael`.
- Testes travam: logo quadrado e existente em `public/`, nenhum `share.google`, `#rafael`
  com `url`, `image` e `sameAs`.

Dados do dono, recebidos em 2026-11-10 e já na branch:

- LinkedIn do Rafael no `sameAs` de `#rafael`.
- Horário: 24 horas, todos os dias, em `openingHoursSpecification` (o atendimento começa
  pelo site, e a resposta à simulação será automatizada). É o mesmo da ficha do Google;
  os dois têm de continuar iguais.

## Fase 2 — Robôs de IA e `llms.txt` (`feature/seo-robos-ia`)

- `app/robots.ts`: regras explícitas para `OAI-SearchBot`, `GPTBot`, `PerplexityBot`,
  `ClaudeBot` e `Google-Extended`, todas `allow: /` e `disallow: /admin`. Não muda o
  comportamento (o `*` já libera); registra a decisão.
- `app/llms.txt/route.ts`: resumo do negócio e lista das URLs principais, gerado do mesmo
  inventário do sitemap. Sem evidência de efeito em ranking; custo baixo.
- Decisão do dono: liberar ou não treino de modelo (`GPTBot`, `Google-Extended`), que é
  diferente de liberar busca (`OAI-SearchBot`, `PerplexityBot`).

## Fase 3 — Autor visível (`feature/seo-autor`)

- Caixa de autor no fim de cada artigo: foto, nome, CRECI, uma frase e link para `/sobre/`.
  Fica fora do corpo do artigo (regra 2: texto de artigo não é reescrito).
- "Revisado em" visível no artigo, vindo de `posts.revisado_em` (migration 034, preenchido à mão),
  quando posterior à publicação. Não usa `updated_at`: ele muda a cada salvamento e sinalizaria
  revisão que não houve. A mesma regra alimenta `dateModified` e o sitemap (`lib/blog/revisao.ts`).
- **Implementada na branch `feature/seo-autor`** (ainda não mergeada).
- Exige as skills `frontend-design` e `ui-ux-pro-max`.

## Fase 4 — Landing de consórcio (`feature/landing-consorcio`)

**Cria página: depende de autorização (regra 5).** Espelha `/financiamento/`: Service,
BreadcrumbList, FAQPage em `lib/seo/faqs-landings.ts`, formulário na origem `consorcio` do
CRM (a aba já existe), "Leia também" da categoria. Decisões do dono: slug, se há simulador,
e o texto.

## Fase 5 — Páginas por cidade (`feature/paginas-cidade`)

**Cria páginas: depende de autorização.** Uma por serviço e cidade, começando por
Vinhedo, Valinhos e Jundiaí em financiamento. Só publica com conteúdo próprio da cidade
(ITBI, cartório, faixa de preço, bairros); página com o nome da cidade trocado é doorway.
Decisão do dono: estrutura de URL e quem escreve o conteúdo local.

## Fase 6 — Conteúdo (contínuo, pelo admin)

- Um cluster por serviço: a landing é o pilar; artigos respondem uma dúvida cada (ITBI,
  FGTS, portabilidade, SAC x PRICE, MIP, home equity x empréstimo pessoal).
- Formato citável: resposta direta em uma ou duas frases logo abaixo de cada H2, tabela
  com números datados, fonte do dado.
- Vale só para artigo novo; os existentes não são reescritos.

## Fora do código (dono)

1. Ficha do Google: acrescentar categorias (corretor de imóveis,
   correspondente bancário), fotos, posts, e pedir avaliação a cada cliente fechado.
2. Bing Webmaster Tools: cadastrar o site e enviar o sitemap.
3. Nome, telefone e cidade idênticos em Google, Instagram, LinkedIn, RE/MAX Clarity e portais.
4. Links: perfil na RE/MAX Clarity, construtoras dos lançamentos, imprensa de Vinhedo e região.
5. Search Console: revisar todo mês as consultas em posição 5 a 15.
