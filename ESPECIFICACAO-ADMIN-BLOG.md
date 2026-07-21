# Especificação — Admin do Blog (fase estática / opção C)

Documento de trabalho para o Claude Code. Leia junto com o `CLAUDE.md` da raiz, que define
as convenções do projeto. Em caso de conflito, o `CLAUDE.md` prevalece nas convenções; esta
especificação prevalece no escopo.

---

## 1. Contexto e decisão de arquitetura

O blog hoje é publicado manualmente (fluxo descrito em `README-blog.md`): editar
`dist/assets/js/posts.js`, criar `dist/blog/<slug>/index.html` a partir de um artigo
existente, atualizar `sitemap.xml` e subir tudo no cPanel da HostGator.

**Decisão tomada (opção C):** o site continua 100% estático na HostGator. O admin é uma
**ferramenta local** que automatiza a geração desses arquivos. Não há backend em produção,
não há banco de dados, não há autenticação — a ferramenta roda na máquina do Rafael
(`localhost`), e o deploy continua sendo a subida do `dist/` no cPanel.

**Porta aberta para o futuro (opção A):** mais adiante o blog pode migrar para páginas
regeneradas a partir de um banco (Vercel + Supabase). Esta fase deve preservar essa
possibilidade. As três apólices de seguro, que são REQUISITOS desta especificação:

1. **URLs imutáveis** — o padrão `/blog/<slug>/` não muda nunca. É o que preserva o SEO
   numa migração futura.
2. **Markdown como fonte da verdade** — todo artigo existe como arquivo `.md` com
   frontmatter em `content/blog/`. O HTML em `dist/` é sempre DERIVADO do markdown,
   nunca editado à mão. Com isso, um futuro banco é populável por script a partir do repo.
3. **`posts.js` gerado, nunca editado à mão** — ele vira artefato de build, derivado dos
   frontmatters.

## 2. Escopo da v1

Uma ferramenta local chamada pelo terminal na raiz do repo, com duas interfaces:

- **CLI** (essencial): comandos para criar, regenerar e validar matérias.
- **UI web local** (desejável, segunda etapa): um `localhost` simples com formulário para
  criar/editar matéria sem tocar em arquivo — por baixo, usa exatamente o mesmo motor da CLI.

### 2.1 Fonte da verdade: o markdown com frontmatter

Formato já existente em `content/blog/home-equity-empresario-capital-de-giro.md`:

```
---
titulo: "..."
slug: home-equity-empresario-capital-de-giro
meta_titulo: "..."
meta_descricao: "..."
categoria: Home Equity        # uma de: Financiamento | Home Equity | Consórcio | Imóveis
cta_pagina: /home_equity/
---
# Título (H1)
corpo em markdown…
```

Campos a ACRESCENTAR ao frontmatter (a v1 formaliza o schema):

```
rotulo: "Garantia de imóvel"   # texto curto sobre a imagem do card
data: 21-07-2026               # dd-mm-yyyy
resumo: "..."                  # chamada do card (até ~220 caracteres)
imagem: /images/blog/<slug>.jpg
destaque: true|false           # no máximo UM artigo com true em todo o repositório
```

### 2.2 Comandos da CLI

```
npm run blog:nova            # cria um .md esqueleto em content/blog/ com frontmatter guiado
npm run blog:gerar           # regenera TUDO a partir de content/blog/:
                             #   - dist/blog/<slug>/index.html (um por artigo)
                             #   - dist/assets/js/posts.js (ordenado por data desc)
                             #   - dist/blog/index.html (se o template mudar)
                             #   - sitemap.xml (acrescenta/atualiza URLs do blog)
npm run blog:validar         # valida sem gerar: schema do frontmatter, slug único e
                             #   kebab-case, data dd-mm-yyyy, categoria válida, um único
                             #   destaque:true, imagem referenciada existe (warning se não)
npm run blog:versao          # sobe o ?v=N em todas as páginas (cache-busting)
```

`blog:gerar` deve ser **idempotente**: rodar duas vezes seguidas não altera nada na segunda.
Artigos removidos de `content/blog/` têm suas pastas removidas de `dist/blog/` (com aviso).

### 2.3 Geração do HTML do artigo

- Extrair o template do artigo existente
  (`dist/blog/home-equity-empresario-capital-de-giro/index.html`) para um arquivo de template
  (ex.: `tools/templates/artigo.html` com placeholders). O artigo existente passa a ser
  REGENERADO pelo template — validar com diff que a regeneração reproduz o arquivo atual
  (mesma estrutura; diferenças triviais de whitespace são aceitáveis).
- Conversão markdown→HTML: cobrir o subconjunto já usado (h2, parágrafos, strong, em,
  links, hr). Pode usar uma lib consolidada (ex.: `marked`) em vez do conversor artesanal,
  desde que a saída respeite as classes/estrutura do template atual.
- O head de cada artigo inclui: title/meta/canonical/OG e o JSON-LD `BlogPosting`
  (modelo no artigo existente), tudo derivado do frontmatter.
- CTA do artigo aponta para `cta_pagina`; os "relacionados" continuam client-side
  (`blog-artigo.js` + `data-artigo-*` no body) — não mudar esse mecanismo.

### 2.4 O que o gerador NÃO faz

- Não faz deploy. A subida para o cPanel continua manual (decisão consciente da opção C).
  NÃO implementar FTP com credenciais nesta fase.
- Não mexe nas LPs, na home, no sobre, nem nos formulários de leads.
- Não introduz framework de front-end. O site continua HTML/CSS/JS puro.

## 3. Convenções obrigatórias (resumo do CLAUDE.md)

- Zero JS/CSS inline nas páginas geradas (dados de página via `data-*` no body).
- Design system só via variáveis CSS de `lp.css`; pt-BR em tudo.
- Caminhos absolutos; URLs em árvore com barra final.
- Após gerar/alterar assets, subir o `?v=N` de forma consistente em todas as páginas.
- **As duas suítes de teste passam antes de qualquer commit.**

## 4. Testes exigidos na v1

Estender a suíte existente (ou criar `tests/test_blog_gerador.py` / `.test.js`):

1. `blog:validar` reprova: slug duplicado, categoria inválida, data fora de dd-mm-yyyy,
   dois artigos com `destaque:true`.
2. `blog:gerar` é idempotente (segunda execução não muda nenhum arquivo).
3. O artigo existente regenerado pelo template preserva: canonical, JSON-LD BlogPosting,
   `data-artigo-categoria`, CTA correto, zero scripts inline.
4. `posts.js` gerado: ordenado por data desc, campos completos, parseável em Node
   (os testes atuais de estrutura continuam passando por cima dele).
5. Sitemap contém exatamente as URLs `/blog/<slug>/` dos artigos existentes.

## 5. Ordem de construção sugerida

1. **Fase 1 — motor:** parser de frontmatter + validador (`blog:validar`) + testes do item 4.1.
2. **Fase 2 — geração:** template extraído + `blog:gerar` + prova de regeneração do artigo
   existente + `posts.js` + sitemap + testes 4.2–4.5.
3. **Fase 3 — conveniências:** `blog:nova`, `blog:versao`.
4. **Fase 4 (opcional, só depois de tudo verde):** UI web local em cima do mesmo motor.

Commits pequenos por fase, em português. Ao final de cada fase: as duas suítes + os novos
testes passando.

## 6. Fora de escopo (não fazer nem propor agora)

- Supabase, Vercel, SSR/ISR, autenticação, CI/CD, FTP automatizado.
- Alterações de design nas páginas existentes.
- Migração de hospedagem. (A opção A tem análise pronta; será outra especificação.)
