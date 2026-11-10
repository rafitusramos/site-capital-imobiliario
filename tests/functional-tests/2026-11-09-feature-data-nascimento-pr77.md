# Relatório de testes funcionais

- **Branch:** `feature/data-nascimento` (PR #77)
- **Commit (SHA) testado:** `6a30d99f69d8cdb0b10a6ba6470f078fd7b5432f` (mais os specs novos deste relatório)
- **URL do deploy:** <https://site-capital-imobiliario-git-featu-910763-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-09
- **Executor:** Sonnet 5.5 (subagente), skills `playwright-e2e` e `superpowers:test-driven-development`
- **Comando:** `E2E_BASE_URL=<url> npm run e2e`
- **Usuário de QA configurado:** sim (`.env.e2e.local` presente; setup autenticou)

## Resumo

Rodada 1 (antes de acrescentar specs, só `landings` tinha a cobertura de presença/autocomplete/botão em mobile): ver abaixo. Rodada final (suíte completa com os specs novos):

| Rodada | Passou | Falhou | Pulou |
| --- | ---: | ---: | ---: |
| 1 (suíte completa, mesma URL) | 120 | 0 | 3 |
| 2 (suíte completa, mesma URL) | 121 | 0 | 2 |

Os specs de nascimento (existentes + 10 novos testes por desktop = 5 por landing x 2 landings; mobile roda os existentes) passaram em todas as execuções. A diferença de pulos entre rodadas vem de skips condicionais ao estado do banco de produção (ver abaixo).

## Cobertura da data de nascimento (`tests/e2e/landings.spec.ts`)

Já existia: campo presente com label, `autocomplete="bday"`, `inputmode="numeric"`, botão de navegação visível sem rolar em viewport mobile 375x667 (inclusive com a mensagem de erro à mostra), nas duas landings.

Acrescentado (somente cliente, nada enviado), para `/financiamento/` e `/home_equity/`:
- máscara: digitar `15031990` resulta em `15/03/1990`;
- recusa data futura (`01/01/2099`), inexistente (`31/02/1990`) e incompleta (`15/03`) com a mensagem "Informe uma data de nascimento válida." ao clicar em Próximo;
- botão de navegação visível sem rolar em viewport desktop 1280x720.

TDD: os testes novos validam comportamento já implementado no deploy, portanto passaram de primeira (não houve estado vermelho a observar; a regressão que protegem é a ausência de máscara/validação).

## Falhas

_Nenhuma._

## Pulos e motivos

Todos são `test.skip` condicionais dependentes de dados reais (banco de produção), por desenho da suíte:

| Teste | Projeto | Motivo |
| --- | --- | --- |
| admin-crm-simulacao: lead de home equity não tem 'Simulações' nem 'Anexar simulação' | desktop | Sem lead de home equity visível para o usuário de QA (pulo condicional de dados) |
| admin-crm: contorno de lembrete atrasado (box-shadow --erro, borda esquerda 3px) | desktop | Nenhum lead com lembrete atrasado na aba; estado amarelo (--aviso) idem |
| 1 pulo adicional apenas na rodada 1 (spec de CRM, `test.skip` por falta de lead/estado) | desktop | Condicional a dados; não repetiu na rodada 2 |

## Observações

- O campo de nascimento no modal do CRM (bloco editável) não foi exercitado: editar/salvar lead escreve no banco de produção e a migration 033 ainda não foi aplicada. Fica para verificação manual após o merge e a migration.
- Fallback PGRST202 em `app/actions/leads.ts` não é testável sem enviar formulário; coberto apenas por testes unitários (fora desta etapa).
- Nenhuma flakiness em specs da feature.

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação ou formulário enviado.
- [x] Nenhuma Server Action registrada pela fixture `acoesServidor` como disparada (nenhum teste clicou no envio final; "Próximo" com etapa 1 inválida só exibe erros).

## Veredito

**APROVADO** — 0 falhas; a data de nascimento (presença, máscara, recusa de data futura/inválida/incompleta, botão visível sem rolagem em mobile e desktop) funciona nas duas landings no deploy da branch.
