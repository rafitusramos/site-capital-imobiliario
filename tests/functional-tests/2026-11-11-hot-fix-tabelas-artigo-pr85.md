# Relatório de testes funcionais — hot-fix/tabelas-artigo (PR #85)

- **Data:** 2026-11-11
- **Deploy testado:** https://site-capital-imobiliario-git-hot-f-858caa-rafitusramos-projects.vercel.app
- **Executado por:** Opus (implementação e teste na mesma sessão, sem subagente, por ser correção pequena)
- **Política:** somente leitura (`tests/functional-tests/README.md`)

## O que mudou
Tabela do corpo do artigo passa a sair dentro de `div.tabela-rolagem` (`overflow-x:auto`, `role="region"`, `aria-label`, `tabIndex=0`), via `components/blog/markdown.tsx`. Antes, em 360px, três artigos com tabela larga deixavam a página inteira com rolagem horizontal (scrollWidth 422 a 486), também em produção.

## Resultados
| Execução | Passaram | Falharam | Pularam |
|---|---|---|---|
| `blog-tabelas.spec.ts` (novo) | 3 | 0 | 0 |
| Suíte completa (`npm run e2e`) | 184 | 0 | 1 |
| `npm test` (unidade) | 1293 + 1 expected fail | 0 | — |

`tsc --noEmit` e `eslint .` limpos.

## Evidências
- `blog-tabelas.spec.ts` abre todos os artigos da listagem `/blog/` em 360x740: nenhum com `scrollWidth` acima de 360, toda tabela dentro do invólucro com `role="region"` e `tabindex="0"`, e ao menos um artigo com tabela exercitado.
- "Os condomínios de Vinhedo" (tabela de 5 colunas, antes 486px): `scrollWidth` 360; a tabela mostra as 3 primeiras colunas e rola dentro do invólucro.

## Pulos
1 pulo condicional a dado do banco de produção (mesmo padrão das rodadas anteriores).

## Veredito
**APROVADO.**
