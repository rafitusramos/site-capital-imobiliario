# Migração RT Capital Imobiliário — Instruções para Claude Code (VSCode)

> Documento de execução. Siga as etapas **na ordem**. Cada etapa tem um prompt
> pronto para colar no Claude Code e um checkpoint de validação.
> Não pule os checkpoints: eles são o que impede que um erro de SEO chegue em produção.

---

## Regras invioláveis (leia antes de tudo)

Estas regras valem para **todas** as etapas. Se o Claude Code sugerir algo que as viole, recuse.

1. **Nenhum slug muda.** As URLs atuais são a base do SEO. Migrar primeiro, otimizar depois.
2. **Nenhum texto de artigo é reescrito.** O conteúdo migra idêntico. Reescrita é outro projeto.
3. **Nunca misturar mudança de arquitetura com mudança de conteúdo** no mesmo deploy. Se algo cair de posição no Google, você precisa saber a causa.
4. **A `service_role key` do Supabase nunca vai para o cliente.** Só em código de servidor (Route Handlers, Server Components, Server Actions).
5. **Nada vai para produção sem passar por staging** e pelo crawl comparativo da Etapa 6.

---

## Pré-requisitos (fazer antes de abrir o Claude Code)

- [ ] Node.js 20+ instalado (`node -v`)
- [ ] Repositório Git do site atual aberto no VSCode
- [ ] Extensão do Claude Code instalada no VSCode
- [ ] Projeto criado no Supabase (região: São Paulo / `sa-east-1`)
- [ ] Conta na Vercel conectada ao repositório GitHub
- [ ] Acesso ao Google Search Console do domínio `rtcapitalimobiliario.com.br`
- [ ] Os arquivos `schema_inicial_capital_imobiliario.sql` e `migracao_posts_blog.sql` salvos numa pasta `/supabase` do repositório

### Chaves do Supabase

No painel: **Project Settings → API**. Você vai precisar de três valores:

| Valor | Onde usar |
|---|---|
| `Project URL` | público (`NEXT_PUBLIC_SUPABASE_URL`) |
| `anon public key` | público (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `service_role key` | **só servidor** (`SUPABASE_SERVICE_ROLE_KEY`) |

---

## Etapa 0 — Fechar o banco antes de tocar no código

Esta etapa é feita **no SQL Editor do Supabase**, não no Claude Code.

### 0.1 Rodar o schema inicial

Cole e execute o conteúdo de `schema_inicial_capital_imobiliario.sql`.

### 0.2 Corrigir campos faltantes do frontmatter

O schema inicial não contemplava três campos que o blog atual já usa. Rode este bloco:

```sql
-- Campos do frontmatter que existem no posts.js atual e faltavam no schema
alter table public.posts
  add column if not exists rotulo text,
  add column if not exists destaque boolean not null default false,
  add column if not exists cta_pagina text;

-- Garante que só exista UMA matéria em destaque por vez
create unique index if not exists idx_posts_destaque_unico
  on public.posts (destaque)
  where destaque = true;
```

### 0.3 Criar o usuário admin

1. Painel do Supabase → **Authentication → Users → Add user** → seu e-mail e senha.
2. Pegue o UUID gerado:

```sql
select id, email from auth.users;
```

3. Crie o profile (troque o UUID):

```sql
insert into public.profiles (id, full_name, role)
values ('COLE-O-UUID-AQUI', 'Rafael Teixeira', 'admin');
```

### 0.4 Rodar a migração dos posts

Cole e execute `migracao_posts_blog.sql`.

> **Atenção:** o script atual **não preenche** `rotulo`, `destaque` e `cta_pagina`.
> Rode o bloco abaixo logo depois, para completar os três posts:

```sql
update public.posts set rotulo = 'Garantia de imóvel', destaque = false, cta_pagina = '/home_equity/#simulador'
  where slug = 'home-equity-empresario-capital-de-giro';

update public.posts set rotulo = 'Garantia de imóvel', destaque = true,  cta_pagina = '/home_equity/#simulador'
  where slug = 'home-equity-o-que-e-como-funciona';

update public.posts set rotulo = 'Compra · SBPE',      destaque = false, cta_pagina = '/financiamento/#simulador'
  where slug = 'melhor-taxa-financiamento-imobiliario-bancos';
```

### ✅ Checkpoint 0

```sql
select slug, title, status, destaque, rotulo, cta_pagina, published_at
from public.posts order by published_at desc;
```

Deve retornar **3 linhas**, todas com `status = 'published'`, exatamente **uma** com `destaque = true`, e nenhum campo nulo.

---

## Etapa 1 — Preparar o repositório e o contexto do Claude Code

### 1.1 Criar o arquivo de contexto

Antes de pedir qualquer código, crie na raiz do repositório um arquivo `CLAUDE.md`.
Ele é lido automaticamente pelo Claude Code em toda sessão e evita que você repita contexto.

**Prompt para colar no Claude Code:**

```
Crie um arquivo CLAUDE.md na raiz do repositório com exatamente este conteúdo:

# RT Capital Imobiliário

Site de intermediação imobiliária e crédito. Domínio: rtcapitalimobiliario.com.br
Praça principal: Vinhedo/SP e região (Valinhos, Louveira, Jundiaí, Campinas, Itatiba).

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, Storage)
- Deploy: Vercel

## Estado atual
Site estático. O blog é renderizado client-side a partir de `window.BLOG_POSTS`
em posts.js, gerado por `npm run blog:gerar` a partir de content/blog/*.md.
Estamos migrando o blog para Supabase com renderização no servidor.

## Design
Direção: "Minimalismo Exagerado". Paleta preto quente + bronze-dourado.
Tipografia: Cinzel (títulos) e Josefin Sans (interface).
Variáveis CSS existentes: --jade, --bronze, --abissal.

## Categorias do blog
Financiamento, Home Equity, Consórcio, Imóveis.

## REGRAS INVIOLÁVEIS
1. Nenhum slug de URL pode mudar. As URLs atuais são a base do SEO.
2. Nenhum texto de artigo pode ser reescrito. Conteúdo migra idêntico.
3. SUPABASE_SERVICE_ROLE_KEY nunca pode aparecer em código de cliente.
4. Toda página indexável precisa de metadata (title, description, canonical).
5. Não crie páginas novas nem remova páginas existentes sem eu pedir.

## URLs que precisam continuar existindo
- /
- /financiamento/
- /home_equity/
- /sobre.html  (vira /sobre/ com redirect 301)
- /blog/
- /blog/home-equity-empresario-capital-de-giro/
- /blog/home-equity-o-que-e-como-funciona/
- /blog/melhor-taxa-financiamento-imobiliario-bancos/

Não faça mais nada além de criar este arquivo.
```

### 1.2 Criar a branch de trabalho

No terminal do VSCode:

```bash
git checkout -b migracao-nextjs-supabase
```

### ✅ Checkpoint 1

`CLAUDE.md` existe na raiz e você está numa branch separada da `main`.

---

## Etapa 2 — Scaffold do Next.js

**Prompt:**

```
Vamos iniciar a migração para Next.js. Nesta etapa, faça APENAS o scaffold:

1. Inicialize um projeto Next.js com App Router, TypeScript e Tailwind CSS
   na raiz do repositório, preservando os arquivos atuais do site
   (não delete nada de content/, images/ ou os HTML existentes).
2. Configure o Tailwind com as fontes Cinzel e Josefin Sans via next/font.
3. Porte as variáveis CSS existentes (--jade, --bronze, --abissal) para o
   globals.css, mantendo os mesmos valores hexadecimais do site atual.
   Leia os arquivos CSS atuais para extrair os valores exatos.
4. Crie o arquivo .env.local.example com as chaves:
   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
5. Garanta que .env.local está no .gitignore.

NÃO crie nenhuma página ainda. NÃO toque no conteúdo do blog.
Ao terminar, me mostre a árvore de diretórios resultante.
```

### ✅ Checkpoint 2

- `npm run dev` sobe sem erro
- `.env.local` está no `.gitignore`
- As cores em `globals.css` batem com as do site atual

---

## Etapa 3 — Camada de dados (Supabase)

**Prompt:**

```
Agora configure a camada de acesso ao Supabase.

1. Instale @supabase/supabase-js e @supabase/ssr.
2. Crie lib/supabase/client.ts (cliente browser, usa ANON key).
3. Crie lib/supabase/server.ts (cliente servidor, usa ANON key + cookies).
4. Crie lib/supabase/admin.ts (cliente com SERVICE_ROLE key).
   Este arquivo deve ter no topo a diretiva 'server-only' para garantir
   que nunca seja importado por código de cliente.
5. Crie types/database.ts com os tipos TypeScript das tabelas:
   profiles, categories, posts, imoveis, imovel_imagens, leads.
   Os campos de posts são: id, slug, title, excerpt, content, cover_image,
   category_id, author_id, status, published_at, seo_title, seo_description,
   canonical_url, rotulo, destaque, cta_pagina, created_at, updated_at.
6. Crie lib/queries/posts.ts com as funções:
   - getPublishedPosts()
   - getPostBySlug(slug)
   - getFeaturedPost()
   - getRelatedPosts(postId, categoryId, limit)

Use apenas o cliente ANON nas funções de leitura pública.
```

### ✅ Checkpoint 3

Peça ao Claude Code: *"Escreva um script temporário que chame `getPublishedPosts()` e imprima os slugs no console. Rode e me mostre a saída."*

Deve imprimir os **3 slugs**. Depois mande deletar o script.

---

## Etapa 4 — Blog renderizado no servidor

Esta é a etapa que gera o ganho de SEO. O conteúdo deixa de ser montado no navegador.

**Prompt:**

```
Implemente as páginas do blog com renderização estática (SSG) e revalidação (ISR).

1. app/blog/page.tsx — índice do blog.
   - Busca os posts publicados via getPublishedPosts()
   - A matéria com destaque=true aparece em linha única no topo
   - As demais entram na grade
   - Cada card exibe: imagem, rotulo sobre a imagem, categoria, título, resumo, data
   - A cor do rótulo segue a categoria: Financiamento e Home Equity usam var(--jade),
     Consórcio usa var(--bronze), Imóveis usa var(--abissal)
   - export const revalidate = 3600

2. app/blog/[slug]/page.tsx — página do artigo.
   - generateStaticParams() a partir dos slugs publicados
   - generateMetadata() usando seo_title, seo_description e canonical_url do banco
   - Renderiza o campo content, que está em Markdown
   - Ao final do artigo, um CTA apontando para o valor de cta_pagina do post
   - Seção de relacionados usando getRelatedPosts()
   - export const revalidate = 3600

3. Para renderizar Markdown, use react-markdown com remark-gfm.

CRÍTICO: a URL final precisa ser exatamente /blog/<slug>/ — com barra no final,
igual ao site atual. Configure trailingSlash: true no next.config se necessário.

Replique o layout visual do blog atual. Leia os templates HTML existentes
para extrair a estrutura e as classes.
```

### ✅ Checkpoint 4

Com `npm run dev` rodando, abra cada uma das 3 URLs e:

1. Clique com botão direito → **Exibir código-fonte da página**
2. Use `Ctrl+F` e busque um trecho do texto do artigo

**O texto precisa aparecer no HTML bruto.** Se não aparecer, ainda está renderizando no cliente e o objetivo da migração não foi atingido.

---

## Etapa 5 — Blindagem de SEO

**Prompt:**

```
Implemente a camada de SEO. Esta etapa é a mais sensível do projeto.

1. next.config.ts — adicione a função redirects() com um 301 permanente:
   /sobre.html -> /sobre/
   Configure também trailingSlash: true.

2. app/sitemap.ts — sitemap dinâmico gerado do banco.
   Deve incluir: home, /financiamento/, /home_equity/, /sobre/, /blog/
   e todos os posts com status='published', usando updated_at como lastmod.

3. app/robots.ts — permitir tudo exceto /admin, e apontar para o sitemap.

4. JSON-LD (dados estruturados):
   - Em app/blog/[slug]/page.tsx: schema BlogPosting com headline, description,
     datePublished, dateModified, image e author.
   - No layout raiz: schema RealEstateAgent com name "RT Capital Imobiliário",
     areaServed Vinhedo/SP e as cidades da região.

5. app/layout.tsx — metadata padrão com metadataBase apontando para
   https://rtcapitalimobiliario.com.br

NÃO altere nenhum slug. NÃO altere nenhum seo_title ou seo_description —
eles vêm do banco exatamente como estão hoje.
```

### ✅ Checkpoint 5

- `/sitemap.xml` lista as 8 URLs
- `/robots.txt` responde
- Cole a URL de um artigo no [Rich Results Test](https://search.google.com/test/rich-results) e confirme que o `BlogPosting` é detectado

---

## Etapa 6 — Validação antes do cutover

**Não pule esta etapa.** É ela que separa uma migração bem-sucedida de uma queda de tráfego.

1. **Deploy em staging na Vercel** (branch `migracao-nextjs-supabase`, domínio de preview).
2. **Crawl comparativo:** rode o Screaming Frog duas vezes — uma no site em produção, outra no preview. Exporte as duas listas de URLs e compare.
   - Nenhuma URL da produção pode faltar no preview.
   - Nenhuma pode retornar 404 ou 500.
3. **Validar os 301:** acesse `/sobre.html` no preview e confirme que redireciona para `/sobre/` com status **301** (não 302 — 302 não transfere autoridade).
4. **Comparar metadados:** para cada uma das 8 URLs, confira que `title`, `description` e `canonical` do preview batem com os da produção.
5. **Lighthouse:** rode em staging e anote os Core Web Vitals. Compare com a produção atual.

### Prompt de auditoria

```
Escreva um script Node em scripts/audit-urls.mjs que:
- Recebe duas URLs base como argumento (produção e preview)
- Para a lista das 8 URLs conhecidas do site, faz fetch em ambas as bases
- Compara: status HTTP, <title>, <meta name="description">, <link rel="canonical">
- Imprime uma tabela no console marcando as divergências em vermelho
Rode o script e me mostre o resultado.
```

---

## Etapa 7 — Cutover

Faça em um dia útil de manhã, nunca sexta à tarde.

1. Merge da branch na `main`.
2. Deploy em produção pela Vercel.
3. Apontar o domínio para a Vercel (DNS).
4. Testar manualmente as 8 URLs em produção.
5. No **Google Search Console**: reenviar o `sitemap.xml`.
6. Usar a **Inspeção de URL** em cada um dos 3 artigos e solicitar indexação.

### Monitoramento pós-cutover

| Quando | O que verificar |
|---|---|
| 24h | Erros de rastreamento no Search Console; 404 inesperados |
| 7 dias | Impressões e cliques por página (comparar com semana anterior) |
| 30 dias | Posições médias por consulta; Core Web Vitals |

Uma oscilação pequena nos primeiros dias é normal. Queda acentuada e sustentada em uma página específica indica problema de URL ou metadado — volte à planilha de-para.

---

## Etapa 8 — Admin (Opção A)

Só comece depois que o cutover estiver estável por pelo menos uma semana.

**Prompt:**

```
Implemente a área administrativa protegida.

1. middleware.ts — protege /admin/*, redireciona não autenticados para /admin/login
2. app/admin/login/page.tsx — login com Supabase Auth (e-mail e senha)
3. app/admin/posts/page.tsx — lista de posts com status e ações
4. app/admin/posts/[id]/page.tsx — editor com:
   - Campos: title, slug, excerpt, content, cover_image, category, rotulo,
     cta_pagina, destaque, seo_title, seo_description
   - Editor de Markdown com preview
   - Upload de imagem para o Supabase Storage
   - Botões: salvar rascunho, publicar, despublicar
   - Slug gerado automaticamente a partir do título, mas editável
5. Ao publicar ou editar um post, chame revalidatePath() para /blog e /blog/[slug]

AVISO ao editar slug de post já publicado: mostrar alerta de que isso quebra
a URL indexada e exige redirect 301.

Todas as escritas devem passar por Server Actions, nunca pelo cliente.
```

---

## O que fazer com o pipeline antigo

Depois que o blog estiver rodando pelo Supabase:

- `posts.js` e o script `npm run blog:gerar` **deixam de ser a fonte de verdade**.
- **Não delete ainda.** Mantenha por 30 dias como backup do conteúdo original.
- Os arquivos em `content/blog/*.md` continuam sendo o histórico da migração — arquive-os numa pasta `content/blog/_migrado/`.

---

## Checklist final

- [ ] Etapa 0: banco com 3 posts, 1 destaque, admin criado
- [ ] Etapa 1: CLAUDE.md na raiz, branch criada
- [ ] Etapa 2: Next.js rodando, fontes e cores portadas
- [ ] Etapa 3: queries retornando os 3 posts
- [ ] Etapa 4: conteúdo visível no HTML bruto (view-source)
- [ ] Etapa 5: sitemap, robots, JSON-LD, redirect 301
- [ ] Etapa 6: crawl comparativo sem divergências
- [ ] Etapa 7: cutover feito, sitemap reenviado no Search Console
- [ ] Etapa 8: admin funcionando (só após 7 dias estáveis)
