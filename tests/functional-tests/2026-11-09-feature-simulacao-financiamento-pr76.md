# Relatório de testes funcionais

- **Branch:** `feature/simulacao-financiamento` (PR #76, para `Preview`)
- **Commit (SHA):** `82947dc`
- **URL do deploy:** <https://site-capital-imobiliario-git-featu-c1db6d-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-09
- **Executor:** Sonnet 5.5 (subagente), skills `playwright-e2e` e `superpowers:test-driven-development`
- **Usuário de QA configurado:** sim (setup autenticou)
- **Observação sobre o nome do arquivo:** `2026-11-09-feature-simulacao-financiamento.md` já existe (rodada do PR #74); este relatório tem sufixo `-pr76` para não sobrescrevê-lo.

## Comandos

1. `$env:E2E_BASE_URL='<url>'; npm run e2e` (suíte completa)
2. `npm run e2e -- tests/e2e/admin-crm-simulacao.spec.ts tests/e2e/admin-crm.spec.ts --project=desktop --project=setup` (reexecução dos specs de CRM, para tirar a dúvida dos pulos)

## Resumo

Rodada 1 (suíte completa): **96 passou, 0 falhou, 3 pulou** (1,1 min).
Rodada 2 (specs de CRM): **18 passou, 0 falhou, 2 pulou**.

Specs de simulação (`admin-crm-simulacao`, `admin-simulacao-rota`), rodada 2:

| Teste | Resultado |
| --- | --- |
| modal de lead (financiamento) mostra bloco Simulações e botão "Anexar simulação"; nenhum "Enviar simulação"; sem histórico não quebra | passou |
| "Anexar simulação" abre o diálogo: foco preso, input só PDF, Cancelar, Esc fecha só o diálogo | passou |
| arquivo que não é simulação Creditas: erro claro, sem prévia | passou |
| arquivo de texto (não PDF) recusado sem prévia | passou |
| home equity sem bloco Simulações nem "Anexar simulação" | pulou (sem lead em home equity visível ao QA) |
| rota autenticada: 404 / 400 / 400 (somente erros) | passou (3) |
| rota sem login: 401, 401, GET recusado | passou (3, rodada 1) |

## Conferência dos specs

Os specs já refletem o botão novo: `admin-crm-simulacao.spec.ts` procura "Anexar simulação" (botão e diálogo) e só cita "Enviar simulação" para afirmar que ele NÃO existe no modal. Nenhum ajuste de spec foi necessário. Nenhum teste anexa, envia, move lead ou salva; a rede de proteção registra chamadas à rota da simulação e Server Actions, e nenhuma foi disparada.

## Falhas

Nenhuma.

## Pulos e motivos

| Teste | Motivo | Causa provável |
| --- | --- | --- |
| admin-crm-simulacao: home equity sem bloco Simulações | nenhum lead em home equity visível ao usuário de QA | dado/ambiente |
| admin-crm: colunas "Dados do lead" e "Origem" na mesma altura | pulo por "nenhum lead" em `abrirModalLead`-equivalente / condição do spec (persistiu nas duas rodadas) | dado/ambiente, preexistente |
| (só rodada 1) admin-crm-simulacao: modal de lead de financiamento | `count()` de "Editar lead" avaliado antes da hidratação | flakiness preexistente de spec (`test.skip` sem espera); passou na rodada 2 |

Nada disso se relaciona ao PR #76. Recomendação de baixa prioridade: nos specs de CRM, esperar o quadro renderizar antes do `test.skip(count()===0)`, para o pulo não mascarar o teste principal do PR.

## Observações

- A migration 032 ainda não foi aplicada; nenhum teste depende dela (o bloco Simulações segue com histórico vazio).
- Nenhum processo `node` ficou pendente após as execuções.

## Veredito

**APROVADO**
