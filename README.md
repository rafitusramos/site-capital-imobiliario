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
