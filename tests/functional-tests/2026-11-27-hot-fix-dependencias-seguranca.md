# Relatório de testes funcionais

- **Branch:** `hot-fix/dependencias-seguranca` (PR #103)
- **Commit (SHA):** `1ba4b9d6c39400bc128ca7c07d935877c8685894`
- **URL do deploy:** <https://site-capital-imobiliario-nuz468pgl-rafitusramos-projects.vercel.app> (check Vercel verde para este head)
- **Data/hora (America/Sao_Paulo):** 2026-11-27 19:15
- **Executor:** Sonnet 5.5 (subagente de testes), skills `playwright-e2e` e `superpowers:test-driven-development`
- **Comando:** `E2E_BASE_URL=<url> npm run e2e` (suíte completa) + `npx playwright test admin-simulacao-pdf --project=desktop`
- **Usuário de QA configurado:** sim

Escopo do PR: só `package.json`/`package-lock.json` (next 15.5.29, sharp 0.35.5, postcss, vitest 4.1.12,
puppeteer-core 25.16.0, supabase-js 2.119.2, @supabase/ssr 0.12.7; removidos `marked` e `@dnd-kit/modifiers`).
Risco conhecido: puppeteer-core 25.16 mira Chrome 156, `@sparticuz/chromium` segue em 153.

## Resumo

Suíte completa (272 testes, 3,4 min): **271 passaram, 1 falhou (harness, ver abaixo), 1 pulou**.

| Spec | Projeto | Passou | Falhou | Pulou |
| --- | --- | ---: | ---: | ---: |
| auth.setup | setup | 1 | 0 | 0 |
| admin-crm | desktop | 11 | 0 | 0 |
| admin-crm-simulacao | desktop | 7 | 0 | 1 |
| admin-editor | desktop | 5 | 0 | 0 |
| admin-listas | desktop | 11 | 0 | 0 |
| admin-parametros | desktop | 2 | 0 | 0 |
| admin-simulacao-rota | desktop | 3 | 0 | 0 |
| blog-autor | desktop | 8 | 0 | 0 |
| blog-autor | mobile | 7 | 1 | 0 |
| blog-tabelas | desktop / mobile | 2 / 2 | 0 | 0 |
| imoveis-listagem | desktop / mobile | 2 / 2 | 0 | 0 |
| imoveis-redirect | desktop / mobile | 2 / 2 | 0 | 0 |
| imovel-pagina | desktop / mobile | 5 / 5 | 0 | 0 |
| instagram-dm | desktop / mobile | 27 / 27 | 0 | 0 |
| landings | desktop / mobile | 24 / 24 | 0 | 0 |
| legal | desktop / mobile | 5 / 5 | 0 | 0 |
| robos-ia | desktop / mobile | 13 / 13 | 0 | 0 |
| seo | desktop / mobile | 20 / 20 | 0 | 0 |
| whatsapp-config | desktop / mobile | 2 / 2 | 0 | 0 |
| whatsapp-consentimento | desktop / mobile | 6 / 6 | 0 | 0 |
| **admin-simulacao-pdf (novo)** | desktop | 1 | 0 | 0 |
| **Total (suíte + novo spec)** | | **272** | **1 (harness)** | **1** |

Por projeto (suíte completa): setup 1/1; desktop 168 passaram, 0 falharam, 1 pulou; mobile 102 passaram, 1 falhou (harness), 0 pularam.

## Falhas

1. `[mobile] blog-autor.spec.ts:184 › admin: campo Revisado em › editor de post tem o campo e o texto de ajuda`
   - Erro: `Error reading storage state from .auth/admin.json: ENOENT`. Não é regressão do PR.
   - Causa: o projeto `mobile` não depende de `setup`; o `test.use({ storageState })` do describe é lido ANTES do
     `skip(project === "mobile")` do corpo do teste. Como o worktree era novo e `.auth/admin.json` ainda não existia
     quando o worker mobile começou, a fixture falhou. O próprio teste se pula no mobile por desenho.
   - Reexecução (`--project=mobile blog-autor`, com `.auth` já criado): 7 passaram, 1 pulou (este, com o motivo
     "admin só roda no projeto desktop"). Defeito do teste/harness, preexistente (só aparece em checkout sem `.auth/`).
     Sugestão fora do escopo deste PR: ignorar esse describe no projeto mobile ou criar dependência de `setup`.

Nenhuma falha atribuível às dependências.

## Pulos e motivos

| Teste | Projeto | Motivo |
| --- | --- | --- |
| admin-crm-simulacao:288 lead de home equity não tem 'Simulações' | desktop | nenhum lead de home equity visível no CRM (`test.skip` por quadro vazio) |
| blog-autor:184 (só na reexecução) | mobile | "admin só roda no projeto desktop" (por desenho) |

## Verificações específicas do PR

### a. sharp / `next/image` na Vercel: OK

- `/imoveis/` lista 3 imóveis; página `/imoveis/gran-vic-niagara-vinhedo/` serve as fotos via `/_next/image/?url=...supabase.co/.../imovel-images/<uuid>.jpeg&w=...&q=75`.
- `Accept: image/avif,image/webp` -> **HTTP 200, `content-type: image/avif`** (23 661 B, w=828).
- `Accept: image/webp` -> **HTTP 200, `content-type: image/webp`** (41 296 B).
- 8 URLs `/_next/image` distintas da página: todas **200 image/avif**.
- Specs `imovel-pagina` e `imoveis-listagem` (desktop e mobile) passaram.

### b. PDF da simulação (puppeteer-core 25.16 x chromium 153): OK

- Spec novo `tests/e2e/admin-simulacao-pdf.spec.ts` (desktop, usuário de QA). Abre `/admin/crm/financiamento/`,
  abre o modal do primeiro lead (Server Action de LEITURA), captura o `leadId` do corpo dessa action e faz
  `POST /api/admin/crm/simulacao/` com `acao: "previa"` e números fictícios válidos (`corpoSimulacaoSchema`).
  Não cria lead, não usa `anexar`/`enviar`, nada é gravado nem enviado.
- Resultado: **HTTP 200, `content-type: application/pdf`, corpo começando com `%PDF-`, tamanho > 5 KB** (10,8 s, incluindo cold start do Chromium).
  A incompatibilidade de versão (Chrome 156 alvo x binário 153) **não** quebrou a geração.
- TDD: não é possível fazer este teste falhar "pelo motivo certo" alterando código de aplicação (o PR só mexe em
  dependências e é proibido editar código/pacotes). O teste foi escrito para a verificação do estado novo e fica
  como regressão para futuras trocas de `puppeteer-core`/`@sparticuz/chromium`. Validação de que ele não passa
  em vácuo: exige `status 200`, `content-type` PDF, assinatura `%PDF-` e tamanho mínimo; o spec existente
  `admin-crm-simulacao` cobre os caminhos 404/400 da mesma rota (passaram).
- `npx eslint .`: zero erros e zero avisos.

### c. Páginas públicas com console limpo: OK

`seo.spec.ts` passou 20/20 em desktop e 20/20 em mobile (home, landings, blog, imóveis, artigo com "console limpo"),
junto com `landings`, `legal`, `robos-ia`, `instagram-dm`, `whatsapp-*` (todos verdes nos dois projetos).

## Observações

- Nenhuma flakiness de hidratação nem timeout de cold start nesta rodada.
- Rotas Meta (`/api/meta/webhook/`, `/api/meta/disparar/`) responderam 503 no preview, como esperado.
- Cobertura que continua faltando: o envio do PDF por e-mail (`enviar`) e `anexar` não são testáveis nesta política (escrevem/enviam).

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação ou formulário enviado.
- [x] Nenhuma Server Action de escrita disparada (fixture `acoesServidor`; o novo spec só dispara a leitura do modal e a ação `previa`, que não grava).

## Veredito

**APROVADO** — suíte completa verde (a única falha é uma corrida de harness no projeto mobile, que passa/pula na reexecução), imagens via sharp servidas em AVIF/WebP com 200 e a geração de PDF da simulação funciona com puppeteer-core 25.16 sobre o Chromium 153.
