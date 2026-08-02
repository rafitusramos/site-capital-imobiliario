# RT Capital Imobiliário

Site de intermediação imobiliária e crédito. Domínio: rtcapitalimobiliario.com.br
Praça principal: Vinhedo/SP e região (Valinhos, Louveira, Jundiaí, Campinas, Itatiba).

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, Storage)
- Deploy: Vercel

## Fluxo de branches
`Development` → `Preview` → `main`. **Só `main` publica em produção**; as outras
duas geram deploy de preview. Trabalhe em Development e promova por PR.

## Estado atual

Migração concluída: o site roda em Next.js com renderização no servidor, e blog
e imóveis vêm do Supabase. O admin em `/admin` faz o CRUD dos dois e hospeda o
CRM de leads, que é a tela padrão de quem entra. O pipeline estático antigo
(`dist/`, `window.BLOG_POSTS`, `tools/blog/*`) não existe mais. Os markdowns em
`content/blog/` são referência histórica do texto migrado, não fonte de
renderização.

Suíte em Vitest: `npm test` — 660 passando + 1 *expected fail*, que é intencional
e deve continuar existindo. Migrations em `supabase/migrations/`, aplicadas à mão
no SQL Editor do Supabase; a última é a **019**.

### CRM
Quadro kanban em `/admin/crm/<origem>`, uma aba por origem de lead
(financiamento, home-equity, consórcio, imóveis). A especificação completa é
`docs/crm-spec.md`, citada nos comentários do módulo inteiro por seção.

- `lib/crm/etapas.ts` **espelha** os seeds de `crm_etapas` da migration 014. Os
  dois têm de andar juntos: mudou label, cor, ordem, SLA ou `exige_motivo` numa
  ponta, refaça na outra.
- Trocar um lead de etapa passa **sempre** pelo RPC `mover_lead_crm`, nunca por
  update solto. É lá que vivem o motivo obrigatório de perdido/não-qualificado
  e a concorrência otimista — e vale igual para o arrastar e para os botões do
  modal.
- O modal do lead é dirigido por `lib/crm/campos.ts`: nenhum componente conhece
  origem por nome. `bloco: "lead"` decide se o campo aparece no bloco editável
  da esquerda ou no painel "Origem", que é **só leitura** — o que veio do
  formulário do site. Todo campo editável precisa dessa marca, senão fica sem
  botão de salvar; `tests/unidade/crm-campos.test.ts` trava a invariante.
- Tags vivem no catálogo compartilhado `crm_tags`, com FK em `lead_tags`: não
  existe tag solta por lead. Criar tag pela interface exige admin (RLS
  `crm_tags_admin_write`).

### Imagens de imóveis
Toda imagem enviada em `/admin` para as 3 galerias e para as plantas da aba
Tipologias sai com o selo da marca (RT · Rafael Teixeira · Capital Imobiliário ·
rtcapitalimobiliario.com.br) queimado no canto inferior
direito — a composição roda no servidor, dentro de `enviarImagem`
(`app/actions/admin-imoveis.ts`), via `lib/imoveis/marca-dagua.ts` (`sharp`).
Não é proteção contra crop nem contra remoção deliberada; é o teto do que dá
para fazer numa imagem servida em página pública.

- O original sem marca é gravado primeiro no bucket privado
  `imovel-images-originais` (migration 019, `public = false`, sem policy de
  leitura pública) — existe só para permitir refazer o selo depois. O
  publicado em `imovel-images` é sempre WebP; o UUID do nome é o mesmo nos
  dois buckets, é o que amarra marcado ↔ original sem tabela nova.
- `lib/imoveis/marca-dagua.ts` é módulo puro (`import "server-only"`, sem
  Supabase) e por isso não pode ser importado por um script `node` avulso —
  `scripts/marcar-imagens.mjs`, o backfill das imagens publicadas antes dessa
  feature existir, carrega uma cópia da mesma lógica. Mudou a composição do
  selo num lugar, muda no outro.
- `public/marca-dagua.png` é gerado e commitado à mão (não em runtime): o
  `sharp` não garante fonte disponível no ambiente da Vercel para rasterizar
  texto.

### Simuladores
Financiamento (`/financiamento/`) e home equity (`/home_equity/`). O de
financiamento tem interruptor SAC/PRICE, com SAC como padrão.

As duas taxas **não estão em código**: vivem na tabela singleton
`parametros_simulador` (migration 013), editáveis em `/admin/parametros`.
`lib/queries/parametros.ts` lê com o cliente anon sem cookies e cai em
`TAXAS_PADRAO` se a leitura falhar — uma landing de captação não pode responder
500 por causa da tabela de configuração. As duas páginas têm `revalidate = 3600`;
sem ISR, a taxa lida em build time congelaria e a edição no admin nunca apareceria.

### Medição e anúncios
Consentimento **opt-out** (`lib/consentimento.ts`): as tags carregam na entrada e
param quando a pessoa recusa. Banner na primeira visita e link "Cookies e
privacidade" no rodapé para rever a escolha.

- **GA4** — ativo em produção.
- **Google Ads** — conversão `generate_lead` importada do GA4. Falta
  `NEXT_PUBLIC_GOOGLE_ADS_ID`, necessário só para remarketing e para a
  importação de conversão offline da Fase 2.
- **Meta Pixel** — **sem medição nenhuma**. Falta `NEXT_PUBLIC_META_PIXEL_ID`.
  Rodar campanha no Meta antes disso é pagar por tráfego sem sinal de retorno.

Todo evento passa por `rastrear()` em `lib/analytics/eventos.ts`, que traduz para
cada plataforma num lugar só e é no-op silencioso quando não há consentimento ou
IDs. Nenhuma tag carrega em `/admin` — `Tags` é montado só no layout do site.

Atribuição: `lib/utm.ts` captura na **entrada da sessão** (não no envio do
formulário, que era o bug antigo — quem navegava antes de converter perdia o
`gclid`) e guarda em sessionStorage. Inclui UTMs, `gclid`, `fbclid`, `wbraid`,
`gbraid` e referrer externo. Tudo vai no jsonb `utm` da tabela `leads`, sem
coluna nova.

Variáveis de ambiente da medição estão documentadas em `.env.local.example`.

### Fase 2, pendente
Meta Conversions API disparada da server action de lead, e importação de
conversão offline a partir do pipeline do CRM, casando o `gclid` já capturado —
é o que permite otimizar por contrato assinado em vez de formulário preenchido.

A CAPI exige mudar `TEXTO_CONSENTIMENTO` em `lib/legal.ts`: hoje ele autoriza o
compartilhamento apenas com instituições financeiras parceiras, e a Meta não é
uma. Não mude antes de a CAPI existir, para o texto não descrever algo que ainda
não acontece.

### Domínio
O apex é o canônico; `www` redireciona 308 para ele. Isso é configuração de
domínio **na Vercel, não em código**. Não crie redirect www→apex no
`next.config.ts`: é redundante e, se a Vercel um dia apontar ao contrário, vira
loop infinito.

## Design
Direção: "Minimalismo Exagerado". Paleta preto quente + bronze-dourado.

Tipografia que o layout de fato carrega: Libre Caslon Display (`--display`),
Libre Caslon Text (`--texto`), Archivo (`--sans`), IBM Plex Mono (`--mono`).
O admin carrega ainda Geologica (`--geologica`), usada só na soma de valores do
cabeçalho das colunas do CRM.
Cores: `--jade`, `--bronze`, `--abissal`, `--marfim`, `--areia`, `--tinta`,
`--branco`, `--erro`.

## Categorias do blog
Financiamento, Home Equity, Consórcio, Imóveis.

## Documentos de referência
- `docs/carousel-spec.md`: usar sempre que for criada uma página com galeria de imagens.
- `docs/modelo-artigo.md`: formato de frontmatter aceito pela importação de `.md`
  no admin. É contrato de código (`lib/blog/frontmatter.ts`), não doc solta.
- `docs/crm-spec.md`: especificação do módulo de CRM. Os comentários do código
  citam seções dela por número — ao mudar comportamento do CRM, confira se a
  seção citada continua descrevendo o que o código faz.

## Armadilhas já pagas
- Variável `NEXT_PUBLIC_*` é embutida em **build time**: alterá-la na Vercel
  **exige redeploy**; salvar não basta.
- Um `UPDATE` que não casa com nenhuma linha é sucesso no Postgres (`error`
  nulo, zero linhas). Confira o retorno com `.select()` antes de dizer "salvo".
- As taxas são guardadas em **decimal** (0.115), não em percentual (11.5).
  Converter apenas por `lib/parametros/taxa.ts` — errar isso não gera erro
  nenhum e faz a parcela sair ~100x errada.
- `lastModified` das páginas fixas do sitemap é mapa mantido à mão. Nunca
  `new Date()`: faria toda página parecer alterada em todo deploy.
- As entidades JSON-LD `#negocio` e `#rafael` são declaradas **uma única vez**,
  no layout, a partir de `lib/seo/negocio.ts`. Não redeclare em página, ou
  voltam as entidades conflitantes.
- Build no Windows falhando com `spawn UNKNOWN` na geração de páginas: é
  processo `node` órfão. Encerre os `node` pendentes e apague `.next`.
- Data que **volta do banco** não passa em `z.string().datetime()`: o PostgREST
  serializa `timestamptz` com deslocamento (`...+00:00`), e o zod 4 só aceita o
  sufixo `Z` por padrão. Use `datetime({ offset: true })` nesses campos. Campo
  que nasce de `toISOString()` no cliente é o caso oposto e não precisa disso.
  Um campo opcional nessa situação passa despercebido pela suíte inteira se
  nenhum teste o preencher — foi o que deixou o arraste do CRM quebrado.
- Editar um arquivo `"use server"` invalida os IDs de Server Action: as abas já
  abertas quebram na próxima action com `UnrecognizedActionError`. É hard reload,
  não regressão. Mas **dois `next dev` do mesmo projeto** compartilham o mesmo
  `.next` e fazem isso voltar sozinho — rode só um servidor.
- Texto acentuado num SVG rasterizado pelo `sharp` sai corrompido se o buffer
  não for montado como UTF-8 explícito: a primeira versão de `marca-dagua.png`
  ficou com "CAPITAL TMOBILIARIO" — e ninguém percebe olhando o código, só
  abrindo o PNG. Escreva acento como entidade numérica (`&#193;`) no SVG e
  **confira o PNG gerado sobre fundo escuro** antes de commitar.
- `DndContext` do dnd-kit precisa de `id` fixo quando a página é renderizada no
  servidor: sem ele o `aria-describedby` dos itens vem de um contador de módulo
  que diverge entre servidor e cliente e quebra a hidratação.

## Como trabalhar comigo neste projeto

Toda melhoria ou ajuste segue três etapas, cada uma com seu modelo:

1. **Planejar — Opus 5.** Levantamento, decisões de arquitetura, especificação.
2. **Desenvolver — Sonnet 5.** A implementação derivada do plano roda em subagente Sonnet 5.
3. **Validar — Opus 5.** Revisar o que o subagente entregou antes de dar como pronto.

Para qualquer diretiva de design, carregar **sempre** as duas skills: `frontend-design`
(web design) e `ui-ux-pro-max`.

### Revisão de pull request
Todo PR passa pelo plugin `code-review` antes de ser aberto ou mergeado — vale
para as duas pontas do fluxo, `Development → Preview` e `Preview → main`.
Rodar `/code-review` sobre o diff da branch e resolver o que ele apontar; se
alguma constatação for descartada, dizer por quê em vez de ignorar em silêncio.

`/code-review ultra` (revisão multiagente na nuvem) é **acionada só por mim** e
é cobrada à parte — o Claude não pode disparar por conta própria. Quando achar
que o caso justifica, peça.

## REGRAS INVIOLÁVEIS
1. Nenhum slug de URL pode mudar. As URLs atuais são a base do SEO.
2. Nenhum texto de artigo pode ser reescrito. Conteúdo migra idêntico.
3. SUPABASE_SERVICE_ROLE_KEY nunca pode aparecer em código de cliente.
4. Toda página indexável precisa de metadata (title, description, canonical).
5. Não crie páginas novas nem remova páginas existentes sem eu pedir.

## URLs que precisam continuar existindo
Herança do site antigo, base do SEO:
- /
- /financiamento/
- /home_equity/
- /sobre.html  (vira /sobre/ com redirect permanente)
- /blog/
- /blog/home-equity-empresario-capital-de-giro/
- /blog/home-equity-o-que-e-como-funciona/
- /blog/melhor-taxa-financiamento-imobiliario-bancos/

Criadas depois, também não podem quebrar (linkadas no rodapé e citadas em
documento legal): `/politica-de-privacidade/` e `/termos-de-uso/`.

O inventário completo de URLs é o `app/sitemap.ts`.
