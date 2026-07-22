# CLAUDE.md — Site Capital Imobiliário

Memória de projeto. Carregada automaticamente no início de cada sessão do Claude Code.
Leia por completo antes de propor ou fazer qualquer alteração.

---

## O que é este projeto

Site institucional e de geração de leads de **Rafael Teixeira · Capital Imobiliário**
(CRECI-SP) — corretor de imóveis e correspondente bancário atuando em **Vinhedo/SP e região**
(Valinhos, Louveira, Jundiaí, Campinas, Itatiba, Indaiatuba, Sumaré).

Dois produtos de crédito em produção: **Financiamento imobiliário (SBPE)** e **Home Equity**
(crédito com garantia de imóvel). **Consórcio** está planejado (aparece como card "em breve"
na home). O posicionamento central: cotação multibanco, comparação por Custo Efetivo Total,
e recomendação do "menor crédito que resolve".

O site hoje é **estático** e hospedado na **HostGator (cPanel)**. Domínio:
`rtcapitalimobiliario.com.br`. GA4 ativo (`G-N5PFHEHGZ6`).

---

## Regra de ouro: rode os testes antes de cada commit

Há duas suítes. **Ambas devem passar (40 testes no total) antes de qualquer commit.**

```bash
# da raiz do repositório
python -m unittest tests.test_estrutura -v     # 31 testes estruturais (Python)
node --test tests/financeiro.test.js           # 9 testes de matemática financeira (Node)
```

Se você alterar estrutura de páginas, assets, nav, SEO ou a lógica dos simuladores,
atualize/estenda os testes na mesma mudança — eles já pegaram regressões reais neste projeto.

---

## Estrutura de arquivos

O conteúdo publicável fica em `dist/` — é o que sobe para a raiz do domínio na HostGator.

```
dist/
  index.html                 home institucional (cards de produto)
  financiamento/index.html   LP financiamento SBPE
  home_equity/index.html     LP home equity
  sobre.html                 sobre
  blog/
    index.html               índice do blog (renderizado de posts.js)
    <slug>/index.html         cada matéria
  assets/
    css/  lp.css (design system) · home.css (cards home) · blog.css
    js/   ver "camadas de JS" abaixo
  images/                     background.jpg, rafael-teixeira.jpg, blog-background.jpg, blog/<slug>.jpg
  sitemap.xml · robots.txt · .htaccess
tests/
  test_estrutura.py          suíte estrutural (Python/unittest)
  financeiro.test.js         suíte de matemática (Node --test)
apps-script/Code.gs          Google Apps Script que grava leads no Sheets
content/blog/                 markdown-fonte dos artigos (antes de virar HTML)
README.md · README-blog.md   documentação de manutenção
```

---

## Convenções que NÃO devem ser quebradas

1. **Zero JavaScript e CSS inline nas páginas.** Todo `<script>` tem `src` (ou é JSON-LD);
   todo estilo vem de arquivo em `assets/css/`. Há teste que falha se aparecer script/style
   inline. Para passar dado de página → JS, use `data-*` no `<body>` (ver blog-artigo.js).

2. **Cache-busting por querystring.** Todos os `<link>`/`<script>` de assets terminam em
   `?v=N`. Ao alterar qualquer CSS/JS, suba o N em TODAS as páginas que referenciam o asset
   e mantenha o número consistente no site inteiro. **Só suba o N quando o commit for pedido**
   (ver seção "Como trabalhar comigo") — não a cada edição intermediária. Versão atual: **v=11**.

3. **Design system em CSS custom properties** (definidas em `lp.css`). Cores: `--abissal`
   (verde muito escuro), `--jade`, `--bronze`, `--areia`, `--marfim`, `--branco`, `--tinta`.
   Fontes: `--display` (Libre Caslon Display), `--sans` (Archivo), `--mono` (IBM Plex Mono),
   `--texto` (Libre Caslon Text). NÃO introduza cores/fontes fora dessas variáveis.

4. **Caminhos absolutos** (`/assets/...`, `/financiamento/`) — o site usa URLs em árvore com
   pastas, não arquivos `.html` soltos. `.htaccess` faz 301 de `/financiamento.html` legado.

5. **Português (pt-BR) em toda a interface e conteúdo.** Nomes de IDs/classes/variáveis no
   código também seguem português (ex.: `montarLead`, `c-nome`, `validaBloco`).

---

## Camadas de JS (separação por responsabilidade)

- `analytics.js`   — GA4 + helper `evento(nome, params)` tolerante a falha (adblock).
- `reveal.js`      — fade-in on-scroll das seções `.reveal`.
- `nav.js`         — dropdown "Soluções de Crédito" (toque no mobile, hover no desktop).
- `financeiro.js`  — **funções PURAS** (SAC, Price, CPF, formatação). Sem DOM. Testável em Node.
                     É a única fonte da matemática dos simuladores. Alterou aqui → rode os testes.
- `modal-form.js`  — **motor genérico** do formulário de captação em 3 etapas. Não contém regras
                     de página; cada LP declara sua config (campos, validadores, payload, máscaras).
- `financiamento.js` / `home-equity.js` — config do formulário + simulador de cada LP.
- `posts.js`       — **fonte única de dados do blog** (ver abaixo).
- `blog-index.js`  — renderiza o índice a partir de posts.js (destaque + grade + filtro + "carregar mais").
- `blog-artigo.js` — renderiza os 3 "relacionados" de cada artigo.
- `home.js`        — eventos dos cards da home.

---

## Blog (importante para a próxima fase)

Renderizado **client-side a partir de `dist/assets/js/posts.js`** — um array `window.BLOG_POSTS`
com os campos: `slug, titulo, categoria, rotulo, data (dd-mm-yyyy), resumo, imagem, destaque`.
Categorias válidas: **Financiamento · Home Equity · Consórcio · Imóveis** (config em
`window.BLOG_CATEGORIAS`: cor do rótulo + LP de destino do CTA).

Índice: matéria em destaque (única com `destaque:true`) em linha única + grade 3×3 (9) = 10
visíveis, com "carregar mais" (+6) e filtro por categoria. Cada artigo tem imagem-hero, corpo,
CTA para a LP da categoria e 3 relacionados da mesma categoria.

**Decisão de arquitetura do admin (tomada — ver `ESPECIFICACAO-ADMIN-BLOG.md`): opção C.**
O site continua 100% estático na HostGator; o admin é uma **ferramenta local** (CLI, depois UI
web local em `localhost`) que gera os artefatos (`dist/blog/<slug>/index.html`, `posts.js`,
`sitemap.xml`) a partir de markdown com frontmatter em `content/blog/`. Sem backend em produção,
sem banco, sem autenticação; o deploy continua manual no cPanel. Isso preserva uma porta aberta
para uma migração futura para a **opção A** (páginas regeneradas a partir de banco, Vercel +
Supabase) — por isso URLs `/blog/<slug>/` são imutáveis e o markdown é sempre a fonte da verdade
(HTML/posts.js nunca editados à mão, sempre derivados). Ver `ESPECIFICACAO-ADMIN-BLOG.md` para
o escopo completo da v1 e `README-blog.md` para o fluxo manual atual de publicação.

---

## Leads

Os formulários das LPs enviam JSON (via `fetch` no-cors) para um **Google Apps Script**
(`apps-script/Code.gs`), que grava na aba certa do Google Sheets conforme o campo `aba` do
payload (`Financiamento` / `Home Equity`), com mapa de colunas declarativo por aba. O endpoint
está hardcoded uma única vez, no topo de `modal-form.js`. Se mudar os campos do formulário,
ajuste também o mapa correspondente em `Code.gs`.

---

## Ambiente

- Plataforma atual: **Windows nativo** (win32-x64). Para o site estático + testes + git,
  funciona bem. Quando o **admin panel** entrar (Node/backend), avalie mover para **WSL2** —
  o Windows nativo tende a dar atrito com file watchers e caminhos POSIX em stacks Node/Next.
- Testes precisam de **Python 3** e **Node 18+** no PATH.
- Deploy atual é **manual**: subir o conteúdo de `dist/` no cPanel da HostGator. Não há CI ainda.

---

## Estado atual e próximos passos

- **Pronto e em produção:** home, LP financiamento, LP home equity, sobre, blog (índice +
  1º artigo "Home Equity para Empresário"), roteamento de leads por aba, SEO local de Vinhedo
  reforçado na LP de home equity.
- **Pendências conhecidas:** imagens dos cards da home (`card-financiamento.jpg`,
  `card-home-equity.jpg`) e a imagem do 1º artigo (`images/blog/home-equity-empresario.jpg`)
  ainda não foram enviadas — hoje caem em fallback de degradê.
- **Próxima fase:** admin panel do blog, opção C (ferramenta local, ver `ESPECIFICACAO-ADMIN-BLOG.md`).
  Fases 1 (motor: parser de frontmatter + `blog:validar`), 2 (`blog:gerar`: templates em
  `tools/templates/`, geração de `dist/blog/<slug>/index.html`, `posts.js` e sitemap a partir
  de `content/blog/*.md`, idempotente, com `marked` para markdown→HTML) e 3 (`blog:versao`:
  sobe o `?v=N` em todo o site de forma consistente, propagando aos templates do blog; `blog:nova`:
  cria um `.md` esqueleto guiado via prompts interativos) já em `tools/blog/`. Falta só a fase 4
  (opcional): UI web local em cima do mesmo motor.
- **Estratégia (não é trabalho de código):** SEO forte em Vinhedo, mais artigos de blog.
  A transição para Cachoeiro de Itapemirim/ES saiu do planejamento até nova ordem.

---

## Como trabalhar comigo neste projeto

- Faça a menor alteração que resolve; não refatore o que está funcionando sem pedir.
- Toda mudança de código termina com as duas suítes de teste passando.
- **Não suba o `?v=N` a cada alteração de CSS/JS.** Só rode `blog:versao` (ou ajuste o
  cache-busting manualmente) quando eu pedir explicitamente o commit — pode haver várias
  rodadas de ajuste em CSS/JS antes de eu querer subir pra produção, e versionar cedo demais
  gera bump desnecessário no meio do trabalho.
- Commits pequenos e descritivos, em português.
- **Modelo por tipo de atividade:** planejamento, criação de especificação (ex.:
  `ESPECIFICACAO-ADMIN-BLOG.md`) ou qualquer diretiva de arquitetura deve ser feito com
  **Fable 5** (quando disponível) ou **Opus 4.8** como alternativa. As atividades derivadas
  desses artefatos (implementação, testes, tarefas mecânicas/repetitivas) devem rodar em
  subagentes com modelos mais econômicos (menor uso de tokens).
