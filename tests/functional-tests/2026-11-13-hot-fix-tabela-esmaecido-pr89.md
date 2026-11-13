# Relatório de testes funcionais — hot-fix/tabela-esmaecido (PR #89)

- **Branch:** `hot-fix/tabela-esmaecido`
- **Commit (SHA):** `b7b291384e2ce53759a6143f55a85eaede98892b`
- **URL do deploy:** <https://site-capital-imobiliario-git-hot-f-d18e89-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-13, entre 07:00 e 08:10
- **Executor:** subagente Sonnet 5.5, skills `playwright-e2e` e `superpowers:test-driven-development`
- **Comando:** `E2E_BASE_URL=<url> npx playwright test` (equivale a `npm run e2e`), 6 workers
- **Usuário de QA configurado:** sim (`.env.e2e.local` copiado do repositório principal, ignorado pelo git, não commitado)

## O que mudou

Tabela do artigo passa a sair em `.tabela-moldura` > `.tabela-rolagem` (`components/blog/TabelaRolavel.tsx`, client). A moldura recebe `data-dir` quando há colunas escondidas à direita e `data-esq` depois de rolar; `styles/blog.css` desenha esmaecidos de 40px até `--branco` em `::before`/`::after`. O HTML do servidor sai sem esmaecido.

## Resumo

Duas execuções completas com o usuário de QA (o `.env.e2e.local` não existia no worktree; ver Observações).

| Execução | Passou | Falhou | Pulou | Total |
| --- | ---: | ---: | ---: | ---: |
| Execução A | 199 | 4 | 2 | 205 |
| Execução B | 198 | 4 | 3 | 205 |

Specs do PR e da rodada anterior de blog:

| Spec | Projeto | Execução A | Execução B |
| --- | --- | --- | --- |
| blog-tabelas (2 testes) | desktop | 2 passaram | 2 passaram |
| blog-tabelas (2 testes) | mobile | 2 passaram | 2 passaram |
| blog-autor (9 testes por projeto) | desktop | 7 passaram, 2 falharam | 7 passaram, 2 falharam |
| blog-autor (9 testes por projeto) | mobile | 7 passaram, 2 falharam | 7 passaram, 2 falharam |

Vitest (`npx vitest run`, caminho com `C:` maiúsculo): 80 arquivos, **1328 passaram + 1 expected fail**, 0 falhas.

## Falhas

As mesmas 4 nas duas execuções, todas em `tests/e2e/blog-autor.spec.ts`, em desktop e mobile:

1. `não mostra 'Revisado em' (migration 034 ainda não aplicada)` (linha 94): esperava 0 `.artigo-revisado`, recebeu 1 em `/blog/home-equity-para-comprar-outro-imovel/`.
2. `sitemap: lastmod de cada /blog/<slug>/ = dia de publicação` (linha 116): esperava `2026-09-11`, recebeu `2026-11-13` para o mesmo slug.

**Diagnóstico: defeito do teste (premissa vencida), não do PR.** O artigo `home-equity-para-comprar-outro-imovel` ganhou `revisado_em = 2026-11-13` no banco compartilhado (a migration 034 já está aplicada, e alguém preencheu o campo hoje). Com isso o artigo mostra "Revisado em 13-11-2026" e o sitemap usa a data de revisão como `lastmod`, exatamente o comportamento especificado em `lib/blog/revisao.ts`. Os dois testes foram escritos quando nenhum post tinha revisão. **Confirmado em produção** (<https://rtcapitalimobiliario.com.br>): a mesma página já serve `class="artigo-revisado">Revisado em ... 13-11-2026`, ou seja, o deploy do PR e a produção se comportam igual. Os testes não foram alterados (instrução de não afrouxar testes alheios); precisam de ajuste próprio, por exemplo aceitar `lastmod` = `revisado_em` quando o artigo exibe "Revisado em".

Evidência: `tests/functional-tests/.artefatos/pr89/runA.txt` e `runB.txt` (saída completa).

## Pulos e motivos

| Teste | Projeto | Motivo |
| --- | --- | --- |
| `admin-crm-simulacao.spec.ts:288` lead de home equity sem Simulações | desktop | condicional a dado de produção (sem lead de home equity). Pulou nas duas execuções |
| `blog-autor.spec.ts:174` editor de post tem o campo Revisado em | mobile | spec de admin só roda em desktop; pulo por projeto. Pulou nas duas execuções |
| `admin-listas.spec.ts:77` publicar/despublicar abre diálogo | desktop | condicional a dado (só pulou na execução B) |

## Verificação visual e de comportamento (Playwright, 360x740 e 1280x900)

Artefatos em `tests/functional-tests/.artefatos/pr89/` (pasta ignorada pelo git, verificado com `git check-ignore`); medições em `visual.json`, scripts `visual.mjs` e `visual2.mjs`. Percorridos os 15 artigos da listagem.

**Mobile 360x740, artigo com tabela larga** (`/blog/investir-em-imovel-em-2026-a-conta-inteira-contra-a-selic-a-14/`, tabela de 802px numa coluna de 312px):

- Estado inicial (`mobile-inicial.png`, `mobile-inicial-tabela.png`): `data-dir` ligado, sem `data-esq`; `::after` com opacidade 1, `::before` com 0. Nesta tabela de 2 colunas a primeira coluna ocupa quase toda a largura, então a segunda coluna está inteira fora da tela e o único indício visual é o esmaecimento das linhas divisórias à direita (discreto, mas perceptível). O texto da primeira coluna fica nítido.
- Em tabela com várias colunas (`mobile-vinhedo-inicial.png`, "Os condomínios de Vinhedo"): CONDOMÍNIO, N e MÍNIMO aparecem; a última coluna visível (R$ 1,07 mi etc.) e as linhas se dissolvem suavemente no fundo branco; o texto continua legível. Sinal claro de que há mais à direita.
- Rolada até o fim (`mobile-fim.png`, `mobile-fim-tabela.png`, `mobile-vinhedo-fim.png`): `data-esq` ligado, `data-dir` ausente; `::after` 0, `::before` 1. Na tela vê-se o lado esquerdo esmaecido (cabeçalho "MÁXIMO" e o "R$" mais claros) e o lado direito totalmente nítido, com a última coluna ("CABE NO SFH") inteira.
- Posição intermediária (`mobile-meio-tabela.png`): os dois esmaecidos ligados (`dir` e `esq` verdadeiros).
- Em todas as 16 tabelas largas dos 15 artigos: `data-dir` ligado e `data-esq` ausente no início; nenhuma tabela que cabe na coluna recebeu esmaecido. Caso limítrofe sem defeito: uma tabela de `home-equity-para-comprar-outro-imovel` tem 317px contra 312px de coluna (5px de excesso) e também mostra o esmaecido direito, o que é coerente com a medição.

**(a) Desktop 1280:** 16 tabelas em 15 artigos, nenhuma mais larga que a coluna, nenhum `data-dir`/`data-esq`, `::before`/`::after` com opacidade 0. Nenhum esmaecido (`desktop-tabela.png`: tabela completa, sem véu nas bordas).

**(b) Teclado (mobile):** 14 toques de Tab até a região da tabela alvo; ela recebe o foco e casa com `:focus-visible`. O contorno `2px solid rgb(31, 107, 78)` (`--jade`) com `outline-offset` 4px aparece completo nos quatro lados (`mobile-foco.png`): a caixa do contorno vai de x=18 a x=342 dentro dos 360px, e nenhum ancestral da região tem `overflow` (a moldura não corta). ArrowRight 3 vezes: `scrollLeft` 0 para 120, `data-esq` liga e `data-dir` permanece (`mobile-foco-apos-seta.png`). Mais 40 ArrowRight: chega ao fim (restante 0), `data-dir` some e `data-esq` fica. 60 ArrowLeft: volta ao início, `data-esq` some e `data-dir` volta. Esmaecidos acompanham a rolagem por teclado.

**(c) Console:** zero erros de console e zero `pageerror` nos 15 artigos, em mobile e desktop (nenhum React #418 nem aviso de hidratação).

**(d) Rolagem horizontal da página em 360px:** `scrollWidth` máximo 360 nos 15 artigos; nenhum acima de 360.

Observação de aparência: o banner de cookies cobre a parte baixa nos screenshots de tela cheia (`mobile-inicial.png`, `mobile-fim.png`, `mobile-foco.png`); os screenshots `mobile-vinhedo-*` e `mobile-mcmv-*` foram feitos com o banner oculto por CSS (só no navegador de teste) para mostrar a tabela inteira.

## Observações

- **Primeira tentativa travou:** o `npm run e2e` rodado do PowerShell com saída redirecionada para `.artefatos/` ficou preso por cerca de uma hora sem iniciar nenhum worker (o Playwright limpa o `outputDir`, que é `tests/functional-tests/.artefatos`, e apagou a pasta do log). Processos encerrados, nada foi gravado no deploy. Refeito com `npx playwright test` e log fora de `.artefatos/`; a causa exata do travamento não foi investigada (o deploy respondia 200).
- **Primeira execução sem QA:** sem `.env.e2e.local` no worktree, `auth.setup` pulou, os specs de admin foram pulados (39 pulos, 161 passaram, 5 falharam: as 4 acima mais o admin de blog-autor por `.auth/admin.json` ausente). Essa execução foi descartada; as duas execuções oficiais acima rodaram com o usuário de QA.
- Os logs completos das três execuções estão em `.artefatos/pr89/` (`run1.txt` sem QA; `runA.txt`, `runB.txt` oficiais).
- O esmaecido é intencionalmente discreto em tabelas de 2 colunas cuja primeira coluna ocupa a largura toda (a segunda coluna fica totalmente escondida e só as linhas indicam continuação). Não é defeito do PR, mas é onde o sinal é mais fraco.
- Lacuna de cobertura do spec novo: ele só exercita a tabela largada via `scrollLeft` programático; a rolagem por teclado foi checada aqui manualmente, não está no spec.

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação ou formulário enviado. Os scripts de visual só fazem GET e rolagem/teclado na página pública.
- [x] Nenhuma Server Action registrada pela fixture `acoesServidor` como disparada (a suíte só falhou em asserções de leitura).

## Veredito

**APROVADO, com ressalva.** O PR faz o que promete (esmaecido direito no início, esquerdo ao rolar, nenhum em desktop, foco visível completo, teclado atualiza, sem erro de console, sem rolagem horizontal) e `blog-tabelas` passa nos dois projetos nas duas execuções, com Vitest em 1328 + 1 expected fail. A suíte não está 100% verde: 4 falhas em `blog-autor.spec.ts` vêm de dado de produção (artigo com "Revisado em" 13-11-2026), reproduzem em produção e independem do PR; merecem um hot-fix de teste à parte.

## Adendo (validação Opus)

As 4 falhas de `blog-autor.spec.ts` eram premissa vencida dos testes: o dono preencheu "Revisado em" num artigo real em 2026-11-13 (validação pedida após o PR #84). Os testes passaram a conferir a regra em vez da ausência: "Revisado em", quando aparece, é posterior à publicação e é o `dateModified`; o `lastmod` do sitemap é a revisão visível, senão a publicação (`lib/blog/revisao.ts`). O teste antigo "dateModified = datePublished" foi absorvido pelo novo.

Rodada final, suíte completa com 6 workers contra o mesmo deploy: **201 passou / 0 falhou / 2 pulou**. A captura `mobile-vinhedo-inicial.png` foi conferida: a terceira coluna se dissolve no fundo, texto legível.

**Veredito final: APROVADO.**
