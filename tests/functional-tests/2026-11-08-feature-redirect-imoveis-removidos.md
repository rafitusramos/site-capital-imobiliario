# Relatório de testes funcionais

- **Branch:** `feature/redirect-imoveis-removidos`
- **Commit (SHA):** `a6dc79d1c62b2d083f32a4f21eba0f34448ee29e`
- **URL do deploy:** <https://site-capital-imobiliario-4vd0xwx55-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-08 18:43
- **Executor:** Sonnet 5.5 (subagente), skills `playwright-e2e` e `superpowers:test-driven-development`
- **Comando:** `E2E_BASE_URL=https://site-capital-imobiliario-4vd0xwx55-rafitusramos-projects.vercel.app npm run e2e`
- **Usuário de QA configurado:** sim

## Resumo

| Spec | Projeto | Passou | Falhou | Pulou |
| --- | --- | ---: | ---: | ---: |
| imoveis-listagem | desktop | 2 | 0 | 0 |
| imoveis-listagem | mobile | 2 | 0 | 0 |
| imoveis-redirect (novo) | desktop | 2 | 0 | 0 |
| imoveis-redirect (novo) | mobile | 2 | 0 | 0 |
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
| auth.setup | setup | 1 | 0 | 0 |
| **Total** | | **71** | **0** | **0** |

Uma única execução completa (de no máximo 3 permitidas), 1,1 min.

## Falhas

_Nenhuma._

## Pulos e motivos

_Nenhum._

| Teste | Projeto | Motivo |
| --- | --- | --- |

## Correções em testes

Nenhuma. Nenhum arquivo em `tests/e2e/**` foi alterado.

## Defeitos do app

Nenhum encontrado.

## Observações

Verificação manual com `curl -sI` (sem seguir redirects) no deploy da branch:

- `/imoveis/condominio-piu-bello/` (slug removido): **HTTP/1.1 308 Permanent Redirect**, `Location: /imoveis/`.
- `/imoveis/jabo-studio/` (slug existente, listado no sitemap): **200**.
- `/imoveis/`: 200.

O novo spec `imoveis-redirect.spec.ts` (slug inexistente: status 301/308 com `location` terminando em `/imoveis/`, e navegação que termina na listagem com h1 visível) passou em desktop e mobile.

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação ou formulário enviado.
- [x] Nenhuma Server Action registrada pela fixture `acoesServidor` como disparada (nenhuma falha reportada por ela na execução).

## Veredito

**APROVADO** — execução completa final com 71 passando, 0 falhas e 0 pulos; o redirect 308 para `/imoveis/` em slug removido foi confirmado por spec e por curl, e slug existente segue 200.
