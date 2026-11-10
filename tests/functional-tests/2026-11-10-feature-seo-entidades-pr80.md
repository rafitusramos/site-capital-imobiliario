# Relatório de testes funcionais

- **Branch:** `feature/seo-entidades` (PR #80)
- **Commit (SHA) testado:** `b33e758d2d4abf22c73473780b5dab0b14634307` (mais o spec novo deste relatório em `tests/e2e/seo.spec.ts`)
- **URL do deploy:** <https://site-capital-imobiliario-git-featu-472f4b-rafitusramos-projects.vercel.app>
- **Data/hora (America/Sao_Paulo):** 2026-11-10 08:56
- **Executor:** Sonnet 5.5 (subagente), skills `playwright-e2e` e `superpowers:test-driven-development`
- **Comando:** `E2E_BASE_URL=<url> npm run e2e`
- **Usuário de QA configurado:** sim (`.env.e2e.local` existe; specs de admin rodaram)

## Resumo

| Rodada | Passou | Falhou | Pulou |
| --- | ---: | ---: | ---: |
| 1 (suíte completa, 6 workers) | 144 | 4 | 5 |
| 2 (só `admin-crm-simulacao`, 1 worker) | 8 | 0 | 1 |
| 3 (suíte completa, repetição) | 150 | 0 | 3 |

Total de testes: 153 (rodada 1 e 3). O `seo.spec.ts` isolado: 37 passaram, 0 falharam (desktop + mobile).
`npx tsc --noEmit`: saída 0. `npx eslint .`: saída 0, sem erro nem aviso.

## Cobertura das mudanças do PR (novo bloco em `tests/e2e/seo.spec.ts`)

Somente GET de páginas e de `/images/logo-rt.png`; leem o JSON-LD servido (helper `lerJsonLd`).

- Home: `#negocio` com `logo` terminando em `/images/logo-rt.png`, `sameAs` contendo `https://www.google.com/maps?cid=1997059006678757798`, `hasMap` igual a ela, e nenhum JSON-LD com `share.google`.
- Home: `#rafael` com `url` terminando em `/sobre/`, `image`, `sameAs` não vazio e credencial CRECI com `identifier` `283020-F`.
- `/sobre/`: nó `ProfilePage` com `mainEntity["@id"]` terminando em `/#rafael`; exatamente um `Person` `#rafael` somando todos os JSON-LD; `BreadcrumbList` presente.
- `GET /images/logo-rt.png` no host do deploy: 200 e `image/png`.
- Para `/`, `/sobre/`, `/financiamento/`, `/home_equity/`, `/blog/`, `/imoveis/`: todo `<script type="application/ld+json">` faz `JSON.parse` sem erro (não havia teste equivalente em `seo.spec.ts`).

Evidências do HTML servido pelo deploy (curl):

```
"logo":"https://rtcapitalimobiliario.com.br/images/logo-rt.png"
"hasMap":"https://www.google.com/maps?cid=1997059006678757798"
"identifier":"283020-F"
/sobre/: "@type":"ProfilePage","url":"https://rtcapitalimobiliario.com.br/sobre/","mainEntity":{"@id":"https://rtcapitalimobiliario.com.br/#rafael"}
/images/logo-rt.png no deploy: HTTP 200 image/png
```

Observação de TDD: o deploy já continha a mudança, então os testes novos passaram de primeira (não foi possível ver o vermelho); protegem contra regressão, como nos relatórios anteriores.

## Falhas

Rodada 1 (6 workers): 4 falhas, todas em `admin-crm-simulacao.spec.ts` (desktop), mesmo ponto em `abrirModalLead` (linha 72):

```
Error: expect(locator).toBeVisible() failed
Locator: getByRole('dialog', { name: /^Lead / })
Expected: visible   Timeout: 5000ms   Error: element(s) not found
```

- modal de lead mostra o bloco Simulações e o botão Anexar simulação
- Anexar simulação abre o diálogo: foco preso, input só PDF...
- arquivo que não é simulação Creditas: mensagem de erro clara
- arquivo de texto com tipo diferente de PDF é recusado

Não relacionadas ao PR (CRM/simulação; o PR só toca JSON-LD). Clique em "Editar lead" não abriu o modal dentro de 5 s sob carga (provável hidratação lenta com 6 workers no deploy frio). Rodando o spec com `--workers=1`: 8 passaram, 0 falharam; e a suíte completa repetida: 0 falhas. Classificação: flakiness do teste/ambiente, não defeito do código do PR. Artefatos da rodada 1 em `tests/functional-tests/.artefatos/admin-crm-simulacao--*`.

## Pulos e motivos

Pulos condicionais de dados do banco de produção (variam entre rodadas):

| Teste | Projeto | Motivo |
| --- | --- | --- |
| admin-crm-simulacao: lead de home equity não tem 'Simulações' | desktop | Sem lead de home equity visível ao usuário de QA |
| admin-crm: contorno de lembrete atrasado | desktop | Nenhum lead com lembrete atrasado |
| admin-listas: /admin/posts/ publicar/despublicar abre diálogo | desktop | Pulo condicional de dados (rodada 3) |
| Rodada 1 também: Exportar CSV, botão Perdido, busca em /admin/imoveis/ | desktop | Pulos condicionais (provavelmente a mesma fragilidade de carga da rodada 1; passaram/pularam diferente na rodada 3) |

Specs de admin não foram pulados por falta de usuário de QA.

## Observações

- URLs dentro do JSON-LD usam o domínio de produção (`SITE_URL`), mesmo no preview; por isso o logo foi checado no host do deploy.
- Nenhum erro de console próprio nas páginas públicas (testes de `seo.spec.ts` passaram).
- Nenhuma alteração em código de produção.

## Confirmação da política de segurança

- [x] Nenhuma exclusão confirmada, lead movido, publicação/despublicação ou formulário enviado.
- [x] Os testes novos só fazem GET; nenhuma Server Action disparada pelos testes novos.

## Veredito

**APROVADO** — o JSON-LD servido confere com o PR (logo PNG existente, Maps por cid sem `share.google`, `#rafael` completo, ProfilePage apontando para `#rafael` sem Person duplicado); suíte final 150 passou / 0 falhou / 3 pulou, tsc e eslint limpos. As 4 falhas da rodada 1 foram flakiness do admin sob carga, sem relação com o PR, e não se repetiram.

---

# Reteste: commit `7fd8a26` (mesmo deploy de preview)

- **Data/hora (America/Sao_Paulo):** 2026-11-10
- **Mudança:** `#rafael.sameAs` ganha o LinkedIn; `#negocio.openingHoursSpecification` 24h nos 7 dias.
- **Testes cobrindo os dois campos** (`tests/e2e/seo.spec.ts`, bloco "JSON-LD: entidades"): "home: #rafael inclui o LinkedIn no sameAs" e "home: #negocio declara atendimento 24h nos 7 dias" (7 dias distintos, `opens` 00:00, `closes` 23:59, `@type` OpeningHoursSpecification).

## Evidência no HTML servido (curl no deploy)

```
"openingHoursSpecification":{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],"opens":"00:00","closes":"23:59"}
sameAs de #rafael contém https://www.linkedin.com/in/rafael-teixeira-capital-imobiliario/
```

## Números

| Execução | Passou | Falhou | Pulou |
| --- | ---: | ---: | ---: |
| `seo.spec.ts` isolado (desktop + mobile) | 41 | 0 | 0 |
| Suíte completa (6 workers) | 153 | 2 | 2 |
| Repetição das duas falhas (`admin-crm-simulacao` + `admin-crm`, 1 worker) | 18 | 0 | 2 |

`npx tsc --noEmit`: saída 0. `npx eslint .`: saída 0, sem erro nem aviso.

## Falhas da suíte completa (flakiness do admin sob carga, não relacionada ao PR)

- `admin-crm-simulacao.spec.ts:222` (arquivo que não é simulação Creditas): `page.waitForLoadState: Test timeout of 30000ms exceeded`.
- `admin-crm.spec.ts:194` (colunas 'Dados do lead' e 'Origem'): `getByRole('dialog', { name: /^Lead / })` não encontrado em 5000ms.

Ambas passaram ao rodar com 1 worker. Mesma assinatura das falhas da rodada 1 acima (modal do CRM sob carga com 6 workers).

## Pulos

Condicionais a dados de produção: lead de home equity (Simulações) e contorno de lembrete atrasado.

## Política de segurança

- [x] Só GET; nenhuma ação destrutiva, lead movido, publicação ou formulário enviado.

## Veredito do reteste

**APROVADO** — os dois campos novos estão no HTML servido e cobertos por teste; as 2 falhas são flakiness de modal do CRM sob 6 workers e passaram na repetição.
