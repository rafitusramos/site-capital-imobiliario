# Relatório de testes funcionais

- **Branch:** `Preview` (validação final antes da promoção para `main`)
- **Commit (SHA):** `4241584 (4241584 2a524034a951d1dc484a4066dd4e701d5)`
- **URL do deploy:** <https://site-capital-imobiliario-opj2l0hlv-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-08 20:00
- **Executor:** Sonnet 5.5 (subagente); skills playwright-e2e e superpowers:test-driven-development
- **Comando:** `E2E_BASE_URL=https://site-capital-imobiliario-opj2l0hlv-rafitusramos-projects.vercel.app npm run e2e`
- **Usuário de QA configurado:** sim

## Resumo

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
| admin-crm | desktop | 5 | 0 | 0 |
| admin-parametros | desktop | 2 | 0 | 0 |
| **Total** | | **82** | **0** | **0** |

## Falhas

_Nenhuma._ Uma única execução completa (1,5 min); não foi preciso reexecutar.

## Pulos e motivos

| Teste | Projeto | Motivo |
| --- | --- | --- |
| _nenhum_ | | |

## Observações

Verificações com curl (sem seguir redirects) neste deploy:

- `/imoveis/condominio-piu-bello/` responde **308** com `Location` `/imoveis/`.
- `/financiamento/` contém "outubro/2026" e tem 0 ocorrências de "julho/2026".
- `/sitemap.xml` responde **200**. O slug removido `/imoveis/condominio-piu-bello/` não consta. Uma busca ingênua por `condominio-piu-bello` acha 1 linha, mas é o imóvel distinto e vigente `/imoveis/apartamento-de-2-suites-condominio-piu-bello/` (casa por substring, não é o slug removido).

Sem flakiness, sem lacunas novas observadas.

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação ou formulário enviado.
- [x] Nenhuma Server Action registrada pela fixture `acoesServidor` como disparada (nenhuma falha de suíte).

## Veredito

**APROVADO** — 82/82 testes passaram, zero falhas e zero pulos, e os três checks com curl confirmaram redirect, taxas de outubro/2026 e sitemap.
