# Relatório de testes funcionais — PR #94 (excluir automação mantém o histórico)

- **Branch:** `hot-fix/historico-automacao-excluida`
- **Commit (SHA):** `44e0f5f` (HEAD testado; o spec novo e este relatório entram no commit seguinte)
- **URL do deploy:** <https://site-capital-imobiliario-rm7wra5wa-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-13
- **Executor:** agente Sonnet 5.5 com as skills `playwright-e2e` e `superpowers:test-driven-development`
- **Comando:** `$env:E2E_BASE_URL="<url>"; npm run e2e` (suíte completa, 2,9 min)
- **Usuário de QA configurado:** sim (specs de admin executaram, nenhum pulado por falta de credencial)

## Contexto

A migration 037 (`ig_participacoes.automacao_id` nullable, FK `on delete set null`) NÃO está aplicada no banco:
só roda no merge em Preview. Por isso o rótulo "Automação excluída" numa linha real da caixa de entrada
não é observável aqui (lógica coberta pelos testes unitários, 1605 passando). Este round verifica
regressão e a UI que já está no deploy: caixa de entrada, lista de automações e o texto novo do diálogo de exclusão.

## Resumo

**Suíte completa: 235 passaram, 0 falharam, 2 pularam.**

Testes novos em `tests/e2e/instagram-dm.spec.ts` (desktop e mobile, todos passaram):

| Teste | Resultado |
| --- | --- |
| Home responde 200 | passou |
| `/politica-de-privacidade/` responde 200 | passou |
| `/admin/instagram/`: heading "Hoje" (resumo do dia), filtros "Filtrar por automação" e "Filtrar por situação", sem erro, nenhuma Server Action | passou |
| `/admin/instagram/automacoes/` carrega sem erro, nenhuma Server Action | passou |
| Diálogo "Excluir automação?" contém "continuam na caixa de entrada" e "Automação excluída"; **Cancelar** clicado, nenhuma Server Action | passou (havia ao menos uma automação, o teste não foi pulado) |

Os testes anteriores do spec (rotas Meta 503, `/ir/`, robots, política seção 13, páginas de admin do Instagram,
contador do formulário) seguem verdes. Demais specs (landings, seo, legal, robos-ia, imoveis-*, blog-*, admin-*): todos verdes.

## Pulos e motivos

| Teste | Projeto | Motivo |
| --- | --- | --- |
| admin-crm-simulacao: lead de home equity sem bloco Simulações | desktop | nenhum lead em home equity na aba (pré-existente, não relacionado) |
| blog-autor: admin campo "Revisado em" | mobile | spec de admin só roda no projeto desktop (pré-existente) |

## Falhas

_Nenhuma._

## Observações

- TDD: o teste do diálogo foi escrito contra UI já implementada (teste de aceitação), então não houve "vermelho"
  por ausência de funcionalidade; a asserção depende do texto exato do diálogo e falharia sem a descrição nova.
- Não testado por segurança/ambiente: excluir de fato uma automação (escrita em produção) e a exibição de uma
  participação com `automacao_id` nulo (depende da 037, só aplicada no merge). Reconferir após o merge em Preview
  que a caixa de entrada abre sem erro com a migration aplicada.
- Nenhum dado foi alterado: nenhuma automação criada/editada/pausada/excluída, nenhum contato excluído,
  `/api/meta/disparar` e `/api/meta/webhook` não foram chamados com segredo ou assinatura válidos.

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação ou formulário enviado.
- [x] Nenhuma Server Action disparada nas telas do Instagram (`acoesServidor` vazio, asserção no spec).

## Veredito

**APROVADO** — a suíte completa passa (235/0/2, pulos pré-existentes e não relacionados), a caixa de entrada e
a lista de automações carregam sem erro e o diálogo de exclusão mostra o texto novo sobre o histórico, sendo cancelado.
Ressalva: o rótulo "Automação excluída" em dado real só poderá ser visto depois da 037 aplicada.
