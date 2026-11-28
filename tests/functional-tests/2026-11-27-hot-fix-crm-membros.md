# Relatório de testes funcionais

- **Branch:** `hot-fix/crm-membros` (PR #111)
- **Commit (SHA):** `0a6ccfb68f6c096bd3a28265a11a149f047b875c` (head do PR; o relatório e o spec novo entram num commit seguinte)
- **URL do deploy:** <https://site-capital-imobiliario-kxs84p5zj-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-27 23:40
- **Executor:** subagente Sonnet 5.5, skills `playwright-e2e` e `superpowers:test-driven-development`
- **Comando:** `E2E_BASE_URL=<url> npm run e2e`
- **Usuário de QA configurado:** sim

Checks do PR: qualidade, qualidade-auditoria, dry-run e Vercel verdes (Supabase Preview e `aplicar` em skipping, esperado antes do merge em Preview).

## Resumo

Total: **277 passaram, 0 falharam, 2 pularam** (279 testes, 3,1 min).

| Spec | Projeto | Passou | Falhou | Pulou |
| --- | --- | ---: | ---: | ---: |
| auth.setup | setup | 1 | 0 | 0 |
| admin-acesso (novo) | desktop | 5 | 0 | 0 |
| admin-crm | desktop | 11 | 0 | 0 |
| admin-crm-simulacao | desktop | 7 | 0 | 1 |
| admin-simulacao-pdf | desktop | 1 | 0 | 0 |
| admin-simulacao-rota | desktop | 3 | 0 | 0 |
| admin-editor / admin-listas / admin-parametros | desktop | 5 / 11 / 2 | 0 | 0 |
| blog-autor | desktop / mobile | 8 / 7 | 0 | 0 / 1 |
| blog-tabelas, imoveis-listagem, imoveis-redirect, imovel-pagina, legal | desktop e mobile | todos | 0 | 0 |
| instagram-dm | desktop / mobile | 27 / 27 | 0 | 0 |
| landings | desktop / mobile | 24 / 24 | 0 | 0 |
| robos-ia | desktop / mobile | 13 / 13 | 0 | 0 |
| seo | desktop / mobile | 20 / 20 | 0 | 0 |
| whatsapp-config / whatsapp-consentimento | desktop / mobile | 2+6 / 2+6 | 0 | 0 |
| **Total** | | **277** | **0** | **2** |

Projetos: desktop e mobile sem falha; `setup` passou.

## Falhas

_Nenhuma._

## Pulos e motivos

| Teste | Projeto | Motivo |
| --- | --- | --- |
| admin-crm-simulacao: lead de home equity não tem 'Simulações' | desktop | nenhum lead em home equity (dado real ausente) |
| blog-autor: editor de post tem o campo e o texto de ajuda | mobile | admin só roda no projeto desktop |

## Verificações direcionadas (spec novo `tests/e2e/admin-acesso.spec.ts`)

| Item | Resultado |
| --- | --- |
| a. QA admin abre `/admin/crm/`: quadro, contagens das abas e modal do lead (leitura via `carregarDetalheLead` movida) carregam; sem alerta no modal; fecha sem ação de escrita | passou |
| b. Anônimo em `/admin/crm/` vai para `/admin/login/` | passou |
| c. `/admin/login/?acesso=negado` mostra `role="alert"` com "Sua conta não tem acesso ao painel"; `/admin/login/` simples não mostra | passou |
| d. QA logado em `/admin/login/` é levado à home do admin, sem laço | passou |
| e. Rota da simulação: `previa` devolve PDF (`admin-simulacao-pdf`) e 401 sem sessão (`admin-simulacao-rota`, 3 testes) | passou |

Usuário sem perfil: **não testável ponta a ponta** (não se criam contas). Coberto por testes unitários, que passam localmente: `npm test` (caminho `C:\` maiúsculo) = **1857 passando + 1 expected fail**, 116 arquivos (`tests/unidade/middleware-sessao.test.ts`, `tests/unidade/crm-somente-membros.test.ts`, `tests/acoes/admin-guarda.test.ts`, `admin-crm*.test.ts`, `admin-simulacao.test.ts`, `simulacao-rota.test.ts`). `npx eslint .` sem erro nem aviso.

Nota de método: o spec novo foi escrito contra código já existente (o relatório é de teste, não de desenvolvimento), então não houve ciclo vermelho. O teste (c) exercita comportamento novo do PR.

## Revisão de código (somente leitura, `git diff origin/main...HEAD`)

Sem achado bloqueante.

- Todas as 15 actions exportadas de `app/actions/admin-crm.ts` (linhas 279, 399, 484, 545, 567, 609, 674, 747, 774, 800, 821, 849, 883, 929, 990) chamam `exigirMembroCRM()`; também `admin-simulacao.ts` (as duas actions), `admin-crm-leitura.ts:39` e a rota da simulação. Nenhuma action do CRM resta só com `usuarioAutenticado` (restam apenas as definições em `lib/admin/auth.ts:15,30,55`, usadas por `exigirAdmin` e `exigirMembroCRM`).
- `lib/supabase/middleware.ts`: sem laço. Conta sem perfil na página de login só limpa a sessão e devolve a resposta (sem redirect); fora dela redireciona para `/admin/login/?acesso=negado`, e o login já anônimo não redireciona. Os cookies do `signOut` são copiados para o redirect (`getAll().forEach(set)`), então o navegador perde a sessão. Observação menor: só os cookies são copiados, não outros cabeçalhos de `supabaseResponse`; hoje não há nenhum relevante.
- Erro transitório de leitura de `profiles` não tranca o admin para fora: middleware e layout só fazem `console.error` e seguem (`middleware.ts`, bloco `if (erroPerfil)`; `app/admin/(protected)/layout.tsx`, bloco `erroPerfil`). Já `exigirMembroCRM` (`lib/admin/auth.ts`, ramo `error`) devolve "Não foi possível confirmar sua permissão." e a action falha: é correto (falha fechada), e a rota devolve 500 nesse caso.
- Baixo risco: se o middleware falhar na leitura do perfil e o layout enxergar "sem perfil", poderia haver ida e volta login/home enquanto a falha durar (login logado redireciona à home); exige condição improvável e momentânea.
- Custo: uma consulta extra a `profiles` por requisição a `/admin/*` no middleware (e outra no layout). Aceitável; pode virar cache curto se o admin pesar.
- Migration 039: `profiles_select_own` (`using auth.uid() = id`) é mantida, então a leitura do próprio perfil por middleware/layout/`exigirMembroCRM` continua possível depois que `profiles_read_authenticated` passar a exigir `eh_membro_crm()`; não há dependência circular (a função é `security definer`).

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação ou formulário enviado.
- [x] Nenhuma Server Action de escrita disparada (fixture `acoesServidor` sem registros nos testes de escrita; `anexar`/`enviar` não chamados com sessão).

## ATENÇÃO: a migration 039 NÃO foi exercitada

O preview fala com o banco de produção **sem** a 039 (ela só roda no merge em `Preview`). Esta rodada validou o código novo contra as policies atuais. **É obrigatório um smoke run pós-merge** em `Preview`: login do QA e do dono, quadro e modal do CRM, listas de responsável (leitura de `profiles`), tags/etapas/motivos (tabelas de domínio), `anexar` não, apenas leitura, e conferência de que `leads` continua visível aos dois perfis admin. Se algo ficar vazio, o rollback está descrito no PR.

## Veredito

**APROVADO** — 0 falhas em 279 testes, verificações a-e passam, 1857 testes unitários verdes, eslint limpo e sem achado bloqueante na revisão; a 039 exige smoke pós-merge.
