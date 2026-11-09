# RT Capital Imobiliário

Site de intermediação imobiliária e crédito. Domínio: rtcapitalimobiliario.com.br
Praça principal: Vinhedo/SP e região (Valinhos, Louveira, Jundiaí, Campinas, Itatiba).

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, Storage)
- Deploy: Vercel

## Fluxo de branches
Só existem duas branches permanentes: `Preview` e `main`. **Só `main` publica em
produção**; `Preview` gera deploy de preview e é onde se valida.

Todo trabalho nasce de `main`, numa branch descartável:

- `feature/<nome>` para funcionalidade nova.
- `hot-fix/<nome>` para correção.

Daí o caminho é `feature|hot-fix/<nome>` → `Preview` → `main`, sempre por PR.
Apague a branch depois que ela chegar em `main`.

Partir de `main`, e não de `Preview`, é o que garante que a branch nasça em cima
do que está publicado — `Preview` pode carregar coisa ainda não promovida, e
herdar isso mistura mudanças de terceiros no PR.

A branch `Development` **não existe mais**. Se algum documento ou comentário
antigo ainda a citar, é resíduo.

## Estado atual

Migração concluída: o site roda em Next.js com renderização no servidor, e blog
e imóveis vêm do Supabase. O admin em `/admin` faz o CRUD dos dois e hospeda o
CRM de leads, que é a tela padrão de quem entra. O pipeline estático antigo
(`dist/`, `window.BLOG_POSTS`, `tools/blog/*`) não existe mais. Os markdowns em
`content/blog/` são referência histórica do texto migrado, não fonte de
renderização.

Suíte em Vitest: `npm test` — 1099 passando + 1 *expected fail*, que é intencional
e deve continuar existindo. Migrations em `supabase/migrations/`; a última é a **029**.

**Migrations são aplicadas pelo workflow `.github/workflows/migrations-supabase.yml`**:
o merge em `Preview` roda `supabase db push` (o dry-run aparece nos checks do PR).
**`Preview` e produção usam o MESMO banco** — mergear em `Preview` aplica em produção.
Arquivo novo: prefixo numérico `NNN_nome.sql` seguindo a sequência e **sem
`begin;`/`commit;`** (a CLI já abre uma transação por arquivo). SQL Editor só como
fallback — e, se usar, registre a versão em `supabase_migrations.schema_migrations`,
ou o próximo push tenta rodar o arquivo de novo.

### CRM
Quadro kanban em `/admin/crm/<origem>`, uma aba por origem de lead
(financiamento, home-equity, consórcio, imóveis). A especificação completa é
`docs/crm-spec.md`, citada nos comentários do módulo inteiro por seção.

- Lead em `ganho`/`perdido` (não `nao-qualificado`) há mais de 30 dias é arquivado
  sozinho, todo dia às 03:00 BRT, pela função `arquivar_leads_finais_antigos` +
  job pg_cron `crm-arquivar-finais-antigos` (migration 023). `arquivado_por` nulo
  = sistema; `restaurarLead` grava `restaurado_em` para o job não re-arquivar.
- Contagens do cabeçalho (por etapa e por aba) vêm do RPC `contar_leads_crm`
  (migration 022), **nunca** somadas em JS: o max-rows do PostgREST truncaria em silêncio.
- `lib/crm/etapas.ts` **espelha** os seeds de `crm_etapas` da migration 014. Os
  dois têm de andar juntos: mudou label, cor, ordem ou `exige_motivo` numa
  ponta, refaça na outra. **Exceção `slaDias`:** o SLA vigente vem da migration
  **029** (não da 014) e significa **dias úteis**; `tests/unidade/crm-etapas.test.ts`
  lê o `.sql` da 029 e compara com `etapas.ts`. **Exceção: `notifica_lead`** (migration 025) é lido do
  banco em tempo de execução e editado em `/admin/parametros`; **não** entra em
  `etapas.ts`, e a seed da 025 não precisa ser espelhada lá.
- **SLA em dias úteis** (segunda a sexta, **sem** calendário de feriados, fuso
  São Paulo): criado 1, simulação/qualificação/apresentação 2, pré-aprovação/
  vistoria/visita/proposta 5, contrato 10. A barra de tempo do card compara
  `diasUteisEntre(status_alterado_em, agora)` (`lib/crm/dias-uteis.ts`, mesma
  régua de `somar_dias_uteis` da 029) com o SLA, via `estadoDaEtapaDoLead`
  (`lib/crm/tempo.ts`) — ponto único de CardLead, ColunaEtapa e `filtrarParados`.
  O texto "N dias em Etapa" do card segue em dias **corridos**.
- **Lembrete automático por trigger** (`agendar_lembrete_sla`, migration 029,
  `security definer`): ao entrar numa etapa com SLA (lead novo ou troca de
  etapa), cria `crm_lembretes.automatico = true` para 18:00 do último dia útil
  do prazo. Na troca de etapa **apaga antes** os automáticos pendentes do lead
  (substituição); lembrete manual nunca é tocado. `criado_por` é nulo em lead do
  site (a timeline já tolera). Falha vira `warning`, jamais derruba captação nem
  movimento. Sem carga retroativa em leads existentes.
- **Contorno do card por lembrete**: `estadoDoLembrete` (`lib/crm/lembretes.ts`,
  comparação de instante) — atrasado = contorno `--erro`; vence em até 24h =
  contorno `--aviso`; sem contorno no card fantasma do DragOverlay. É box-shadow,
  não borda: a barra de tempo de 3px à esquerda segue intacta. `--aviso` nunca
  em texto (o texto de vence-24h usa `--bronze`).
- **`profiles.oculto_no_crm`** (migration 029, sem grant de UPDATE) tira o usuário
  de QA das listas de responsável. `getDominios` lê `profiles` com `select("*")`
  e filtra em JS (`responsaveisVisiveis`, `lib/crm/responsaveis.ts`) para não
  quebrar o deploy da branch antes de a migration rodar; só `id, full_name,
  avatar_url, role` chegam ao cliente.
- Barra de etapa do modal: `components/admin/crm/BarraEtapa.tsx`, uma linha,
  grid `1fr auto 1fr auto` (etapa atual centrada). Perdido / Não Qualificado são
  botões só com ícone (`title` + `aria-label`).
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

### E-mails
Provider **Resend** (`lib/email/`). Variáveis só de servidor (nunca `NEXT_PUBLIC_`),
documentadas em `.env.local.example`: `RESEND_API_KEY`, `EMAIL_REMETENTE`,
`EMAIL_ADMIN`. O domínio remetente precisa estar verificado no Resend.

- **Sem `RESEND_API_KEY` é no-op** (`enviar.ts` loga uma vez e devolve
  `sem-chave`), e o wrapper **nunca lança**: falha vira `console.error` +
  resultado. E-mail jamais pode derrubar a captação de lead nem o movimento de etapa.
- Dono recebe e-mail em **todo lead novo** e em **toda mudança de etapa**. O lead
  recebe confirmação ao entrar e, na mudança de etapa, **só se a etapa destino tem
  `crm_etapas.notifica_lead = true`** (ligado por etapa em `/admin/parametros`;
  etapas sem texto em `templates/etapa-lead.ts` ficam desabilitadas lá).
- Os dois disparos rodam em `after()` (`criarLead`, `moverLead`). `moverLead` lê
  o status **antes** do RPC `mover_lead_crm` (que segue sendo a única forma de mover);
  etapa igual à atual não envia nada.
- **Aviso ao lead é agendado +10 min** (`scheduledAt` do Resend). Qualquer movimento
  posterior do mesmo lead — inclusive o "desfazer" do quadro, que também chama
  `moverLead` — **cancela primeiro** os `etapa-lead` ainda `agendado` com horário
  futuro (`cancelarAgendados`) e só depois agenda o novo. Se o Resend recusar o
  cancelamento (já enviado), a linha não é marcada `cancelado`.
- Cada tentativa vira linha em `crm_emails` (migration 025), escrita com a service
  role (sem policy de escrita para `authenticated`; leitura só `eh_admin()`).
  `agendado` não vira `enviado` sozinho (sem webhook): compare `agendado_para` com agora.
- Templates em `lib/email/templates/` são funções puras; todo dado do visitante passa
  por `escaparHtml`. Copy para o lead nunca promete aprovação de crédito.
- `TEXTO_CONSENTIMENTO` não muda por causa disto: são e-mails transacionais sobre o
  pedido da própria pessoa. A regra de só mudá-lo com a CAPI continua valendo.
- `enviado_whatsapp` em `leads` ficou sem uso (a coluna foi mantida; o stub de
  WhatsApp foi removido).

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
  texto. O PNG é a fonte da verdade, mas **o servidor não o lê do disco**: usa
  `lib/imoveis/marca-dagua-asset.ts`, gerado por `scripts/gerar-asset-marca.mjs`
  com os bytes em base64. Trocou o PNG, rode o script.

- **Fotos servidas por `next/image`** (`components/imoveis/ImagemImovel.tsx`), só as
  do bucket público `imovel-images`: `images.remotePatterns` em `next.config.ts` (host
  derivado de `NEXT_PUBLIC_SUPABASE_URL`) e predicado `ehImagemOtimizavel`
  (`lib/imoveis/imagem-otimizada.ts`); URL fora do bucket vai `unoptimized`. A lista
  `deviceSizes`/`imageSizes` é curta de propósito: cada largura x formato é uma
  transformação e o Hobby tem cota mensal; não acrescente tamanho sem motivo. Os
  `sizes` espelham o CSS (a foto ativa do carrossel é escalada 1.5x). og:image,
  JSON-LD e sitemap seguem com a URL original do Supabase, nunca `/_next/image`.
  Uploads novos saem com `cacheControl` de 1 ano (nome UUID imutável); os antigos
  seguem com 1h.
- **Carregamento do carrossel é por proximidade, não `loading="lazy"`**: lazy nativo
  dentro do `overflow:hidden` do Embla nunca dispara. Um IntersectionObserver
  (`rootMargin` 600px) liga `perto`; antes disso só o slide 0 da primeira galeria
  tem `<img>`, o resto é a caixa `.im-carrossel-reserva`. O fade-in é CSS
  (`img[data-fade]`), ativo só com `@media (scripting: enabled)`.

### Texto de descoberta (alt, title, description)
Tudo derivado do cadastro em `lib/imoveis/seo.ts`, travado em
`tests/unidade/imoveis-seo.test.ts`. Nenhuma dessas funções devolve vazio.

- **`alt`** de imagem de imóvel vem dos dados: `altDoImovel` monta
  "`{tipo} {nome} — {bairro}, {cidade}`" (hero e card), e `altDaImagem` monta
  "`{ambiente} — {nome}, {cidade}`" nas galerias. O carrossel e a galeria de
  plantas exigem a prop `contexto` (de `contextoDoImovel`) justamente para
  isso: "Sala de estar" sozinho não diz de qual empreendimento é a sala, e é
  fora da página que o Google Imagens mostra a foto.
- **`alt=""` continua certo** para imagem cujo texto adjacente, dentro do
  mesmo link, já é equivalente — capa de card de post (o `<h3>` ao lado é o
  mesmo texto) e as fotos dos cards de serviço da home. Repetir ali só faria o
  leitor de tela ler duas vezes. A regra é: `alt` que **acrescenta** informação
  entra; `alt` que duplica o vizinho, não.
- **`title`/`description`** de imóvel saem de `tituloDoImovel` e
  `descricaoDoImovel`. `seo_title`/`seo_description` do admin mandam quando
  existem — o template não reescreve copy que uma pessoa escolheu. Sem elas,
  monta do cadastro: título ganha tipo, cidade e marca; a description desce
  para `descricao_breve` e, faltando as duas, vira frase montada. Sem isso um
  imóvel cadastrado sem os campos saía **sem meta description nenhuma**, e aí
  quem escreve o resumo na SERP é o Google.
- Todo texto de meta passa por `normalizarTexto`. `seo_description` é textarea:
  quebra de linha ali vira quebra **literal** dentro do atributo `content`. O
  HTML segue válido e nada reclama — só aparece lendo o fonte servido (foi o
  caso do Jabô Studio).
- **O modal de lead nunca abre sozinho.** Só por clique em
  `[data-abrir-lead]`, via delegação em `LeadImovelModal`. Nada de timer, de
  scroll nem de exit-intent: modal que cobre o conteúdo sem o visitante pedir é
  intersticial intrusivo, penalizado no mobile.
- **`VideoObject` só com todos os campos obrigatórios** (`name`,
  `description`, `thumbnailUrl`, `uploadDate`). Sai de `montarVideoObjectSchema`
  (`lib/imoveis/schema.ts`) **apenas** quando há URL de YouTube reconhecível,
  descrição e `video_data_publicacao` (coluna da migration 026, preenchida no
  admin ao lado da URL do vídeo). Sem a data, não é emitido: não dá para obtê-la
  em build sem chamar a API do YouTube, e schema incompleto cria erro de rich
  result novo — foi assim que o `Product` sem `offers` apareceu. A thumbnail é
  `img.youtube.com/vi/<id>/hqdefault.jpg`. Vale para as duas modalidades.

### Modalidade: lançamento x pronto
`imoveis.modalidade` (migration 026; `lancamento` por padrão, então todo imóvel
antigo segue igual) separa **empreendimento** de **imóvel pronto / unidade
única**. É a mesma tabela, a mesma listagem `/imoveis/` (filtro "Lançamento /
Pronto" em `ImoveisFiltro`, que só aparece com as duas modalidades publicadas)
e a mesma rota `/imoveis/<slug>/`: **nenhuma URL nova**, layout por modalidade.

- Pronto usa colunas de valor único (`area_util`, `area_total`, `dormitorios`,
  `suites`, `banheiros`, `vagas`, `valor_venda`, `valor_condominio`, `valor_iptu`,
  `nome_condominio`, `andar`, `mobiliado`, `ano_construcao`) no lugar das faixas
  `*_min/_max`, e não tem tipologias, fase de obra, plantas, decorado nem
  realização. A página mostra a "Ficha do imóvel" (`fichaDoPronto`,
  `lib/imoveis/ficha.ts`) e "Outros imóveis". Ordem das seções: vídeo, fotos da
  unidade, descrição da unidade, fotos do condomínio, o condomínio, lazer,
  diferenciais, localização, CTA final, outros imóveis, FAQ.
- **Capa do pronto** (`imoveis.capa_origem`, migration 028): `unidade` (padrão,
  grupo `decorado`) ou `condominio` (grupo `empreendimento`), escolhida em "Foto
  de capa" nos dados gerais (`CamposPronto`). Se o grupo escolhido está vazio, cai
  para o outro. `capaDaPagina`/`capaDoCard` (`lib/imoveis/capa.ts`) e
  `grupoDaCapa`/`achatarGaleria` (`lib/imoveis/galeria.ts`) recebem a origem;
  lançamento a ignora.
- **Endereço exato só com `exibir_endereco`** (padrão `false`): sem ele, nem o
  texto nem o `q=` do mapa embutido levam o endereço — só bairro e cidade.
- Imóvel removido ou despublicado (ex.: vendido): `/imoveis/<slug>/` faz redirect
  permanente (308) para `/imoveis/` — nunca 404. Não é preciso cadastrar redirect
  por slug. Vale também para slug desconhecido ou malformado; a page e o
  `generateMetadata` chamam `permanentRedirect`, travado em
  `tests/unidade/imovel-removido-redirect.test.ts`.
- **Fase fixa**: pronto sempre tem `fase_id` = fase `pronto`. A action
  `salvarImovel` busca e grava (descartando o que o cliente mandar) e o trigger
  `imoveis_fase_pronto` da 026 garante no banco. A modalidade **não muda**
  depois de criada (a action recusa): trocar deixaria colunas da outra órfãs e
  mudaria o layout de uma URL já indexada.
- Validação: `imovelFormSchema` é `discriminatedUnion("modalidade")`; payload sem
  `modalidade` vale como `lancamento` (formato anterior). O editor monta o
  payload em `lib/imoveis/formulario.ts` e os blocos de campos vivem em
  `components/admin/imovel/` — `/admin/imoveis/novo` pergunta a modalidade antes.
- **Galerias do pronto** reaproveitam os grupos do banco, sem migration de grupo:
  `decorado` = **Fotos da unidade** (aparece primeiro no admin e na página) e
  `empreendimento` = **Fotos do condomínio**; planta/implantação não existem para
  pronto. A capa (hero, og:image, card) é a primeira foto da unidade, caindo para a
  do condomínio (`lib/imoveis/capa.ts`; `achatarGaleria(grupos, modalidade)` marca
  o `destaque` no grupo certo). `descricao_unidade` (migration 027, só pronto) é a
  "Descrição da unidade"; no pronto `descricao_completa` passa a ser a descrição do
  **condomínio**. Ordem da página: vídeo, fotos da unidade, descrição da unidade
  (texto + ficha), fotos do condomínio, o condomínio, localização, lazer,
  diferenciais, CTA, outros imóveis, FAQ. O hero mostra "Valor de venda" e, abaixo,
  condomínio e IPTU por mês (mesmo com o valor "sob consulta"). A ficha da descrição
  **não** repete condomínio nem IPTU (só o hero os mostra).
- Schema: pronto gera `Offer` simples com `valor_venda` (nunca `AggregateOffer`;
  `valor_a_partir_de` e tipologias são ignorados) e, **além do `Product`**,
  um nó `RealEstateListing` complementar (`montarRealEstateListingSchema`),
  também suprimido por `valor_sob_consulta`. Lançamento nunca emite o nó.

### Dados estruturados dos imóveis
A página de imóvel usa `@type: Product` com **`offers` obrigatório**: o Google
exige `offers`, `review` ou `aggregateRating`, imóvel não tem os dois últimos, e
`Product` sem nenhum deles é **erro crítico** no teste de resultados aprimorados
— não aviso. `RealEstateListing` é camada complementar (só em imóvel pronto), nunca substituição.

Tudo sai de `montarOfferSchema` (`lib/imoveis/schema.ts`), módulo puro travado
em `tests/unidade/imoveis-schema.test.ts`. `priceCurrency` é sempre `BRL`.

- `availability` vem da **fase de obra**, com o status na frente: `vendido` e
  `inativo` → `SoldOut`; `reservado` → `LimitedAvailability`; senão
  `pre_lancamento`/`lancamento`/`em_construcao` → `PreOrder` e `pronto` →
  `InStock`. Quem compra na planta não recebe a chave hoje — só imóvel entregue
  é `InStock`. Os slugs espelham os seeds de `imovel_fases` (migration 011).
- `AggregateOffer` **só quando há faixa real** (teto acima do piso); com um
  preço só, `Offer` simples. `lowPrice` igual a `highPrice` descreve uma faixa
  que não existe, e teto abaixo do piso reprova o rich result.
- `valor_sob_consulta` tem precedência sobre o valor, **igual à página**: nem
  hero, nem tabela de tipologias, nem barra fixa mostram preço. Então o JSON-LD
  também não mostra — nem o das tipologias. Marcação tem de representar o
  conteúdo visível, e publicar ali entregaria de graça, na SERP, o preço que o
  cadastro escondeu.
- Sem preço publicável a página cai para **`Residence`**, que descreve a mesma
  coisa e não exige oferta. `Product` inválido é pior que marcação nenhuma:
  põe em dúvida o resto da página. Efeito colateral: esse imóvel não gera rich
  result — para gerar, é preciso desligar `valor_sob_consulta`, que é decisão
  comercial, não técnica.
- `priceValidUntil` fica fora de propósito: não há regra de validade no
  cadastro, e data vencida derruba o rich result. Campo ausente > campo vencido.

### Inventário de JSON-LD por rota
Tudo sai de construtores puros em `lib/seo/` (travados em
`tests/unidade/seo-estruturados.test.ts`). O layout declara `#negocio`,
`#rafael` e `#website` (sem `SearchAction`: não há busca no site).

- `/financiamento/`, `/home_equity/`: Service (`areaServed` de `CIDADES_ATENDIDAS`
  via `areaServida`), BreadcrumbList e FAQPage. O FAQ visível e o JSON-LD saem do
  mesmo array em `lib/seo/faqs-landings.ts` — edite lá, nunca no JSX. Fecham com
  o bloco "Leia também" (3 posts mais recentes da categoria).
- `/sobre/`: BreadcrumbList. `/blog/`: BreadcrumbList + ItemList (ordem exibida).
  `/imoveis/`: BreadcrumbList + ItemList. Artigo e imóvel: ver seções acima.
- Sitemap: posts (capa) e imóveis (capa + galerias) levam `images`.
- **`title.template` não foi adotado**: os sufixos das páginas divergem ("— Rafael
  Teixeira · Capital Imobiliário", "| Rafael Teixeira", "| RT Capital Imobiliário",
  artigo sem sufixo). Um template único mudaria o `<title>` final de várias.
- Rótulos de seção da página de imóvel são `<h2 class="eyebrow">` (regra
  `h2.eyebrow` em `lp.css` zera o estilo de h2).

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
Fontes hospedadas em `app/fonts/` via `next/font/local` (woff2 latin em `app/fonts/arquivos/`); os 3 root layouts importam de lá.
Cores: `--jade`, `--bronze`, `--abissal`, `--marfim`, `--areia`, `--tinta`,
`--branco`, `--erro`, `--aviso` (`#b8860b`, amarelo-ouro só do admin: contorno de
lembrete vencendo; ≥3:1 sobre branco como elemento não textual, **nunca em texto**).

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
- Toda rota indexável emite `alternates.canonical` **auto-referenciada, relativa
  e com barra final** — a barra acompanha o `trailingSlash: true`, senão a
  canonical aponta para a URL que redireciona em vez da final. Canonical
  condicional é armadilha: o `alternates` do artigo saía de um ternário sobre
  `posts.canonical_url`, coluna opcional que só os posts migrados do site antigo
  têm preenchida, e por isso 3 dos 6 artigos eram servidos **sem canonical
  nenhuma** — o Google escolheu a dele e reportou "Cópia — Google escolheu
  canônica diferente". Agora passa por `canonicalDoArtigo`
  (`lib/blog/blog.ts`), que nunca devolve vazio, travada em
  `tests/unidade/blog-canonical.test.ts`. Nada avisa quando isso quebra: a
  página renderiza perfeita, só o `<head>` fica mudo.
- As entidades JSON-LD `#negocio` e `#rafael` são declaradas **uma única vez**,
  no layout, a partir de `lib/seo/negocio.ts`. Não redeclare em página, ou
  voltam as entidades conflitantes.
- O `image` do BlogPosting concatenava `SITE_URL` com a capa, que já é URL
  absoluta do Supabase: saía `https://rtcapitalimobiliario.com.brhttps://...`
  em todo artigo com capa. O JSON-LD do artigo agora vem de `montarJsonLdArtigo`
  (`lib/blog/json-ld.ts`), travado em `tests/unidade/blog-json-ld.test.ts`.
  Toda URL que pode vir absoluta ou relativa passa por `urlAbsoluta`
  (`lib/og.ts`), nunca por concatenação com `SITE_URL`.
- Formatar data em qualquer componente que renderiza no servidor exige `timeZone: "America/Sao_Paulo"` (o servidor é UTC): use `formatarData` de `lib/crm/tempo.ts`. Sem isso o texto do SSR difere do hidratado e dá React #418 — foi o caso de `/admin/parametros`.
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
- Arquivo em `public/` **não entra no bundle da função serverless** da Vercel:
  ele é publicado na CDN, não no filesystem do lambda. Um
  `readFile(process.cwd() + "/public/algo")` funciona no `next dev` e falha em
  produção com ENOENT. Foi assim que todo upload de imagem do admin quebrou em
  produção. Asset que o servidor precisa ler vai embutido no bundle (base64 num
  módulo), não lido do disco.
- `catch` que não registra a exceção transforma bug de 5 minutos em
  investigação de hora. O `catch` mudo de `enviarImagem` devolvia "Não foi
  possível processar a imagem." e não deixava **nada** no log da Vercel — sem
  causa, sem stack, sem pista. Sempre `console.error` antes de converter
  exceção em mensagem amigável.
- Texto acentuado num SVG rasterizado pelo `sharp` sai corrompido se o buffer
  não for montado como UTF-8 explícito: a primeira versão de `marca-dagua.png`
  ficou com "CAPITAL TMOBILIARIO" — e ninguém percebe olhando o código, só
  abrindo o PNG. Escreva acento como entidade numérica (`&#193;`) no SVG e
  **confira o PNG gerado sobre fundo escuro** antes de commitar.
- `DndContext` do dnd-kit precisa de `id` fixo quando a página é renderizada no
  servidor: sem ele o `aria-describedby` dos itens vem de um contador de módulo
  que diverge entre servidor e cliente e quebra a hidratação.
- Build da Vercel quebrou em `next/font/google` (`Cannot read properties of null (reading '1')`): o Google passou a devolver URLs de fonte sem extensão às máquinas de build. Por isso as fontes são locais. Peso novo exige baixar o woff2 `latin` para `app/fonts/arquivos/` e declarar em `app/fonts/index.ts` — nunca volte ao `next/font/google`.
- Estas quatro decisões de estrutura **parecem** desvio da convenção do Next e
  não são — não as "conserte":
  1. **Não existe `app/layout.tsx`.** São dois root layouts,
     `app/(site)/layout.tsx` e `app/admin/layout.tsx`. Criar um layout raiz
     obrigaria o admin a herdar nav, rodapé e design system do site. É essa
     ausência que exige o `app/global-not-found.tsx` (flag
     `experimental.globalNotFound`) para a URL que não casa com rota nenhuma.
  2. **`app/actions/` fica sem underscore.** A convenção de pasta privada
     (`_actions`) existe, mas a pasta já não é roteável (não tem `page` nem
     `route`) e `actions` não é nome reservado. Renomear custaria ~20 imports
     e 4 documentos por ganho estilístico.
  3. **`middleware.ts` não vira `proxy.ts`** enquanto o projeto estiver no
     Next 15. `proxy.ts` é convenção do Next 16 — antes disso, quebra.
  4. **A nav usa `<a>`, não `<Link>`.** É medição, não descuido:
     `gtag('config')` roda uma vez por carga de página e é ele quem manda o
     `page_view`. Com navegação client-side o GA4 contaria só a primeira
     página de cada sessão, e a conversão `generate_lead` do Google Ads é
     importada dali. A regra `@next/next/no-html-link-for-pages` está
     desligada no `eslint.config.mjs` por causa disso; para religar, primeiro
     dispare `page_view` a cada mudança de rota em `lib/analytics/eventos.ts`.
- **Escrita de conteúdo é só para admin, nas duas camadas.** Policy de escrita
  usa `public.eh_admin()` (migration 020), **nunca** `auth.role() =
  'authenticated'`: esta última deixa qualquer corretor logado apagar posts,
  imóveis e imagens. Policy nova de escrita sem `eh_admin()` é regressão. Na
  aplicação, o ponto único da checagem é `exigirAdmin()` em `lib/admin/auth.ts`
  (toda action de `admin-posts`, `admin-imoveis` e `admin-parametros` começa
  por ele; as páginas usam `garantirAdminOuRedirecionar()` nos layouts de
  `posts/`, `imoveis/` e `parametros/`). As ações do CRM seguem a RLS do CRM.
- **`profiles.role` nunca pode ser atualizável pelo próprio usuário.**
  `profiles_update_own` filtra a *linha*, não a *coluna*: sem revogar o
  privilégio de coluna, qualquer logado fazia `update profiles set role =
  'admin'` e passava em `eh_admin()` e em toda policy. A 020 deixa só
  `full_name, phone, avatar_url, creci` com UPDATE. Coluna nova em `profiles`
  nasce **sem** grant — conceda explicitamente só se for editável pelo dono.
- Coleção filha gravada em várias chamadas (apagar, depois inserir/atualizar)
  deixa a lista pela metade se uma falhar. Tipologias, diferenciais, FAQs,
  imagens do imóvel e tags do lead vão por RPC `security invoker` (migration
  021), uma transação por coleção.
- A tabela `supabase_migrations.schema_migrations` tinha versões por timestamp (apply
  via MCP) e não listava as migrations aplicadas à mão; a `018b` existia só em
  produção (hoje `0181_*`). Versão ausente ali = `db push` reexecuta o arquivo.
- `eslint .` tem de sair com zero erro e zero aviso — é assim que a suíte está
  hoje. Regra desligada exige comentário com o motivo e a condição de voltar,
  no próprio `eslint.config.mjs`. Não silencie aviso sem justificar.

## Como trabalhar comigo neste projeto

Toda melhoria ou ajuste segue cinco etapas, cada uma com seu modelo:

1. **Planejar — Opus 5.5.** Levantamento, decisões de arquitetura, especificação.
2. **Desenvolver — subagente Sonnet 5.5.** A implementação derivada do plano.
3. **Publicar a branch.** PR aberto e deploy de preview da Vercel verde.
4. **Testar — novo subagente Sonnet 5.5.** Roda `npm run e2e` contra a URL do deploy da
   branch (`E2E_BASE_URL=<deploy>`), com as skills `playwright-e2e` e
   `superpowers:test-driven-development`, e salva o relatório em `tests/functional-tests/`.
5. **Validar — Opus 5.5.** Revisa o relatório; só com veredito APROVADO faz o merge em `Preview`.

Segurança dos testes: todo deploy usa o MESMO banco de produção, então a suíte é somente
leitura (nada de excluir, mover lead, publicar, salvar ou enviar formulário público) — política
completa em `tests/functional-tests/README.md`. Os specs de admin precisam de um usuário de QA
dedicado em `.env.e2e.local` (modelo: `.env.e2e.local.example`); sem ele são pulados.

Para qualquer diretiva de design, carregar **sempre** as duas skills: `frontend-design`
(web design) e `ui-ux-pro-max`.

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
Slugs de imóvel (`/imoveis/<slug>/`) são cobertos pela regra de redirect 308 para `/imoveis/` quando o imóvel é removido ou despublicado (ver "Modalidade").
