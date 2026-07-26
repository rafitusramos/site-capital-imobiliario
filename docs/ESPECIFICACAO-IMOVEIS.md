# Especificação — Vertical de Imóveis (empreendimentos em lançamento)

Documento descritivo do que foi REALMENTE implementado, no formato de
`docs/ESPECIFICACAO-ADMIN-BLOG.md`. Em caso de dúvida, o `CLAUDE.md` da raiz prevalece nas
convenções do projeto; este documento descreve o escopo entregue.

---

## 1. Contexto e decisão de arquitetura

O site já cobria crédito (financiamento, home equity) e o blog. Esta feature adiciona a vertical
de **imóveis**: empreendimentos em lançamento (pré-lançamento, lançamento, em construção, pronto),
nos formatos apartamento, vila de casas e loteamento.

Cada empreendimento tem uma landing page própria em `/imoveis/<slug>/` — mesma estratégia de SEO
do blog (SSG + `revalidate`, slug estável, `generateMetadata` por página). Todo CTA da LP abre um
formulário curto de lead (nome, telefone, e-mail) amarrado ao `imovel_id`, usando o backend de
leads que já existia antes desta feature (RPC `criar_lead_imovel`, tabela `lead_imovel`,
`vw_leads_crm` — nada disso foi criado ou alterado aqui).

Índice em `/imoveis/` (a home `/` não muda). Fase única de implementação (público + admin
juntos). Filtros do índice são client-side (chips de fase e de tipo). O carrossel de imagens segue
`docs/carousel-spec.md`, adaptado à paleta e tipografia do site (ver seção "Adaptação" nesse
arquivo).

## 2. Banco de dados

Migrações em `supabase/migrations/`, para rodar manualmente no SQL Editor do Supabase, nesta
ordem (cada uma documenta pré-requisitos e guardas no próprio arquivo):

1. **`007_imoveis_empreendimentos.sql`** — estende `imoveis` (que já existia desde `001`,
   modelada para unidade avulsa de revenda) com as colunas de empreendimento: `tipo`, `fase`,
   faixas `area_min/max`, `dormitorios_min/max`, `banheiros_min/max`, `vagas_min/max`,
   `valor_a_partir_de`, `previsao_entrega`, `construtora`, `construtora_logo_url`, `endereco`,
   `cep`, `descricao_unidades`, `seo_title`, `seo_description`, `ordem`. Dropa as colunas de
   unidade avulsa (`valor_venda`, `metragem`, `dormitorios`, `banheiros`, `vagas`,
   `valor_condominio`, `valor_iptu`, `condominio`, `diferenciais`). Tem uma guarda no topo que
   recusa rodar se a tabela já tiver dado. Cria as tabelas filhas `imovel_tipologias`,
   `imovel_diferenciais`, `imovel_faqs` (RLS espelhando `imovel_imagens`: leitura pública só se o
   imóvel pai estiver `status = 'ativo'`, escrita só autenticado). `imovel_imagens` ganha a coluna
   `grupo` (`empreendimento` / `decorado` / `planta` / `implantacao`).
2. **`008_imoveis_storage.sql`** — bucket público `imovel-images` (5MB, jpeg/png/webp/gif), cópia
   do padrão de `004_admin_storage.sql`.
3. **`009_seed_imovel_exemplo.sql`** — um empreendimento de exemplo (`reserva-jade-vinhedo`),
   nascendo `status = 'inativo'` para servir de material de teste do fluxo de publicação pelo
   admin.

`status` (`ativo`/`reservado`/`vendido`/`inativo`) continua controlando a RLS de leitura pública
(policy `imoveis_public_read_ativos`, já existente desde `001`). `fase` é uma informação comercial
distinta e não entra na RLS.

`types/database.ts` foi atualizado à mão (arquivo sem geração automática — ver comentário em
`lib/queries/posts.ts`) com as `Row`/`Insert`/`Update` de `imoveis` e `imovel_imagens`
estendidas, as três tabelas novas, e os union types `ImovelTipo`, `ImovelFase`,
`ImovelImagemGrupo`, `ImovelDiferencialGrupo`.

## 3. Camada de dados

- **`lib/validations/imovel.ts`** — schemas Zod: `imovelFormSchema` (dados gerais, com
  refinements de faixa `_max >= _min`), `tipologiaSchema`/`tipologiasFormSchema`,
  `diferencialSchema`/`diferenciaisFormSchema`, `faqSchema`/`faqsFormSchema`,
  `imagemSchema`/`imagensFormSchema`.
- **`lib/queries/imoveis.ts`** — público, `createStaticClient()`: `getImoveisPublicados()`
  (`status = 'ativo'`, com capa resolvida a partir de `imovel_imagens`, ordenado por
  `ordem asc, created_at desc`), `getImovelBySlug(slug)` (imóvel + imagens + tipologias +
  diferenciais + faqs, cada coleção ordenada por `ordem`), `getImoveisRelacionados(id, cidade,
  limite)` (mesma cidade, `status = 'ativo'`, exceto o atual).
- **`lib/queries/admin-imoveis.ts`** — `"server-only"` + `createClient()`: `getImoveisAdmin()`
  (qualquer status) e `getImovelByIdAdmin(id)` (com as 4 coleções filhas).
- **`lib/imoveis/formato.ts`** — helpers de formatação puros (não fazem parte do plano original,
  extraídos porque são usados tanto pelo card público quanto pela LP e pelo admin): faixas de
  área/dormitórios/vagas/banheiros ("68 a 142 m²", "2 e 3 dorms"), preço "a partir de" em pt-BR
  (via `brl()` de `lib/financeiro.ts`), e os rótulos de `fase`/`tipo`.
- **`app/actions/admin-imoveis.ts`** — mesma estrutura de `app/actions/admin-posts.ts`:
  `usuarioAutenticado()`, Zod, erro `23505` traduzido para "Já existe um empreendimento com esse
  slug.". Funções: `salvarImovel` (insert força `status: "inativo"` explicitamente — o default da
  coluna é `'ativo'`; update nunca toca `status`), `publicarImovel`/`despublicarImovel` (alternam
  `status` entre `'ativo'`/`'inativo'`), `excluirImovel`, `uploadImagemImovel` (bucket
  `imovel-images`, mesma validação de tipo/5MB do blog), e as quatro reconciliações de coleção
  (`salvarImagens`, `salvarTipologias`, `salvarDiferenciais`, `salvarFaqs`): cada uma recebe o
  array completo da aba do editor, apaga os itens que saíram do array e grava o restante — update
  para quem já tem `id`, insert para quem não tem. Optou-se por update/insert individuais em vez
  de um único `upsert` em lote porque o `upsert` do postgrest-js, com itens sem `id` no mesmo
  lote, pode enviar `NULL` explícito para colunas ausentes (`defaultToNull`), o que colidiria com
  a PK gerada por `default uuid_generate_v4()`. `revalidarImoveis(slug)` roda depois de qualquer
  gravação: `revalidatePath("/imoveis")`, `revalidatePath("/imoveis/<slug>")`,
  `revalidatePath("/sitemap.xml")`.

## 4. Componentes compartilhados (`components/imoveis/`)

- **`icones.tsx`** — catálogo fixo de ícones SVG inline (`viewBox 20x20`, `stroke="currentColor"`,
  traço igual a `TabelaPosts.tsx`/`SidebarAdmin.tsx`): `area`, `dormitorio`, `vaga`, `banheiro`,
  `piscina`, `academia`, `salao-festas`, `playground`, `churrasqueira`, `coworking`, `pet-place`,
  `quadra`, `sauna`, `bicicletario`, `portaria`, `elevador`, `area-verde`, `carro-eletrico`, mais
  um ícone genérico de fallback. `ICONES` é um `Record<string, ComponentType<SVGProps<SVGSVGElement>>>`
  (o tipo de props aceita `className`/`aria-hidden` etc., repassados via spread por uma fábrica
  `criarIcone`); `obterIcone(slug)` resolve com fallback; `listaDeIcones()` alimenta o `<select>`
  de ícone no admin. Nunca emoji.
- **`Carrossel.tsx`** (`"use client"`) — Embla Carousel com o comportamento de
  `docs/carousel-spec.md` (ver a seção "Adaptação — Imóveis RT Capital" nesse arquivo para os
  desvios conscientes de paleta/CSS/`<img>`/autoplay). CSS em `styles/imoveis.css`.
- **`LeadImovelModal.tsx`** (`"use client"`) — modal de lead de etapa única (nome, telefone via
  `mascaraTelefone`, e-mail), reaproveitando exatamente as classes CSS do modal multi-etapa já
  existente (`.scrim`, `.painel`, `.form-head`, `.campo`, `.msg-erro`, `.form-nav`, `.lgpd-form`,
  `.sucesso`, `.painel.enviado` — sem `.progresso`, que é só de etapa múltipla) e a mesma server
  action `criarLead` (`tipo: "imoveis"`), sem nenhuma mudança de backend. Expõe
  `forwardRef`+`useImperativeHandle` (`{ abrir: (rotuloCta) => void }`), igual ao pedido do plano.
  **Decisão de design não 100% explícita no plano:** além da API por ref, o componente também
  escuta clique delegado em qualquer elemento `[data-abrir-lead="Rótulo"]` no documento. Isso
  permite que a landing page do imóvel (`app/(site)/imoveis/[slug]/page.tsx`) continue sendo um
  Server Component puro — necessário porque a página usa `generateStaticParams`/
  `generateMetadata`, que não podem conviver com `"use client"` no mesmo arquivo — com vários
  CTAs de texto diferente espalhados pelas 13 seções (hero, CTA final, barra fixa mobile), sem
  precisar de um componente cliente adicional só para seg­urar o `ref` do modal.

## 5. Páginas públicas

- **`app/(site)/imoveis/page.tsx`** — índice, `revalidate = 3600`, `metadata.alternates.canonical
  = "/imoveis/"`. Hero com a classe `.hero` já existente (mesma imagem de fundo fixa do `body`).
  Delega a listagem a `components/imoveis/ImoveisFiltro.tsx` (`"use client"`): dois grupos de
  chips independentes — fase e tipo —, marcação copiada de `components/blog/BlogFiltro.tsx`
  (classe `.blog-filtro`, `role="group"`, `aria-label`). Cards via
  `components/imoveis/ImovelCard.tsx`: capa, badge de fase (cor muda por fase, nunca só texto),
  título, "Lançamento em Bairro, Cidade", faixas de área/dormitórios/vagas com os ícones do
  catálogo, "A partir de R$ X". Estado vazio com mensagem específica conforme algum filtro esteja
  ativo ou não.
- **`app/(site)/imoveis/[slug]/page.tsx`** — LP do empreendimento, estrutura igual a
  `app/(site)/blog/[slug]/page.tsx` (`generateStaticParams`, `generateMetadata` com
  `seo_title`/`seo_description`/canonical `/imoveis/<slug>/`, `revalidate = 3600`, `notFound()`).
  Server Component; só `Carrossel`, `ImoveisFiltro` (não usado nesta página) e `LeadImovelModal`
  são `"use client"`. Treze seções, nesta ordem:
  1. Hero + fatos rápidos (capa como fundo, nome, localização, faixas de área/dorms/vagas,
     previsão de entrega, preço "a partir de", CTA) — as duas seções do plano (hero e fatos
     rápidos) foram unificadas visualmente num único bloco escuro, decisão de design não 100%
     explícita no plano original.
  2. O projeto (`descricao_completa`).
  3. Galeria do empreendimento (`Carrossel`, imagens do grupo `empreendimento`).
  4. Fase da obra — linha do tempo pré-lançamento → lançamento → construção → pronto, marcada por
     cor + ícone + texto (nunca só cor), com `aria-current="step"` na fase atual. Os ícones da
     timeline são específicos dela (bandeira/megafone/guindaste/chave), fora do catálogo de
     amenidades de `icones.tsx` — são semânticas diferentes.
  5. Lazer e convívio — checklist de `imovel_diferenciais` do grupo `lazer`.
  6. As unidades (`descricao_unidades` + `Carrossel` do grupo `decorado`).
  7. Plantas e quadro de áreas — `Carrossel` do grupo `planta` + tabela de `imovel_tipologias`
     usando as classes `.tab-scroll`/`.tabela` já existentes (viram cartões empilhados no mobile
     via `data-label`, sem scroll horizontal customizado).
  8. Diferenciais — grid de ícones do grupo `diferencial`.
  9. Localização — endereço + link para
     `https://www.google.com/maps/search/?api=1&query=<endereço>`, sem embed nem API key.
  10. Realização — construtora + logo.
  11. FAQ — `<details>`/`<summary>` (já estilizado em `lp.css`) + JSON-LD `FAQPage`.
  12. CTA final.
  13. Outros empreendimentos da mesma cidade (`ImovelCard` reaproveitado).

  Barra de CTA fixa no rodapé em mobile (`position: fixed`, oculta a partir de 900px,
  `padding-bottom: calc(12px + env(safe-area-inset-bottom))`, como `.form-nav` já faz).

  JSON-LD: `Product` + `AggregateOffer` (`lowPrice = valor_a_partir_de`, `priceCurrency: "BRL"`) e
  `FAQPage`, via `<script type="application/ld+json">` igual a `blog/[slug]/page.tsx`. Nota de
  expectativa (herdada do plano): o Google restringiu o rich result de `FAQPage` a sites
  governamentais/de saúde desde ago/2023, e não existe rich result de `Product` para
  empreendimento imobiliário — o JSON-LD entra por ser dado estruturado válido, não por garantir
  destaque na SERP. Validar em **validator.schema.org**, não no Rich Results Test.

- **`components/nav/SiteNav.tsx`** — item "Imóveis" → `/imoveis/`, entre o dropdown "Soluções de
  Crédito" e "Blog", mesmo padrão de `.nav-link`/`aria-current` dos demais itens.
- **`app/sitemap.ts`** — `/imoveis/` nas `paginasFixas` + uma entrada `/imoveis/<slug>/` por
  empreendimento publicado (`lastModified: imovel.updated_at`).

## 6. Admin

- **`components/admin/SidebarAdmin.tsx`** — "Cadastro de Imóveis" agora aponta para
  `/admin/imoveis` (antes `href: null`, com o estado "Em breve").
- **`app/admin/(protected)/imoveis/page.tsx`** + **`components/admin/TabelaImoveis.tsx`** — lista
  no padrão de `TabelaPosts.tsx`: grade responsiva, badge de status (`ativo` = Publicado,
  `inativo` = Rascunho, mais `reservado`/`vendido`, que também existem no enum `ImovelStatus` e
  ficam disponíveis para uso futuro fora do fluxo publicar/despublicar), ações de
  publicar/despublicar/excluir em ícone, botão "+ Novo empreendimento".
- **`app/admin/(protected)/imoveis/novo/page.tsx`** e **`.../[id]/page.tsx`** — espelham as
  páginas equivalentes de posts, renderizando **`components/admin/ImovelEditor.tsx`**
  (`"use client"`) com 5 abas em estado local (não rotas separadas):
  1. **Dados gerais** — todos os campos de `imovelFormSchema`; slug auto-gerado do título via
     `lib/blog/slugify.ts` até o usuário editar manualmente; mesmo aviso de "isso quebra a URL
     indexada" quando o slug muda em empreendimento já publicado (`status === 'ativo'`), calcado
     em `PostEditor.tsx`. Botões de publicar/despublicar/excluir ficam nesta aba.
  2. **Galeria** — upload múltiplo (reaproveita o padrão de upload do `PostEditor`, chamando
     `uploadImagemImovel`), escolha do `grupo` por imagem, campo numérico de `ordem`, checkbox
     "Capa" (campo `destaque` — marcar uma desmarca as demais, já que só uma imagem pode ser a
     capa do card).
  3. **Tipologias** — CRUD em linha (adicionar/editar/remover) + upload de planta por linha.
  4. **Diferenciais** — CRUD em linha, seletor de grupo (lazer/diferencial) + `<select>` de ícone
     alimentado por `listaDeIcones()`, com preview do ícone escolhido ao lado.
  5. **FAQ** — CRUD em linha (pergunta/resposta como `textarea`).

  Cada aba salva sua própria coleção pela action correspondente — não há um único submit
  gigante. Ao criar um empreendimento novo, só a aba "Dados gerais" fica disponível até o
  primeiro salvamento (que redireciona para `/admin/imoveis/<id>`, igual ao fluxo de posts) —
  as demais abas exigem um `imovel.id` para associar as coleções filhas.

## 7. Fora de escopo (herdado do plano)

Mapa embutido com API key · busca por bairro e filtro de preço no servidor · unidades avulsas de
revenda (a tabela `imoveis` original foi migrada para o modelo de lançamento, não mantém as duas
finalidades) · tour virtual / vídeo 360 (`video_youtube_url` permanece na tabela, sem uso na LP).

## 8. Verificação executada nesta implementação

- `npx tsc --noEmit` — limpo.
- `npm run build` — compila e passa por type-checking; falha (esperado, sem `.env.local` neste
  ambiente) só na etapa de coleta de dados de página, ao tentar chamar o Supabase real em
  `generateStaticParams`/`generateMetadata` (`Error: supabaseUrl is required.`). Nenhum erro de
  TypeScript, import quebrado ou JSX inválido.
- Não há script `lint` no `package.json` desta fase — não executado.
- A verificação end-to-end (rodar as migrações no Supabase, `npm run dev`, publicar o seed pelo
  admin, percorrer as 13 seções, enviar leads pelos 3 CTAs, checar `vw_leads_crm`, testar
  responsivo e `prefers-reduced-motion`) depende de um projeto Supabase real com as migrações
  aplicadas e `.env.local` preenchido — não disponível neste ambiente. Ver `docs/carousel-spec.md`
  e a seção "Verificação" do plano original para o roteiro completo a ser executado antes do
  deploy.
