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
lib/queries/      leitura do Supabase (público usa client anon; admin usa sessão)
lib/validations/  schemas Zod — validam no servidor, sem confiar no cliente
lib/financeiro.ts matemática dos simuladores (Price, SAC, taxa, CPF, telefone)
components/       UI por domínio (blog, imoveis, admin, leads, nav)
supabase/migrations/  schema versionado
content/blog/     markdown original dos 3 artigos migrados (referência histórica)
docs/             modelo-artigo.md e carousel-spec.md — ambos usados pelo código
tests/            suíte Vitest (ver abaixo)
```

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
