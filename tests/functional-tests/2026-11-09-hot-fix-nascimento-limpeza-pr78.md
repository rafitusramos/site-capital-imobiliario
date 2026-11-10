# Relatório de testes funcionais

- **Branch:** `hot-fix/nascimento-limpeza` (PR #78)
- **Commit (SHA) testado:** `a0a4c3cf2fc69ab1329796045356c21b073f2b9e` (mais o spec novo deste relatório)
- **URL do deploy:** <https://site-capital-imobiliario-git-hot-f-2e6a72-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-09
- **Executor:** Sonnet 5.5 (subagente), skills `playwright-e2e` e `superpowers:test-driven-development`
- **Comando:** `E2E_BASE_URL=<url> npm run e2e`
- **Usuário de QA configurado:** sim (specs de admin rodaram)

## Resumo

| Rodada | Passou | Falhou | Pulou |
| --- | ---: | ---: | ---: |
| 1 (suíte completa, com `legal.spec.ts` novo) | 131 | 0 | 2 |
| 2 (repetição, mesma URL) | 131 | 0 | 2 |

## Cobertura das mudanças do PR

Não havia spec para os itens 2 a 5; foi acrescentado `tests/e2e/legal.spec.ts` (somente leitura, desktop e mobile não distinguem; roda nos projetos configurados):

- Política, item 2a (`#quais-dados-coletamos`) cita "data de nascimento" e o motivo (seguro habitacional).
- Política mostra `.legal-atualizado` = "Atualizado em 9 de novembro de 2026".
- Canonical da política segue `/politica-de-privacidade/`.
- Termos continuam com "Atualizado em 30 de julho de 2026".
- `/sitemap.xml`: `<lastmod>` da política começa com 2026-11-09.

TDD: o deploy já contém a mudança, então os testes passaram de primeira; protegem contra regressão. Item 1 (remoção do fallback PGRST202) não é testável sem enviar formulário (proibido); coberto só por testes unitários.

## Falhas

_Nenhuma._

## Pulos e motivos

| Teste | Motivo |
| --- | --- |
| admin-crm-simulacao: lead de home equity não tem 'Simulações' nem 'Anexar simulação' | Sem lead de home equity visível ao usuário de QA (pulo condicional de dados) |
| admin-crm: contorno de lembrete atrasado | Nenhum lead com lembrete atrasado na aba (pulo condicional de dados) |

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação, salvamento ou formulário enviado.
- [x] O novo spec só faz GET de páginas e do sitemap.

## Veredito

**APROVADO** — 0 falhas; política (data de nascimento, data de atualização, canonical), termos e lastmod do sitemap conforme o PR.
