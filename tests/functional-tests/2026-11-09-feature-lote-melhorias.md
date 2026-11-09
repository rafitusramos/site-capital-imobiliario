# Relatório de testes funcionais

- **Branch:** `feature/lote-melhorias` (PR #72)
- **Commit (SHA):** `e67d10a780484822c41c3fca99770eee04b3f079` (specs novos commitados depois, em commit seguinte)
- **URL do deploy:** <https://site-capital-imobiliario-n0o8qk5ul-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-09 00:30
- **Executor:** Claude Sonnet 5.5 (skills playwright-e2e e superpowers:test-driven-development)
- **Comando:** `E2E_BASE_URL=<url> npm run e2e`
- **Usuário de QA configurado:** sim

## Resumo

88 passaram, 0 falharam, 0 pularam (inclui o setup de login). Fonte: `tests/functional-tests/.ultimo-resultado.json`.

| Spec | Projeto | Passou | Falhou | Pulou |
| --- | --- | ---: | ---: | ---: |
| auth.setup | setup | 1 | 0 | 0 |
| imoveis-listagem | desktop | 2 | 0 | 0 |
| imoveis-listagem | mobile | 2 | 0 | 0 |
| imoveis-redirect | desktop | 2 | 0 | 0 |
| imoveis-redirect | mobile | 2 | 0 | 0 |
| imovel-pagina | desktop | 5 | 0 | 0 |
| imovel-pagina | mobile | 5 | 0 | 0 |
| landings | desktop | 12 | 0 | 0 |
| landings | mobile | 12 | 0 | 0 |
| seo | desktop | 8 | 0 | 0 |
| seo | mobile | 8 | 0 | 0 |
| admin-listas | desktop | 11 | 0 | 0 |
| admin-editor | desktop | 5 | 0 | 0 |
| admin-crm | desktop | 11 (7 novos do lote) | 0 | 0 |
| admin-parametros | desktop | 2 | 0 | 0 |
| **Total** | | **88** | **0** | **0** |

Specs novos (somente leitura) em `tests/e2e/admin-crm.spec.ts`, bloco "lote de melhorias":
card sem "Últ. contato"/"Sem interação ainda"; console sem React #418/#423/#425 em
`/admin/crm/financiamento/`; contorno de lembrete atrasado (box-shadow com a cor de `--erro`
resolvida em runtime e borda esquerda de 3px); barra de etapa (`aria-current="step"` centralizada,
tolerância 2px, botões "Mover para/Reabrir em" com altura >= 44px); botão Perdido sem texto, com
`title`, `aria-label` e 1 SVG, e nenhum texto "Mover para" visível; topo do primeiro campo de
"Dados do lead" e "Origem" iguais (tolerância 1px). Nenhum deles clica em botão de etapa.

## Falhas

_Nenhuma._

## Pulos e motivos

Nenhum teste foi pulado; os specs novos encontraram dados reais (leads na aba financiamento,
inclusive um com lembrete atrasado).

## Observações

- Não exercitado: o estado **amarelo** (`--aviso`, lembrete vencendo em 24h) do contorno do card;
  os specs só cobrem o vermelho (atrasado). Não foi inventado dado.
- Não exercitados por dependerem da migration 029, que só roda no merge em `Preview`: itens 4 e 6
  do lote (efeito no banco). O usuário "QA Automação" ainda aparece na lista de responsáveis e o SLA
  do banco ainda tem os valores antigos: comportamento esperado agora, não é falha. Verificar depois do merge.
- Os testes de modal abrem o primeiro lead da aba; se ele estiver em etapa final, o botão Perdido não
  existe e o teste pularia (não ocorreu nesta rodada).
- A suíte inteira ficou verde, sem flakiness e sem retries.

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação ou formulário enviado
  (nenhum spec clica em botão de etapa, arrasta, salva ou envia; os novos só medem e leem atributos).
- [x] Nenhuma Server Action de escrita disparada pelos specs novos. A fixture `acoesServidor` aborta/registra
  actions, mas os testes novos não inspecionam a lista; a garantia vem de não haver clique que as dispare.

## Veredito

**APROVADO** — 88/88 verdes no deploy de e67d10a, incluindo os 7 checks novos do lote; ressalva: estado amarelo do contorno e itens dependentes da migration 029 não foram exercitados.
