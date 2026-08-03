# Site Capital Imobiliário

Site de intermediação imobiliária e crédito de Rafael Teixeira.
Domínio: [rtcapitalimobiliario.com.br](https://rtcapitalimobiliario.com.br) ·
praça principal Vinhedo/SP e região.

Next.js (App Router) + TypeScript + Tailwind, com Supabase (Postgres, Auth,
Storage) como banco e backend. Deploy na Vercel.

## Rodar

```bash
npm install
cp .env.local.example .env.local   # preencher as chaves do Supabase
npm run dev
```

| Script | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm start` | serve o build |
| `npm run lint` | ESLint (`eslint .`, flat config) |
| `npm test` | suíte de testes (Vitest) |
| `npm run test:watch` | testes em watch |

`.env.local` precisa de `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
A service role key só pode ser lida no servidor — ela vive em
`lib/supabase/admin.ts`, marcado com `server-only`.

## Rotas

`next.config.ts` usa `trailingSlash: true`, então toda URL termina em barra.

```
/                        home institucional
/financiamento/          LP financiamento SBPE
/home_equity/            LP home equity
/imoveis/                índice de empreendimentos
/imoveis/<slug>/         página do empreendimento
/blog/                   índice do blog
/blog/<slug>/            artigo
/sobre/                  sobre        (/sobre.html redireciona 301 para cá)
/admin/                  painel — login em /admin/login/, protegido por middleware
```

As URLs acima são a base do SEO do site: **nenhum slug pode mudar**. Ver as
regras invioláveis em `CLAUDE.md`.

## Estrutura

```
app/(site)/       páginas públicas (Server Components, dados via lib/queries)
app/admin/        painel: CRUD de posts e imóveis, protegido por middleware
app/actions/      server actions — captação de leads e escrita do admin
app/global-not-found.tsx  404 de URL que não casa com rota nenhuma
app/global-error.tsx      erro no próprio root layout (último recurso)
lib/queries/      leitura do Supabase (público usa client anon; admin usa sessão)
lib/validations/  schemas Zod — validam no servidor, sem confiar no cliente
lib/financeiro.ts matemática dos simuladores (Price, SAC, taxa, CPF, telefone)
components/       UI por domínio (blog, imoveis, admin, leads, nav)
supabase/migrations/  schema versionado
content/blog/     markdown original dos 3 artigos migrados (referência histórica)
docs/             modelo-artigo.md e carousel-spec.md — ambos usados pelo código
styles/           CSS por página, importado pela própria página
tests/            suíte Vitest (ver abaixo)
```

`app/` guarda só roteamento — o código de aplicação vive nas pastas da raiz.
É a estratégia "store project files outside of `app`" da documentação do Next.

**Não existe `app/layout.tsx`.** O projeto usa dois root layouts
(`app/(site)/layout.tsx` e `app/admin/layout.tsx`), cada um com seu próprio
`<html>`/`<body>`, porque o admin não compartilha nav, rodapé nem design system
com o site. É por isso que o 404 de URL não-casada precisa do
`app/global-not-found.tsx` (habilitado por `experimental.globalNotFound`): sem
um layout raiz único, não há 404 componível que sirva para os dois lados.

Cada lado tem seu par de telas de estado: `not-found.tsx` para os `notFound()`
e `error.tsx` para exceção em runtime, em `app/(site)/` e em
`app/admin/(protected)/`.

`docs/modelo-artigo.md` não é documentação solta: é o formato que a importação
de `.md` no admin espera, e o próprio painel manda o usuário abrir esse arquivo.

## Testes

```bash
npm test
```

Suíte em Vitest, dividida por seam:

- `tests/unidade/` — funções puras (financeiro, máscaras, formatação, blog, OG, UTM)
- `tests/validacoes/` — schemas Zod, testados pela seam `safeParse`
- `tests/acoes/` — server actions, com um fake do client Supabase em `tests/apoio/`

Os testes de action afirmam **o que foi enviado ao banco** (tabela, operação,
payload), não que uma função foi chamada. Os números de referência dos
simuladores em `tests/unidade/financeiro.test.ts` foram conferidos contra
produção e são fonte de verdade independente — se a fórmula mudar, eles reprovam.

Há um `test.fails()` proposital em `tests/validacoes/imovel.test.ts`, que
documenta uma armadilha do Zod 4 com chaves opcionais ausentes. Ele aparece como
"1 expected fail" e a suíte segue verde; se um dia o schema for corrigido, esse
teste fica vermelho avisando.

## Auditoria de SEO

A suíte do Vitest não alcança HTTP — quem confere status e metadados no site
publicado é `scripts/audit-urls.mjs`, que roda contra uma URL de verdade.

```bash
# Só as asserções de status (produção, preview, ou localhost:3000)
node scripts/audit-urls.mjs https://rtcapitalimobiliario.com.br

# Com a segunda base, compara também title/description/canonical entre ambientes
node scripts/audit-urls.mjs https://rtcapitalimobiliario.com.br https://<preview>.vercel.app
```

Sai com código 1 quando algo falha, então serve em CI ou como passo de
checklist antes de promover para `main`.

**Por que existe a parte de status.** A documentação do Next avisa que o
`not-found` responde 404 em resposta não-streamada, mas **200 em resposta
streamada**. Basta alguém pôr um `<Suspense>` acima da busca do dado em
`app/(site)/blog/[slug]` ou `app/(site)/imoveis/[slug]` para o shell começar a
ser enviado antes do `notFound()`: o status vira 200 e o Google passa a indexar
página de erro como conteúdo real. Nem o build nem a suíte de testes acusam
isso — só uma requisição HTTP de verdade.

As asserções são **absolutas**, não comparativas, de propósito: uma regressão
que chegasse aos dois ambientes passaria como "nenhuma divergência" na tabela
comparativa. A âncora `/` → 200 está lá para um deploy quebrado, que responde
404 em tudo, não passar com louvor nas outras linhas.
