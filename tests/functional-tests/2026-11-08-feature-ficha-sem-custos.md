# Relatório de testes funcionais

- **Branch:** `feature/ficha-sem-custos`
- **Commit (SHA):** `4efb1013d951580e3989cd0515bb00bc4c8a00b7`
- **URL do deploy:** <https://site-capital-imobiliario-605yrmxdz-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-08 19:54
- **Executor:** Sonnet 5.5 (subagente), skills `playwright-e2e` e `superpowers:test-driven-development`
- **Comando:** `E2E_BASE_URL=https://site-capital-imobiliario-605yrmxdz-rafitusramos-projects.vercel.app npm run e2e`
- **Usuário de QA configurado:** sim

## Resumo

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
| auth.setup (setup) | setup | 1 | 0 | 0 |
| **Total** | | **82** | **0** | **0** |

Uma única rodada completa (de no máximo 3 permitidas), duração 1,2 min.

## Falhas

_Nenhuma na rodada final._

## Pulos e motivos

| Teste | Projeto | Motivo |
| --- | --- | --- |
| _Nenhum._ | | |

## Alterações em testes

Nenhuma por este agente. A asserção do desenvolvedor em `tests/e2e/imovel-pagina.spec.ts` (teste "imóvel pronto: ordem das seções...") foi revisada e mantida: nenhum `waitForTimeout`, seletores semânticos/estáveis, um comportamento só.

## Defeitos do app

Nenhum.

## Observações

- **Evidência de RED (TDD):** o mesmo teste (`--grep "pronto"`, projeto desktop) rodado contra o deploy atual da branch `Preview` (commit `ceec253`, ficha antiga), <https://site-capital-imobiliario-541mamyv3-rafitusramos-projects.vercel.app>, **falhou pelo motivo certo**: `locator('#descricao-unidade dt').filter({ hasText: /^(Condomínio|IPTU)$/ })` esperava 0 e recebeu 2 (Condomínio e IPTU na ficha). Artefatos: `tests/functional-tests/.artefatos/imovel-pagina--imoveis-slu-fb39d--ausência-das-de-lançamento-desktop/` (screenshot, trace). Na branch (GREEN) o mesmo teste passa.
- **Hero do pronto publicado:** o imóvel `apartamento-de-2-suites-condominio-piu-bello` mostra em `.im-hero-custos` "Condomínio R$ 650/mês" e "IPTU R$ 250/mês" (verificado por GET no deploy da branch). Logo o ramo condicional da asserção (`if count > 0` do hero) é de fato exercido hoje. Ressalva de cobertura: se um dia o pronto publicado não tiver custos, esse trecho passa em vazio; a parte principal (ficha sem os rótulos) é incondicional.
- A ficha `#descricao-unidade` existe no pronto e não existe no lançamento da listagem (comportamento esperado).
- `npx eslint .` sem erros nem avisos; `npx tsc --noEmit` sem erros. Nenhum arquivo modificado (`git status` limpo).

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação ou formulário enviado.
- [x] Nenhuma Server Action registrada pela fixture `acoesServidor` como disparada.

## Veredito

**APROVADO** — 82 passaram, 0 falharam, 0 pularam na rodada completa contra o deploy da branch; a nova asserção falha no deploy antigo (RED) e passa no novo (GREEN).
