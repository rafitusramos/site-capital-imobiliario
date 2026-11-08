# Relatório de testes funcionais

- **Branch:** `feature/testes-funcionais`
- **Commit (SHA):** `ed488f46fa6993439c4c881723eeb040f51ea053` (mais a correção de teste em `tests/e2e/admin-editor.spec.ts`, ainda não commitada)
- **URL do deploy:** <https://site-capital-imobiliario-cxio60ibk-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-08 18:26
- **Executor:** Sonnet 5.5 (subagente); skills `playwright-e2e` e `superpowers:test-driven-development`
- **Comando:** `E2E_BASE_URL=https://site-capital-imobiliario-cxio60ibk-rafitusramos-projects.vercel.app npm run e2e`
- **Usuário de QA configurado:** sim

## Resumo

Execução final (3ª rodada de verificação; 2 execuções completas + 1 parcial): 67 passaram, 0 falharam, 0 puladas.

| Spec | Projeto | Passou | Falhou | Pulou |
| --- | --- | ---: | ---: | ---: |
| imoveis-listagem | desktop | 2 | 0 | 0 |
| imoveis-listagem | mobile | 2 | 0 | 0 |
| imovel-pagina | desktop | 5 | 0 | 0 |
| imovel-pagina | mobile | 5 | 0 | 0 |
| landings | desktop | 7 | 0 | 0 |
| landings | mobile | 7 | 0 | 0 |
| seo | desktop | 8 | 0 | 0 |
| seo | mobile | 8 | 0 | 0 |
| admin-listas | desktop | 11 | 0 | 0 |
| admin-editor | desktop | 4 | 0 | 0 |
| admin-crm | desktop | 5 | 0 | 0 |
| admin-parametros | desktop | 2 | 0 | 0 |
| setup (login) | setup | 1 | 0 | 0 |
| **Total** | | **67** | **0** | **0** |

## Falhas

Na primeira rodada completa houve 1 falha, corrigida (defeito do teste, não do app):

- `admin-editor` / desktop — "alteração não salva dispara o diálogo de descarte, sem gravar nada". Esperado: valor do Resumo = original + "x". Obtido: "x" + original. O `pressSequentially` digitou com o cursor no início do textarea, pois `getByLabel` não posiciona o cursor no fim. O app se comportou corretamente. Artefatos (descartáveis, ignorados pelo git): `tests/functional-tests/.artefatos/admin-editor--admin-posts--816b1-de-descarte-sem-gravar-nada-desktop/` (screenshot, trace, error-context).

Nas execuções seguintes: _nenhuma falha._

## Pulos e motivos

| Teste | Projeto | Motivo |
| --- | --- | --- |
| _nenhum_ | | |

## Correções feitas nos testes

1. `tests/e2e/admin-editor.spec.ts` (descarte de alterações): antes de digitar, `resumo.click()` + `press("ControlOrMeta+End")` para o cursor ir ao fim do textarea. A asserção (`original + "x"`) e a intenção do teste foram mantidas; nenhum `waitForTimeout`. Reexecutado o spec (5/5) e depois a suíte completa (67/67).

## Defeitos do app

Nenhum encontrado. Nenhum código de app (`app/`, `components/`, `lib/`, `styles/`) foi alterado.

## Observações

- A suíte passou inteira contra o deploy da branch, nos dois projetos (desktop e mobile Pixel 7); os specs de imóvel (orçamento de imagens via `/_next/image`, carrossel com slide ativo dentro da tela e legenda) passaram em ambos. Os valores numéricos exatos (contagem de requisições de imagem, medida de 540px) não são impressos pelo reporter da suíte; só se sabe que ficaram dentro dos limites asseridos.
- Os testes "console limpo" de `seo` passaram em todas as rotas, sem erros de console.
- O Chromium já estava instalado; `npm run e2e:instalar` apenas baixou o winldd.
- Tempo total da suíte: cerca de 47 s a 1,3 min.
- `npx eslint .`: 0 erros, 0 avisos. `npx tsc --noEmit`: sem erros.

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação ou formulário enviado.
- [x] Nenhuma Server Action registrada pela fixture `acoesServidor` como disparada (todos os testes que a usam exigem lista vazia e passaram).

## Veredito

**APROVADO** — a execução completa final teve 67 passou, 0 falhou, 0 pulou; a única falha inicial era defeito do teste (cursor no início do textarea), corrigido sem enfraquecer a asserção.
