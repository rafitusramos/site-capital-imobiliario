# Relatório de testes funcionais — PR #91 (Instagram comentário -> DM)

- **Branch:** `feature/instagram-dm`
- **Commit (SHA):** `d86fced348c27dfb3954483b69c0bfd054bfa38b` (HEAD testado; o spec novo e este relatório entram no commit seguinte)
- **URL do deploy:** <https://site-capital-imobiliario-git-featu-8f41ec-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-13
- **Executor:** agente Sonnet 5.5 com as skills `playwright-e2e` e `superpowers:test-driven-development`
- **Comando:** `$env:E2E_BASE_URL="<url>"; npm run e2e` (suíte completa) e `npm run e2e -- tests/e2e/instagram-dm.spec.ts --project=desktop` (spec novo)
- **Usuário de QA configurado:** sim

## Contexto

Migrations 035/036 (`ig_*`) ainda NÃO aplicadas e variáveis `META_*`/`CRON_SECRET` só existem na Vercel
Production: no preview o esperado é 503 nas rotas Meta e admin Instagram em estado vazio, sem 500.
Os únicos POSTs enviados foram a `/api/meta/webhook/` e `/api/meta/disparar/` (recusados com 503).

## Resumo

Spec novo `tests/e2e/instagram-dm.spec.ts` (12 testes por projeto):

| Teste | Resultado |
| --- | --- |
| GET `/api/meta/webhook/?hub.mode=subscribe&hub.verify_token=...&hub.challenge=abc123` -> 503, sem eco do challenge | passou |
| POST `/api/meta/webhook/` -> 503 | passou |
| POST `/api/meta/disparar/` -> 503 | passou |
| `/ir/codigo-que-nao-existe-qa/` -> 302 ao site, `x-robots-tag: noindex`, `cache-control: no-store` | passou |
| `/robots.txt` contém `Disallow: /ir/` e `Disallow: /admin` | passou |
| `/politica-de-privacidade/`: seção `#conversas-no-instagram` (13.), canonical intacta | passou |
| Sidebar mostra "Instagram" | passou |
| `/admin/instagram/`, `/automacoes/`, `/automacoes/nova/`, `/conexao/`: sem 5xx, sem erro de console, sem Server Action | passou (4) |
| Nova automação: contador `650/640` marcado como excesso, SEM enviar | passou |

Suíte completa (`npm run e2e`, 2,9 min): **225 passaram, 0 falharam, 2 pularam.**

| Spec | Projeto | Passou | Falhou | Pulou |
| --- | --- | ---: | ---: | ---: |
| instagram-dm (novo) | desktop | 12 | 0 | 0 |
| instagram-dm (novo) | mobile | 12 | 0 | 0 |
| admin-crm-simulacao | desktop | 7 | 0 | 1 |
| admin-crm / admin-editor / admin-listas / admin-parametros / admin-simulacao-rota | desktop | 11 / 5 / 11 / 2 / 3 | 0 | 0 |
| blog-autor | desktop / mobile | 8 / 7 | 0 | 0 / 1 |
| demais (landings, seo, legal, robos-ia, imoveis-*, imovel-pagina, blog-tabelas) | desktop + mobile | todos | 0 | 0 |
| **Total** | | **225** | **0** | **2** |

## Estado observado das telas de admin (migrations ausentes)

Todas renderizam com h1 correto e sem 500; nenhuma mensagem de erro/aviso de "tabela ausente", apenas vazio:

- `/admin/instagram/` — "Caixa de entrada do Instagram": Hoje 0 comentários / 0 receberam o link / 0 abriram / 0 falhas; "Nenhuma pessoa na caixa ainda".
- `/admin/instagram/automacoes/` — "Nenhuma automação ainda", botão "Nova automação".
- `/admin/instagram/automacoes/nova/` — formulário completo (Nome 0/80, passos 1-3...), botão "Salvar automação" (não clicado).
- `/admin/instagram/conexao/` — "Nenhuma conta conectada. Conecte para ativar as automações." + botão "Conectar Instagram" (não clicado).

## Pulos e motivos

| Teste | Projeto | Motivo |
| --- | --- | --- |
| admin-crm-simulacao: lead de home equity sem bloco Simulações | desktop | sem lead de home equity na aba (pré-existente, não relacionado) |
| blog-autor: admin campo "Revisado em" | mobile | spec de admin não roda no projeto mobile (pré-existente) |

## Falhas

_Nenhuma no código._ Na primeira execução do spec novo 4 testes falharam por erro do PRÓPRIO teste
(seletor `main.or(body)` violava strict mode); corrigido e reexecutado, 13/13 verdes (incluindo setup).

## Observações

- TDD: o spec foi escrito contra código já implementado (teste de aceitação do PR), então o "vermelho"
  observado foi só o erro de seletor acima, não ausência de funcionalidade.
- Achado (baixa): com as migrations ausentes as telas do Instagram mostram estados vazios normais, sem
  indicar que as tabelas não existem. Após o merge em Preview (migrations aplicam), reconferir que a
  caixa/automações carregam dados reais; hoje não há como distinguir "vazio" de "tabela ausente" na UI.
  Não é bloqueante.
- A trava 503 foi confirmada de ponta a ponta: nem o GET de verificação devolve o challenge no preview.
- Itens `// CONFERIR:` de `lib/instagram/graph.ts` (Graph real) seguem fora do escopo: exigem a conta real.
- Não testado por segurança: conectar conta, salvar/pausar automação, "Excluir dados deste contato".

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação ou formulário enviado.
- [x] Nenhuma Server Action disparada (`acoesServidor` vazio nas telas do Instagram; asserção no spec).

## Veredito

**APROVADO** — rotas Meta recusam com 503 no preview, `/ir/` é seguro (302 + noindex), política e robots
corretos, admin Instagram renderiza sem erro em estado degradado, e a suíte completa passa (225/0/2).
