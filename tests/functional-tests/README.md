# Testes funcionais (Playwright)

> ## POLÍTICA DE SEGURANÇA — leia antes de rodar ou editar qualquer teste
>
> **Todo deploy (branch, Preview e produção) usa o MESMO banco Supabase de produção.**
> Portanto a suíte é **somente leitura**. Nos testes é **proibido**:
>
> - confirmar exclusão (posts, imóveis, leads) — diálogos são abertos e **cancelados**;
> - mover lead no CRM (arrastar ou botões de etapa) — isso **envia e-mail a clientes reais**;
> - publicar ou despublicar post/imóvel;
> - salvar post, imóvel, taxas dos simuladores ou interruptores de e-mail;
> - enviar os formulários públicos de lead (criam lead real e avisam o dono por e-mail).
>
> Pode-se abrir diálogos e cancelar, digitar em campos e descartar, filtrar, ordenar e exportar
> (o CSV é gerado no navegador). A fixture `tests/e2e/apoio/admin.ts` ainda aborta e registra
> qualquer Server Action nas telas de posts, imóveis e parâmetros, como rede de proteção.

## Fluxo

1. **Opus 5.5 planeja** a melhoria.
2. **Sonnet 5.5 desenvolve** (subagente) numa branch `feature/*` ou `hot-fix/*`.
3. A branch é **publicada**: PR aberto e deploy de preview da Vercel verde.
4. **Um novo subagente Sonnet 5.5 testa**: roda `E2E_BASE_URL=<deploy> npm run e2e` contra o
   deploy da branch, com as skills `playwright-e2e` e `superpowers:test-driven-development`, e
   grava o relatório em `tests/functional-tests/`.
5. **Opus 5.5 valida** o relatório. Só com veredito **APROVADO** a branch entra em `Preview`.

Testes novos seguem TDD: escreva o teste, veja-o falhar pelo motivo certo, só então ajuste o código.
Convenções: Page Object Model em `tests/e2e/paginas/`, seletores `getByRole`/`getByLabel`, sem
`waitForTimeout`, testes isolados e específicos de um comportamento.

## Configuração

```bash
npm install
npm run e2e:instalar          # baixa o Chromium do Playwright (uma vez por máquina)
cp .env.e2e.local.example .env.e2e.local
```

`.env.e2e.local` (ignorado pelo git):

| Variável | Para quê |
| --- | --- |
| `E2E_BASE_URL` | URL do deploy a testar, sem barra final. Obrigatória; sem ela a suíte nem inicia. |
| `E2E_EMAIL`, `E2E_SENHA` | Usuário de QA para os specs de admin. |

O usuário de QA é **dedicado**: crie-o em Supabase Auth (Authentication > Users) e peça ao dono que
defina `profiles.role = 'admin'` (necessário para exclusão no CRM e para o botão Exportar CSV).
**Nunca use a conta do dono.** Sem credenciais, os specs de admin ficam *skipped* com o motivo
"sem usuário de QA (.env.e2e.local)"; se o usuário não for admin, pulam com o motivo do redirecionamento.

## Como rodar

```bash
E2E_BASE_URL=https://<deploy>.vercel.app npm run e2e              # tudo
E2E_BASE_URL=... npm run e2e -- --project=mobile                  # só o site público no Pixel 7
E2E_BASE_URL=... npm run e2e -- tests/e2e/seo.spec.ts             # um spec
npm run e2e:relatorio                                             # abre o HTML da última execução
```

Projetos: `setup` (login), `desktop` (todos os specs) e `mobile` (apenas os públicos).
Saídas descartáveis (ignoradas pelo git): `.ultimo-html/`, `.ultimo-resultado.json`, `.artefatos/`
(traces e screenshots de falhas) e `/.auth/`.

| Spec | Cobre |
| --- | --- |
| `imoveis-listagem` | listagem, links dos cards, filtro Lançamento / Pronto |
| `imovel-pagina` | meta, JSON-LD, hero, orçamento de imagens, carrossel, ordem das seções do pronto |
| `landings` | FAQ, JSON-LD, "Leia também", simulador SAC/PRICE |
| `seo` | title, description, canonical, console limpo, sitemap com imagens |
| `admin-listas` | busca, status, ordenação, aria-labels, diálogos de publicar, chips de modalidade |
| `admin-editor` | descarte de alterações, `/admin/imoveis/novo/` por modalidade |
| `admin-crm` | contagens, filtros na URL, Exportar CSV, modal do lead, diálogo de exclusão |
| `admin-parametros` | hidratação, taxas, interruptores de e-mail |

## Relatório de cada rodada

Arquivo: `tests/functional-tests/AAAA-MM-DD-<branch-sanitizada>.md`, copiado de
[`_modelo-relatorio.md`](./_modelo-relatorio.md). "Branch sanitizada" = minúsculas, `/` e qualquer
caractere fora de `a-z0-9-` trocado por `-` (ex.: `feature/testes-funcionais` vira
`feature-testes-funcionais`). Seções fixas: cabeçalho (branch, SHA do commit, URL do deploy, data/hora
em America/Sao_Paulo, executor), tabela-resumo (passou/falhou/pulou por spec e projeto), falhas (passos
+ caminho dos artefatos), pulos com motivo, observações e veredito (**APROVADO** ou **REPROVADO**).
O relatório é versionado; os artefatos não.
