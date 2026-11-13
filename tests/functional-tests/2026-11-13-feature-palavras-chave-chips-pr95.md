# Relatório de testes funcionais — PR #95 (palavras-chave em chips com sugestões)

- **Branch:** `feature/palavras-chave-chips`
- **Commit (SHA):** `106e218de76c36335a8b9d60a773cd43748c63f8` (HEAD testado; o spec novo e este relatório entram no commit seguinte)
- **URL do deploy:** <https://site-capital-imobiliario-cw1tarkus-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-13
- **Executor:** agente Sonnet 5.5 com as skills `playwright-e2e` e `superpowers:test-driven-development`
- **Comando:** `$env:E2E_BASE_URL="<url>"; npm run e2e` (suíte completa)
- **Usuário de QA configurado:** sim

## Contexto

`/admin/instagram/automacoes/nova/` (e `/[id]/`): o campo "Palavras-chave" virou entrada de chips com
autocomplete (`CampoPalavras.tsx`). Os testes só digitam no formulário e saem sem salvar; a fixture
`acoesServidor` confirma que nenhuma Server Action foi disparada.

## Resumo

Suíte completa: **245 passaram, 0 falharam, 2 puladas** (3,0 min).

Novos testes em `tests/e2e/instagram-dm.spec.ts` (bloco "palavras-chave em chips"), desktop: 10 passaram
(os specs de admin são pulados no projeto mobile pela fixture, como os demais).

| Teste | Resultado |
| --- | --- |
| "abc," cria chip "abc", campo esvazia, texto de ajuda visível | passou |
| "Def" + Enter cria chip; URL inalterada, página não navega, nenhuma Server Action | passou |
| "ABC," e "ábc," após "abc" não duplicam (continua 1 chip) | passou |
| Backspace no campo vazio remove o último chip | passou |
| Botão "Remover palavra um" remove o chip certo | passou |
| Colar "x, y, z" (ClipboardEvent com DataTransfer) cria 3 chips em ordem | passou |
| Blur com texto pendente confirma o chip | passou |
| Sugestões: digitar 2 letras de "Quero informações" (automação existente) abre o listbox "Palavras já usadas", `aria-expanded=true`, opção visível; ArrowDown + Enter adiciona o chip; Escape fecha (`aria-expanded=false`) | passou |
| Layout 1280px: chips dentro da caixa, sem overflow horizontal | passou |
| Layout 390px: chips quebram linha dentro da caixa, sem overflow horizontal | passou |

## Nota visual (390px)

Screenshot inspecionado (`test-results/palavras-chips-390px.png`, não versionado): 6 chips (incluindo
"palavra-longa-de-teste") quebram em 5 linhas dentro da caixa, com foco visível (borda/anel jade); nenhum
chip ultrapassa a borda da caixa e a página não tem rolagem horizontal. Botão "x" de cada chip legível.

## Pulos e motivos

| Teste | Projeto | Motivo |
| --- | --- | --- |
| admin-crm-simulacao: lead de home equity sem bloco Simulações | desktop | sem lead de home equity na aba (pré-existente) |
| blog-autor: admin campo "Revisado em" | mobile | spec de admin não roda no mobile (pré-existente) |

## Falhas

Nenhuma.

## Observações

- A conta do Instagram já está conectada e há uma automação "Teste DM (apagar depois)" com a palavra
  "Quero informações"; o teste de sugestões usou essa palavra apenas como leitura. Nada foi alterado.
- TDD: spec escrito contra código já implementado (teste de aceitação); sem vermelho de produto.
- Não testado por segurança: salvar automação (persistência das palavras), editar `/[id]/`.

## Confirmação da política de segurança

- [x] Nenhuma exclusão, lead movido, publicação, formulário enviado ou automação salva.
- [x] Nenhuma Server Action disparada nas telas do Instagram (asserção `acoesServidor` vazio no spec).
- [x] Nenhuma chamada a `/api/meta/*` com segredos válidos.

## Veredito

**APROVADO** — o campo de chips cumpre todo o comportamento especificado (vírgula, Enter sem submit,
colar, duplicatas, Backspace, remover, blur, sugestões com teclado/Escape), é acessível por papel/rótulo,
o layout mobile não quebra, e a suíte completa passa (245/0/2).
