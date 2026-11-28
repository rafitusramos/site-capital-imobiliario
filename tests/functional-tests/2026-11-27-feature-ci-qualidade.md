# Relatório de testes funcionais

- **Branch:** `feature/ci-qualidade` (PR #102)
- **Commit (SHA):** `666f91332bc1a3f7c6e09c255c37bc2678b51204`
- **URL do deploy:** <https://site-capital-imobiliario-9krywuuva-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-27 19:30
- **Executor:** agente Claude (Sonnet 5.5) com as skills `playwright-e2e` e `superpowers:test-driven-development`
- **Comando:** `E2E_BASE_URL=<url> npm run e2e`
- **Usuário de QA configurado:** sim

O PR só altera CI (workflows, scripts, dependabot, `.nvmrc`, `package.json`, docs). Nenhum código de
app mudou; o e2e é um smoke contra o deploy de preview.

## Resumo (e2e)

Execução completa: **271 passaram, 1 falhou, 1 pulou** (3,6 min). A falha é corrida de ambiente e não se
repetiu (ver Falhas).

| Spec | Projeto | Passou | Falhou | Pulou |
| --- | --- | ---: | ---: | ---: |
| imoveis-listagem | desktop / mobile | 2 / 2 | 0 | 0 |
| imoveis-redirect | desktop / mobile | 2 / 2 | 0 | 0 |
| imovel-pagina | desktop / mobile | 5 / 5 | 0 | 0 |
| landings | desktop / mobile | 24 / 24 | 0 | 0 |
| seo | desktop / mobile | 20 / 20 | 0 | 0 |
| legal | desktop / mobile | 5 / 5 | 0 | 0 |
| robos-ia | desktop / mobile | 13 / 13 | 0 | 0 |
| instagram-dm | desktop / mobile | 27 / 27 | 0 | 0 |
| whatsapp-config | desktop / mobile | 2 / 2 | 0 | 0 |
| whatsapp-consentimento | desktop / mobile | 6 / 6 | 0 | 0 |
| blog-tabelas | desktop / mobile | 2 / 2 | 0 | 0 |
| blog-autor | desktop | 8 | 0 | 0 |
| blog-autor | mobile | 7 | 1 (corrida de `.auth`, ver abaixo) | 0 |
| admin-listas | desktop | 11 | 0 | 0 |
| admin-editor | desktop | 5 | 0 | 0 |
| admin-crm | desktop | 11 | 0 | 0 |
| admin-crm-simulacao | desktop | 7 | 0 | 1 |
| admin-simulacao-rota | desktop | 3 | 0 | 0 |
| admin-parametros | desktop | 2 | 0 | 0 |
| **Total** | | **271** | **1** | **1** |

## Falhas

1. `[mobile] blog-autor.spec.ts:184` "admin: campo Revisado em (sem salvar) > editor de post tem o campo e o
   texto de ajuda". Erro: `Error reading storage state from .auth/admin.json: ENOENT`. Causa: worktree
   novo, sem `.auth/admin.json` no instante em que o projeto mobile leu o arquivo (corrida com o setup de
   login). Defeito do ambiente de teste, não do PR (nenhum código de app mudou). Repetição de
   `blog-autor.spec.ts`: desktop 16 passaram + 1 pulou; `--project=mobile`: 7 passaram + 1 pulou. Sem regressão.

## Pulos e motivos

| Teste | Projeto | Motivo |
| --- | --- | --- |
| admin-crm-simulacao:288 "lead de home equity não tem Simulações" | desktop | `test.skip` por falta de lead de home equity visível no banco (pré-existente) |
| blog-autor:184 (só na repetição) | mobile | teste de admin é pulado em mobile |

## Verificação do CI

Head testado: `666f913`.

| Check | Estado | Evidência |
| --- | --- | --- |
| `qualidade` | **pass** (46 s) | typecheck, lint e testes verdes |
| `dry-run` | **pass** (8 s) | guarda de SQL destrutivo rodou ("Nenhuma migration adicionada ou modificada; nada a verificar": o PR não toca migrations), depois `DRY RUN: migrations will *not* be pushed ... Remote database is up to date.` Senha mascarada: `SUPABASE_DB_PASSWORD: ***` e `SUPABASE_DB_URL: ***aws-1-us-west-2.pooler...`; nunca impressa. |
| `aplicar` | **skipped** | só roda em push/dispatch |
| `qualidade-auditoria` | **fail (esperado)** | 10 advisories altos/críticos reais fora da lista: next (4), sharp (3), nanoid, source-map-js, zod (chromium-bidi). As entradas de `postcss` em `node_modules/next/node_modules/postcss` aparecem como `aceito (ver ACEITOS)`. Falha pelo motivo certo (dependências antigas; correção no PR #103). |
| Vercel | **pass** | deploy concluído |
| Supabase Preview | skipping | n/a |

### Scripts, teste local

Auditoria (`.github/scripts/auditoria-dependencias.mjs`):

| Cenário | Resultado |
| --- | --- |
| Neste worktree (deps antigas) | exit **1**, 10 advisories bloqueantes, postcss-do-next listado como aceito (igual ao CI) |
| `sci-wt-dependencias` (somente leitura, cwd lá) | exit **0**: "OK ... (2 aceito(s))" |
| Mesmo JSON com `nodes` do postcss trocado para `["node_modules/postcss"]` (`--arquivo`, temp fora dos worktrees) | exit **1**, 2 erros `postcss high ... em node_modules/postcss` |

Guarda de SQL destrutivo (repositório descartável em temp, via `BASE`):

| Cenário | Resultado |
| --- | --- |
| Migration nova só com `create table` | exit 0, `OK:` |
| Nova com `DROP TABLE` | exit **1**, `::error file=supabase/migrations/003_drop.sql::...` |
| Mesmo arquivo com `-- destrutivo: aprovado` | exit 0, `::warning file=...` |
| `TRUNCATE` e `delete  from` (2 espaços) novos | exit 1, `::error` nos dois |
| `truncate` aprovado, `delete from` sem marca | exit 1 só pelo `delete` |
| Migration antiga intocada com `drop table` | ignorada (nunca listada) |
| `BASE` vazio, zeros ou SHA inválido | cai em `HEAD^`, sem erro |

Verificações locais: `npm run typecheck` ok; `npm run lint` exit 0 sem avisos; `npm test` (PowerShell, `C:\`):
1ª execução 1767 passaram + 1 expected fail + 3 skipped, com 1 arquivo falhando em `beforeAll` por timeout de
import a frio (flake conhecido da página de imóvel); 2ª execução **1770 passaram + 1 expected fail, 112/112
arquivos**.

### Revisão estática

Todas as `uses:` estão fixadas em SHA de 40 caracteres e cada SHA bate com a tag do comentário
(`gh api .../git/ref/tags/<tag>`, tipo `commit`, não tag anotada):

| Action | Tag | SHA | Confere |
| --- | --- | --- | --- |
| actions/checkout | v4.4.0 | 11d5960a326750d5838078e36cf38b85af677262 | sim |
| actions/setup-node | v4.4.0 | 49933ea5288caeca8642d1e84afbd3f7d6820020 | sim |
| supabase/setup-cli | v1.7.3 | 1dedf2c611547ede7232d26866dd3c56ab903bbb | sim |

- `permissions: contents: read` nos dois workflows; sem secret em nível de job. A senha só entra por `env` do
  passo "Montar URL do banco" (`migrations-supabase.yml:148` e `:186`).
- `aplicar` mantém `environment: producao-db` (`:172`), concorrência `supabase-migrations` (`:119`, sem cancelar)
  e CLI 2.122.1 (`:160`, `:198`). Os filtros de path cobrem `supabase/migrations/**`, o workflow e o script.
- Observações (não bloqueantes):
  - `guarda-sql-destrutivo.sh:228`: o grep também casa em comentários ou nomes (ex.: `-- truncate`, função
    `truncate_x`), gerando falso positivo; resolve-se com a marca de aprovação.
  - No `workflow_dispatch` (e com `BASE` inválida) o diff é só contra `HEAD^`: execução manual vê apenas o último
    commit.
  - O job `aplicar` não repete o dry-run antes de escrever (depende do dry-run do PR).

## Observações

- A guarda não foi exercitada no CI com migration real (o PR não toca `supabase/migrations`); a evidência vem do
  teste em repositório descartável.
- Ruído de terceiros (GA/Meta) não afetou nenhum teste.

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação ou formulário enviado.
- [x] Nenhuma Server Action registrada pela fixture `acoesServidor` como disparada.
- Nenhum `supabase db push` local, nenhum `workflow_dispatch`, nenhuma alteração de configuração do GitHub.

## Veredito

**APROVADO** — `qualidade` e `dry-run` verdes (senha mascarada), `qualidade-auditoria` falha só pelas
vulnerabilidades reais esperadas, os dois scripts se comportam como especificado, os SHAs conferem e o e2e não
mostra regressão (a única falha foi corrida de `.auth/admin.json` em worktree novo e não se repetiu).
