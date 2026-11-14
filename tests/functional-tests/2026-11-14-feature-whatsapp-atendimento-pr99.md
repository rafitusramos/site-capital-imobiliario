# Relatório de testes funcionais — PR #99 (WhatsApp, fase 1)

- **Branch:** `feature/whatsapp-atendimento`
- **Commit (SHA) testado:** `8407777` (o spec novo e este relatório entram no commit seguinte)
- **URL do deploy:** <https://site-capital-imobiliario-git-featu-820dea-rafitusramos-projects.vercel.app>
- **Data (America/Sao_Paulo):** 2026-11-14
- **Executor:** agente Sonnet 5.5 com `playwright-e2e` e `superpowers:test-driven-development`
- **Comando:** `$env:E2E_BASE_URL="<url>"; npm run e2e` (suíte completa)
- **Usuário de QA configurado:** sim (specs de admin rodaram)

## Contexto

A migration 038 (`wa_*`, `leads.consentimento_whatsapp_em`) ainda NÃO está aplicada (só roda no merge em Preview). As variáveis do WhatsApp/Meta não existem no preview.

## Resumo

Suíte completa: **271 passaram, 0 falharam, 2 puladas** (2,5 min). Cobre site, CRM, Instagram (sem regressão) e os specs novos.

| Item | Spec | Resultado |
| --- | --- | --- |
| 2. Config admin | `whatsapp-config.spec.ts` (2 testes) | passou: sidebar com "WhatsApp"; `/admin/whatsapp/` renderiza h1, campo "Número oficial" (vazio) e "Últimos envios", sem erro de console, sem Server Action |
| 3. Consentimento | `whatsapp-consentimento.spec.ts` | passou: texto novo exato em `/financiamento/`, `/home_equity/` e no modal de imóvel (aberto por clique em `[data-abrir-lead]`); nenhum formulário enviado |
| 4. Política | idem + `legal.spec.ts` | passou: seção 14 "Conversas no WhatsApp" com 2 parágrafos e "seção 7"; Meta nas seções 5 e 6; índice com link `#conversas-no-whatsapp`; canonical e title intactos; "Atualizado em 13 de novembro de 2026" mantido |
| 5. Rotas Meta | idem | passou: `GET /api/meta/webhook/` e `POST /api/meta/disparar/` = 503 no preview, sem eco do challenge |

## Falhas

Nenhuma no resultado final. Na primeira rodada, 4 falhas foram erro dos próprios specs novos (não do produto):
`getByLabel("Número oficial")` casava 2 elementos (seção e input) e `getByRole("dialog")` casava também o banner de cookies. Seletores corrigidos (`getByRole("textbox")` e `[aria-labelledby=leadImovelTitulo]`); nova rodada completa verde.

## Pulos

2 pulos pré-existentes (home equity sem lead na aba do CRM; campo "Revisado em" no mobile), iguais aos relatórios anteriores.

## Observações

- `/admin/whatsapp/` sem a migration: a página degrada bem (campo de número vazio, sem erro nem error boundary). Não foi possível validar listas com dados; a validação real depende do merge em Preview.
- TDD: specs de aceitação escritos sobre código já implementado; sem vermelho de produto.
- Não testado por segurança: salvar número, assinar webhooks, enviar formulários, envio real de templates.

## Confirmação da política de segurança

- [x] Nenhuma exclusão, lead movido, publicação, formulário enviado ou configuração salva.
- [x] Nenhuma Server Action disparada em `/admin/whatsapp/` (asserção no spec).
- [x] Rotas `/api/meta/*` chamadas só sem segredos válidos.

## Veredito

**APROVADO** — suíte completa verde (271/0/2), consentimento, política e trava 503 conforme especificado, e a página de admin não quebra antes da migration.
