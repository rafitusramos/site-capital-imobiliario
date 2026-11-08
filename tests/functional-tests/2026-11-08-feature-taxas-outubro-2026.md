# Relatório de testes funcionais

- **Branch:** `feature/taxas-outubro-2026`
- **Commit (SHA):** `72a68135ea7288d6033bc4d0630d5baacfa96238`
- **URL do deploy:** <https://site-capital-imobiliario-owa3d7dk0-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-08 19:45
- **Executor:** Sonnet 5.5 (subagente), skills `playwright-e2e` e `superpowers:test-driven-development`
- **Comando:** `E2E_BASE_URL=https://site-capital-imobiliario-owa3d7dk0-rafitusramos-projects.vercel.app npm run e2e`
- **Usuário de QA configurado:** sim

## Resumo

Execução final (1 rodada completa, sem retentativas).

| Spec | Projeto | Passou | Falhou | Pulou |
| --- | --- | ---: | ---: | ---: |
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
| admin-crm | desktop | 5 | 0 | 0 |
| admin-parametros | desktop | 2 | 0 | 0 |
| setup (login) | setup | 1 | 0 | 0 |
| **Total** | | **82** | **0** | **0** |

## Falhas

_Nenhuma._

## Pulos e motivos

| Teste | Projeto | Motivo |
| --- | --- | --- |
| _nenhum_ | | |

## Alterações nos testes

`tests/e2e/landings.spec.ts`: novo `describe` "/financiamento/ — taxas de mercado de outubro/2026" (5 testes por projeto, desktop e mobile):

- card "Entre bancos" contém `~3,3 p.p.`;
- uma linha da tabela comparativa por teste (Balcão mais caro, Taxa média de balcão, Melhor taxa em cotação), conferindo taxa, parcela, total e a nota "R$ 355 mil / R$ 169 mil a mais que a melhor taxa";
- os dois `p.disclaimer` contêm `outubro/2026`, o da tabela contém `(11,69% a 15% a.a.)`, e o texto da página não contém `julho/2026`, `13,99%` nem `2,3 p.p.`.

Ciclo TDD (RED): o novo bloco foi rodado contra o site em produção (cópia antiga, só GET) e falhou 4 de 5 por motivo correto: o card mostrava a diferença antiga, as linhas "Balcão mais caro" e "Taxa média de balcão" traziam taxas/parcelas/totais antigos, e o aviso dizia "julho/2026". O que passou (linha "Melhor taxa em cotação") tem os mesmos números nas duas versões, então não distingue copy antigo de novo. GREEN: 5/5 passam em desktop e mobile no deploy da branch. As asserções usam `toContainText` sobre a linha, independente de a tabela virar cards no mobile. Nenhuma asserção enfraquecida, nenhum `waitForTimeout`, nenhum código do app alterado.

## Defeitos do app

Nenhum encontrado.

## Observações

- Uma única rodada completa foi necessária (limite de 3).
- `npx eslint .`: 0 erros, 0 avisos. `npx tsc --noEmit`: sem erros. `landings.spec.ts` está em UTF-8 (fim de linha CRLF, como o restante do repositório no Windows).
- Seletores `table.tabela tbody tr`, `.cel` e `p.disclaimer` são CSS: a página não expõe roles/ids utilizáveis nesses blocos (célula do card sem heading; aviso é `<p>`).

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação ou formulário enviado.
- [x] Nenhuma Server Action registrada pela fixture `acoesServidor` como disparada.

## Veredito

**APROVADO** — a rodada final completa teve 82 passando, 0 falhas e 0 pulos; a copy de outubro/2026 em `/financiamento/` está correta em desktop e mobile.
