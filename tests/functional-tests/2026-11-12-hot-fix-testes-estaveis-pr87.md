# Relatório de testes funcionais — hot-fix/testes-estaveis (PR #87)

- **Branch:** `hot-fix/testes-estaveis`
- **Commit (SHA):** `776a128c9c5fe6bf01047cbc27f1fb1372334bbc`
- **URL do deploy:** <https://site-capital-imobiliario-git-hot-f-de5de8-rafitusramos-projects.vercel.app>
- **Data (America/Sao_Paulo):** 2026-11-12
- **Executor:** Sonnet 5.5 (skills `playwright-e2e` e `superpowers:test-driven-development`)
- **Comando:** `E2E_BASE_URL=<url> npm run e2e` (6 workers, padrão), três vezes; mais um spec isolado e Vitest duas vezes
- **Usuário de QA configurado:** sim (`.env.e2e.local`)
- **Política:** somente leitura (`tests/functional-tests/README.md`). Nenhum teste novo, nenhuma escrita.

## O que mudou no PR
Só testes (e CLAUDE.md): `imovel-removido-redirect.test.ts` importa a página uma vez em `beforeAll`; `imovel-pagina.spec.ts` ganha `timeout: 60_000` no describe; novo helper `abrirModalDoLead` (`tests/e2e/apoio/admin.ts`) que reclica "Editar lead" até o modal abrir, usado em `admin-crm.spec.ts` (2 pontos) e `admin-crm-simulacao.spec.ts`.

## Resultados

| Execução | Passaram | Falharam | Pularam |
| --- | ---: | ---: | ---: |
| E2E, rodada 1 | 198 | 2 | 3 |
| E2E, rodada 2 | 199 | 2 | 2 |
| E2E, rodada 3 | 201 | 0 | 2 |
| Vitest (`npx vitest run`), rodada 1 | 1327 + 1 expected fail | 0 | — |
| Vitest, rodada 2 | 1327 + 1 expected fail | 0 | — |

Vitest: 80 arquivos passando nas duas rodadas, rodado do caminho em maiúsculas (`C:\Repos-GIT\...`). `imovel-removido-redirect.test.ts` passa na suíte completa (3 testes, 11ms/2ms/1ms em modo verbose).

## Alvos do PR

- **`imovel-pagina.spec.ts` mobile:** passou nas três rodadas (5 testes em cada). Durações dos mais lentos: rodada 2, 12,0s ("imóvel pronto: ordem das seções") e 9,3s; rodada 3, 11,2s ("orçamento de imagens") e 9,8s. Desktop, rodada 2: até 11,5s. Nenhum perto do limite antigo de 30s. A saída detalhada da rodada 1 não foi guardada (só as últimas 60 linhas), então não tenho as durações dela; o spec não aparece entre as falhas.
- **Testes do modal do CRM** (`admin-crm.spec.ts` e `admin-crm-simulacao.spec.ts`): todos passaram nas três rodadas (nas rodadas 2 e 3 conferi um a um; na 1 nenhum consta entre as falhas). Pulado nas três: "lead de home equity não tem Simulações" (sem lead de home equity no banco). Duração típica do modal: 5 a 9s.
- **`abrirModalDoLead`:** não consigo afirmar se algum reclique ocorreu; o helper não registra isso.

## Falhas

Rodadas 1 e 2 tiveram 2 falhas cada, nos mesmos dois specs, **que o PR não toca**:

| Rodada | Spec / projeto | Erro |
| --- | --- | --- |
| 1 | `blog-autor.spec.ts:135` (layout 360x740) / mobile | Test timeout of 30000ms exceeded |
| 1 | `blog-tabelas.spec.ts:10` / mobile | Test timeout of 30000ms exceeded (+ teardown do contexto estourado) |
| 2 | `blog-autor.spec.ts:135` / desktop | Test timeout of 30000ms exceeded (+ `browserContext.close` com alvo fechado) |
| 2 | `blog-tabelas.spec.ts:10` / desktop | Test timeout of 30000ms exceeded |

Artefatos: `tests/functional-tests/.artefatos/blog-autor-...-mobile|desktop/` e `blog-tabelas-...-mobile|desktop/` (screenshot, trace, error-context).

**Diagnóstico.** Os dois testes percorrem todos os artigos do `/blog/` com `page.goto` em sequência. Rodados sozinhos contra o mesmo deploy (`--workers=2`): 4 testes passam (5,2s a 7,3s cada, 20 passando no total com os demais testes dos dois arquivos). Na rodada 3 (6 workers) passaram. O padrão é estouro dos 30s sob carga de 6 workers contra o deploy de preview (os `goto` sob carga levam ~4s cada nesta suíte), não defeito de código nem regressão do PR: o código de produção não foi alterado e os specs envolvidos não foram editados. É a mesma classe de flakiness que o PR corrige em outros specs; estes dois ficaram de fora do escopo. Sugestão (não aplicada, fora do escopo pedido): dar `test.describe.configure({ timeout: 60_000 })` a `blog-autor` e `blog-tabelas`, como foi feito em `imovel-pagina`.

## Pulos e motivos

| Teste | Projeto | Motivo |
| --- | --- | --- |
| `admin-crm-simulacao.spec.ts:288` lead de home equity sem bloco Simulações | desktop | dado de produção: sem lead de home equity |
| `blog-autor.spec.ts:171` campo "Revisado em" no editor de post | mobile | motivo não registrado na saída (visto só na rodada 3; provável: spec de admin fora do projeto mobile, não confirmado) |

## Observações

- A instabilidade que o PR mira (timeout do Vitest, `imovel-pagina` mobile, modal do CRM com clique perdido antes da hidratação) não reapareceu em nenhuma das três rodadas.
- As rodadas 1 e 2 mostram que a suíte com 6 workers ainda tem flakiness residual em `blog-autor`/`blog-tabelas`, anterior ao PR.
- Contagem de pulos variou entre rodadas (3, 2, 2); só identifiquei por nome os pulos das rodadas 2 e 3 como acima.

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação ou formulário enviado.
- [x] Nenhum teste novo ou alterado por mim; nenhuma Server Action de escrita disparada (a fixture não reportou).

## Veredito

**APROVADO.** Os alvos do PR passam de forma estável (`imovel-pagina` mobile e todos os testes do modal do CRM nas 3 rodadas; Vitest 1327 + 1 expected fail duas vezes, com `imovel-removido-redirect` verde). As duas falhas das rodadas 1 e 2 são timeouts de 30s em `blog-autor`/`blog-tabelas`, specs não tocados pelo PR, que passam isolados e na rodada 3; são flakiness preexistente sob carga, não regressão.

## Adendo (validação Opus)

As duas falhas das rodadas 1 e 2 (`blog-autor.spec.ts` layout 360x740 e `blog-tabelas.spec.ts`) têm a mesma causa que o PR trata: specs que visitam vários artigos passando de 30 s com 6 workers no preview. Incluído neste PR `test.describe.configure({ timeout: 60_000 })` nos dois describes. Rodada 4, suíte completa com 6 workers contra o mesmo deploy: **201 passou / 0 falhou / 2 pulou**; os dois testes levaram 26,5 s e 27,1 s (antes, limite de 30 s). tsc e eslint limpos.

**Veredito final: APROVADO.**
