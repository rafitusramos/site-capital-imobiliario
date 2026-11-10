# Relatório de testes funcionais

- **Branch:** `feature/simulacao-financiamento` (PR #74)
- **Commit (SHA):** `8cc60429db3d3200494ff9e783344d2d425d1234`
- **URL do deploy:** <https://site-capital-imobiliario-kby5wn4fp-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-09
- **Executor:** Sonnet 5.5 (subagente), skills `playwright-e2e` e `superpowers:test-driven-development`
- **Comando:** `E2E_BASE_URL=<url> npm run e2e`
- **Usuário de QA configurado:** sim (login resolveu dentro do timeout de 20 s; nenhum spec de admin pulou por falta de sessão)

## Resumo

Rodada final completa (a suíte inteira, incluindo o spec novo `admin-crm-simulacao`): **96 passou, 0 falhou, 3 pulou** (inclui o projeto `setup`).

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
| admin-crm | desktop | 9 | 0 | 2 |
| admin-parametros | desktop | 2 | 0 | 0 |
| admin-simulacao-rota (sem login) | desktop | 3 | 0 | 0 |
| **admin-crm-simulacao (novo)** | desktop | 7 | 0 | 1 |
| **Total** | | **96** | **0** | **3** |

Rodada anterior (só sem o spec novo): 88 passou, 1 falhou, 2 pulou. A falha foi `seo.spec.ts` mobile, `/sobre/`: `page.goto` estourou 30 s (partida a frio do deploy). Não se repetiu na rodada seguinte (passou); sem relação com o PR.

## Falhas

Na rodada final: _nenhuma_. Na rodada anterior, a única falha (timeout de `page.goto` em `/sobre/`, mobile) foi intermitente e passou ao reexecutar.

## Pulos e motivos

| Teste | Projeto | Motivo |
| --- | --- | --- |
| admin-crm-simulacao: lead de home equity não tem "Simulações" | desktop | nenhum lead em home equity na aba: bloco não verificável com dado real |
| admin-crm: Exportar CSV | desktop | o spec pula se o botão não está no DOM no instante da checagem (`count()` logo após `goto`, antes da hidratação); na rodada anterior passou |
| admin-crm: abre o modal do lead e fecha | desktop | idem, "nenhum lead nesta aba" avaliado antes dos cards renderizarem; na rodada anterior passou |

Os dois últimos pulos são fragilidade preexistente de `admin-crm.spec.ts` (contagem sem espera), não do PR: variam de uma rodada para outra (na primeira, os 11 testes desse spec passaram; `admin-listas` teve 2 pulos "lista vazia" na primeira e 0 na segunda).

## Cobertura nova (`tests/e2e/admin-crm-simulacao.spec.ts`, somente leitura)

- Modal de lead de financiamento: bloco "Simulações" e botão "Enviar simulação" presentes; **histórico vazio** (tabela ainda ausente, migration 030) e o modal não quebrou, sem exceção de página.
- Diálogo aberto por "Enviar simulação" (avulso): `aria-modal`, input de arquivo só PDF (`accept` com pdf), botão Cancelar, botão de envio desabilitado sem PDF; foco preso em 8 Tab e 8 Shift+Tab; Esc fecha só o diálogo e o modal do lead continua aberto; reabrir e fechar por Cancelar.
- Arquivo fictício que não é simulação (PDF mínimo gerado em memória): alerta de erro claro, nenhuma prévia (sem iframe, sem resumo) e envio desabilitado.
- Arquivo com tipo diferente de PDF: "Anexe o PDF da simulação da Creditas." e nenhuma prévia.
- Home equity: sem o bloco "Simulações" (pulado por falta de lead; ver acima).
- Rota autenticada: `acao: "previa"` com dados fictícios e leadId inexistente = 404 JSON (sem PDF); corpo inválido = 400; JSON malformado = 400. Nenhum spec usa `acao: "enviar"` autenticado.
- Rede de proteção por teste: captura de requests à rota da simulação (nenhuma chamada nos testes de UI, portanto nenhum `enviar` nem `previa`) e conferência de que nenhuma Server Action nova surge depois que o modal estabiliza. Abrir o modal dispara a Server Action de **leitura** do detalhe (comportamento já existente; contada como base).

## Observações

- Esperado, não é falha: histórico vazio (migration 030 ainda não aplicada).
- Não exercitado, por política (banco de produção e e-mail a cliente real): envio real, gravação no bucket, histórico preenchido, download do PDF, geração real de prévia a partir de uma simulação Creditas, botões "Mover e enviar"/"Mover sem enviar" e o movimento de etapa com diálogo. **Só serão verificados por teste manual do dono, depois do merge.**
- Nenhum PDF foi salvo; o único PDF usado é o fictício gerado em memória. Nenhum dado de lead real está nos specs nem neste relatório.
- Ruído de console de terceiros: nenhum erro de hidratação nos specs de CRM.

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação ou formulário enviado.
- [x] Nenhuma Server Action de movimento/escrita: o único POST de Server Action observado nos testes de CRM é a leitura do detalhe ao abrir o modal; nenhuma chamada a `/api/admin/crm/simulacao/` partiu dos testes de UI; na rota só `previa` com leadId inexistente (404) e corpos inválidos (400).

## Veredito

**APROVADO** — 96 passou, 0 falhou na rodada final; a única falha da rodada anterior foi timeout intermitente de rede em página pública não tocada pelo PR. A UI de simulação se comporta como especificado nos limites verificáveis sem escrever em produção; envio, histórico e download dependem de teste manual pós-merge.
