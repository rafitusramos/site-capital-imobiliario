# WhatsApp — Fase 1 (base + avisos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Todo lead novo do site que aceitou o WhatsApp recebe confirmação pelo número novo; avisos de
etapa (`notifica_lead`) saem também pelo WhatsApp; qualquer resposta do cliente recebe texto fixo com
o link do número oficial do dono, entra na timeline do lead e vira e-mail ao dono.

**Architecture:** Módulo `lib/whatsapp/` espelhando `lib/instagram/` (puros + I/O injetado). O
webhook `/api/meta/webhook/` despacha por `object`; o disparador `/api/meta/disparar/` (pg_cron a cada
minuto, já existente) também esvazia a fila `wa_envios`. Envio pela Cloud API com token de usuário do
sistema em variável de ambiente (sem OAuth). Nenhuma IA nesta fase.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (Postgres, RLS, pg_cron/pg_net), zod 4,
Vitest, Playwright, WhatsApp Cloud API (Graph `v27.0`, mesma constante de `lib/instagram/graph.ts`).

**Spec:** `docs/superpowers/specs/2026-11-13-whatsapp-atendimento-design.md` (§8 fase 1; §5, §6.5,
§6.7, §7.6, §7.8, §7.11).

## Global Constraints

- Migration nova: `supabase/migrations/038_whatsapp_base.sql`, **sem `begin;`/`commit;`**.
- Toda tabela nova: RLS ligada, `revoke all ... from anon` **e** `from authenticated`, grants mínimos,
  policies `to authenticated` com `public.eh_admin()`. Função: `revoke execute ... from public, anon,
  authenticated`. Segredos nunca no `.sql`.
- Variáveis novas, só servidor, só Production: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
  `WHATSAPP_WABA_ID`; opcional `WHATSAPP_APP_SECRET` (se o número estiver noutro app da Meta).
  Faltando qualquer obrigatória, o WhatsApp é no-op (nunca 500, nunca lança).
- Nada aqui pode derrubar captação de lead, movimento de etapa ou o módulo do Instagram: todo ponto
  de entrada engole e registra (`console.error` antes de converter exceção).
- Mensagem iniciada por nós só para lead com `leads.consentimento_whatsapp_em` preenchido.
- Texto ao cliente nunca promete aprovação de crédito; templates são de **utilidade**, sem tom
  promocional.
- Espaçamento mínimo de **6 s** entre envios ao mesmo destinatário (erro 131056).
- Aviso de etapa agendado **+10 min** (`ATRASO_EMAIL_LEAD_MS`) e cancelado por movimento posterior.
- Resposta fixa ao cliente: no máximo **1 a cada 12 h** por contato.
- Novo `TEXTO_CONSENTIMENTO` (exato): `"Autorizo o uso dos meus dados para a pré-qualificação de
  crédito e o encaminhamento às instituições financeiras parceiras, e aceito receber o atendimento da
  RT Capital Imobiliário pelo WhatsApp."`
- Vitest roda de `C:\` maiúsculo (PowerShell). `npm test`, `npx eslint .` (zero erro, zero aviso) e
  `npx tsc --noEmit` verdes ao fim de cada tarefa.

## Review Focus

1. **Telefone do formulário em formato livre** ("(19) 99999-1234", com/sem 55, com/sem o 9º dígito):
   o envio usa o `wa_id` certo, e a resposta do cliente (cujo `wa_id` pode vir **sem** o 9º dígito)
   casa com o lead. → testes em Task 2.
2. **Webhook reentregue / status fora de ordem** (`delivered` depois de `read`, `failed` depois de
   `sent`): nada duplica, status nunca regride. → testes em Task 3 e Task 6.
3. **Cliente responde várias vezes seguidas**: uma resposta fixa por 12 h, mas todas as mensagens
   entram na timeline e no e-mail ao dono. → teste em Task 6.
4. **Dono move o lead duas vezes em 10 min** (inclusive "desfazer"): só o último aviso sai; mover para
   etapa sem `notifica_lead` ou sem template cancela o anterior e não agenda nada. → teste em Task 6.
5. **Lead antigo (sem `consentimento_whatsapp_em`) muda de etapa ou responde**: nunca recebe template;
   se ele escrever, a resposta fixa sai (janela aberta por ele). → teste em Task 6.

---

### Task 1: Migration 038 (tabelas, RLS, fila, limpezas, consentimento)

**Files:**
- Create: `supabase/migrations/038_whatsapp_base.sql`
- Test: `tests/unidade/whatsapp-migration.test.ts` (padrão de `tests/unidade/instagram-migration.test.ts`: lê o `.sql` como texto)
- Modify: `types/database.ts` (tipos das tabelas/colunas novas, à mão como nas migrations anteriores)

**Interfaces:**
- Produces (SQL):
  - `leads.consentimento_whatsapp_em timestamptz null`.
  - `wa_config` singleton (`id smallint pk default 1 check (id = 1)`, `numero_oficial text`, `atualizado_em timestamptz`, `ultimo_evento_em timestamptz`). Seed da linha 1. `authenticated`: select + `update (numero_oficial)` com policy `eh_admin()`.
  - `wa_contatos` (`id uuid pk`, `wa_id text not null unique`, `nome_perfil text`, `lead_id uuid references leads(id) on delete cascade`, `ultima_entrada_em timestamptz` = última mensagem do cliente (janela 24 h), `resposta_fixa_em timestamptz`, `ultima_interacao_em timestamptz not null default now()`, `criado_em`).
  - `wa_mensagens` (`id`, `contato_id fk cascade`, `direcao in ('entrada','saida')`, `tipo in ('texto','template','botao','outro')`, `texto text`, `template text`, `meta_id text unique`, `status in ('enviado','entregue','lido','falhou') null`, `erro text`, `criado_em`).
  - `wa_envios` (fila; mesmas colunas de `ig_envios` adaptadas: `chave unique`, `contato_id fk cascade`, `lead_id uuid references leads(id) on delete cascade null`, `motivo in ('confirmacao','etapa','resposta_fixa')`, `etapa text`, `payload jsonb not null`, `enviar_apos`, `estado in ('pendente','processando','enviado','falhou','cancelado')`, `tentativas`, `erro`, `meta_id`, `reservado_em`, `enviado_em`, `criado_em`).
  - `wa_eventos` (`chave text pk`, `payload jsonb`, `recebido_em`, `processado_em`, `erro`, `tentativas`) — sem policy (só service role).
  - `wa_reservar_envios(p_limite int) returns setof wa_envios` — `security definer`, só `service_role`. Mesma lógica de `ig_reservar_envios` **mais**: no máximo uma linha por `contato_id` por chamada, e só de contato sem envio `enviado` nos últimos 6 s. (FOR UPDATE não convive com DISTINCT: escolher candidatos numa CTE com `distinct on (contato_id)` e travar com `for update skip locked` no select externo por `id`.)
  - `wa_apagar_inativos()` (contato **sem lead** e sem interação há 12 meses) e `wa_limpar_eventos()` (> 30 dias), jobs pg_cron `wa-apagar-inativos` `'45 6 * * *'` e `wa-limpar-eventos` `'50 6 * * *'` (reagendamento idempotente, como na 036).
  - `crm_emails_tipo_check` recriada com `'whatsapp-admin'` acrescentado à lista vigente da 030.
- Leitura pelo painel: `wa_contatos`, `wa_mensagens`, `wa_envios` com `select` para `authenticated` + policy `eh_admin()`.

- [ ] **Step 1: Write the failing test** — `tests/unidade/whatsapp-migration.test.ts`:
  - `"não tem begin/commit"`: `expect(sql).not.toMatch(/^\s*(begin|commit)\s*;/im)`.
  - `"toda tabela wa_ tem RLS e revoke de anon e authenticated"`: para cada `wa_config|wa_contatos|wa_mensagens|wa_envios|wa_eventos`, o SQL contém `alter table public.<t> enable row level security`, `revoke all on table public.<t> from anon` e `... from authenticated`.
  - `"toda policy é to authenticated com eh_admin"`: cada `create policy` casa `/to authenticated .*eh_admin\(\)/s`.
  - `"funções sem execute para public"`: `revoke execute on function public.wa_reservar_envios(int) from public, anon, authenticated`.
  - `"reserva respeita 6 s por contato"`: SQL de `wa_reservar_envios` contém `distinct on (contato_id)` e `interval '6 seconds'`.
  - `"consentimento_whatsapp_em em leads"` e `"crm_emails aceita whatsapp-admin"` (e ainda `'simulacao'`).
- [ ] **Step 2: Run** `npx vitest run tests/unidade/whatsapp-migration.test.ts` — Expected: FAIL (arquivo não existe).
- [ ] **Step 3: Write the migration** com cabeçalho POR QUE / REGRAS / COMO VERIFICAR / COMO DESFAZER no estilo da 035; atualizar `types/database.ts`.
- [ ] **Step 4: Run** o teste + `npx vitest run tests/unidade/crm-sem-acesso-anonimo.test.ts` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(whatsapp): migration 038 com tabelas, fila e consentimento`.

### Task 2: Telefone ↔ `wa_id` (puro)

**Files:** Create `lib/whatsapp/telefone.ts`; Test `tests/unidade/whatsapp-telefone.test.ts`

**Interfaces — Produces:**
- `waIdDoTelefone(telefone: string): string | null` — só dígitos; acrescenta `55` se vier com 10 ou 11 dígitos; válido = `55` + DDD (2) + 8 ou 9 dígitos; senão `null`.
- `variantesDoWaId(waId: string): string[]` — para número brasileiro móvel: a forma com e a sem o 9º dígito (ex.: `5519999991234` ↔ `551999991234`); fora do Brasil, `[waId]`.

- [ ] **Step 1: Tests:** `waIdDoTelefone("(19) 99999-1234") === "5519999991234"`; `("+55 19 99999-1234")` igual; `("19 3333-4444") === "551933334444"`; `("123") === null`; `("")=== null`; `variantesDoWaId("551999991234")` contém `"5519999991234"`; `variantesDoWaId("5519999991234")` contém `"551999991234"`; fixo `"551933334444"` não ganha variante com 9.
- [ ] **Step 2: Run** `npx vitest run tests/unidade/whatsapp-telefone.test.ts` — FAIL.
- [ ] **Step 3: Implement.** Variante só para 8 dígitos começando em 6–9 (móvel antigo) ou 9 dígitos começando em 9.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(whatsapp): normaliza telefone para wa_id`.

### Task 3: Leitura do webhook do WhatsApp (puro)

**Files:** Create `lib/whatsapp/eventos.ts`; Test `tests/unidade/whatsapp-eventos.test.ts` (+ fixtures em `tests/apoio/whatsapp-webhooks.ts`, no estilo de `tests/apoio/instagram-webhooks.ts`)

**Interfaces — Produces:**
```ts
export type StatusWa = "enviado" | "entregue" | "lido" | "falhou";
export type EventoWa =
  | { tipo: "mensagem"; chave: string /* m:<id> */; waId: string; nomePerfil: string | null;
      metaId: string; conteudo: "texto" | "botao" | "outro"; texto: string | null; em: string /* ISO */ }
  | { tipo: "status"; chave: string /* s:<id>:<status> */; metaId: string; status: StatusWa;
      erro: { codigo: number; mensagem: string } | null };
export function lerEventosWa(corpo: unknown): EventoWa[];
```
- Só `object === "whatsapp_business_account"`, `entry[].changes[]` com `field === "messages"`; `value.messages[]` e `value.statuses[]`. `sent|delivered|read|failed` → `enviado|entregue|lido|falhou`. `text.body` → texto; `interactive.button_reply.title` / `button.text` → `botao` com o título como texto; demais tipos (`audio`, `image`, `sticker`, `location`…) → `outro` com `texto: null`. `nomePerfil` de `value.contacts[]` casando `wa_id`. `em` de `timestamp` (segundos Unix). Nunca lança.

- [ ] **Step 1: Tests:** texto simples gera 1 evento com `chave "m:wamid.X"`; corpo `object: "instagram"` → `[]`; status `failed` com `errors[0].code 131047` → `erro.codigo 131047`; áudio → `conteudo "outro"`; botão de template → `conteudo "botao"`; lote com 2 mensagens + 1 status → 3 eventos; lixo (`null`, `"x"`, `{entry: 3}`) → `[]`.
- [ ] **Step 2: Run** `npx vitest run tests/unidade/whatsapp-eventos.test.ts` — FAIL.
- [ ] **Step 3: Implement** com zod (`safeParse`, ignora item inválido), como `lib/instagram/eventos.ts`.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(whatsapp): leitor de eventos do webhook`.

### Task 4: Templates, textos fixos e erros (puros)

**Files:** Create `lib/whatsapp/templates.ts`, `lib/whatsapp/mensagens.ts`, `lib/whatsapp/erros.ts`; Test `tests/unidade/whatsapp-templates.test.ts`, `tests/unidade/whatsapp-erros.test.ts`; Create `docs/whatsapp-templates.md` (gerado à mão a partir do registro: nome, categoria, idioma, corpo com `{{n}}`, para o dono cadastrar no WhatsApp Manager)

**Interfaces — Produces:**
- `export interface TemplateWa { nome: string; idioma: "pt_BR"; corpo: string /* com {{1}}… */; parametros: number }`
- `export const TEMPLATES: Record<string, TemplateWa>` com: `rt_confirmacao_credito`, `rt_confirmacao_imovel` (params: primeiro nome, protocolo) e um por (tipo, etapa) que tenha texto em `lib/email/templates/etapa-lead.ts` (ex.: `rt_etapa_credito_simulacao`, `rt_etapa_credito_pre_aprovacao`, `rt_etapa_credito_vistoria`, `rt_etapa_credito_contrato`, `rt_etapa_imovel_qualificacao`, `rt_etapa_imovel_visita`, `rt_etapa_imovel_proposta`, `rt_etapa_ganho`, e os de consórcio) — corpo derivado do texto do e-mail da mesma etapa, params: primeiro nome, protocolo.
- `templateDeConfirmacao(tipo: LeadTipoSlug): TemplateWa` e `templateDaEtapa(tipo: LeadTipoSlug, etapa: LeadEtapaSlug): TemplateWa | null` (null = etapa sem texto → só e-mail).
- `payloadDeTemplate(t: TemplateWa, params: string[]): Record<string, unknown>` — corpo `{ type: "template", template: { name, language: { code }, components: [{ type: "body", parameters: [{ type: "text", text }] }] } }`; lança `Error` se `params.length !== t.parametros` (erro de programação, nunca em produção — o teste trava).
- `mensagens.ts`: `linkDoNumeroOficial(numero: string): string | null` (`https://wa.me/<digitos>`, via `waIdDoTelefone`; null se inválido) e `respostaFixa(linkOficial: string | null): string` — texto: `"Oi! Este número envia só avisos automáticos do seu atendimento. Para falar com o Rafael Teixeira, chame aqui: <link>"`; sem link: `"... Para falar com o Rafael Teixeira, responda ao nosso e-mail ou aguarde o contato dele."`.
- `erros.ts`: `ehTemporarioWa(e: ErroGraph): boolean` (reaproveita `ehTemporario` de `lib/instagram/fila.ts` **e** códigos `131056`, `130429`, `131048`, `131000`) e `motivoLegivelWa(e: ErroGraph): string` (`131047` → `"Janela de 24 h fechada"`; `131026` → `"Número não recebe WhatsApp"`; `132000`–`132999` → `"Problema no template (código N)"`; resto → `"A Meta recusou o envio (código N)"`).

- [ ] **Step 1: Tests:** todo template tem `{{1}}`…`{{n}}` contíguos e `parametros === n`; nenhum corpo casa `/aprova(d|ç)/i` sem estar precedido de "análise" nem contém `%`, `taxa`, `parcela`, `promo`, `desconto`, `!!`; `templateDaEtapa("financiamento","criado") === null`; `templateDaEtapa("imoveis","visita")?.nome === "rt_etapa_imovel_visita"`; toda etapa com texto em `etapaLead` tem template (itera pipelines de `lib/crm/etapas.ts`); `payloadDeTemplate` monta a forma acima; `respostaFixa("https://wa.me/5519...")` contém o link; `ehTemporarioWa({status:400,codigo:131056,mensagem:""}) === true`; `motivoLegivelWa({status:400,codigo:131047,mensagem:""}) === "Janela de 24 h fechada"`.
- [ ] **Step 2: Run** `npx vitest run tests/unidade/whatsapp-templates.test.ts tests/unidade/whatsapp-erros.test.ts` — FAIL.
- [ ] **Step 3: Implement** os três módulos e `docs/whatsapp-templates.md`.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(whatsapp): templates de utilidade, resposta fixa e erros`.

### Task 5: Configuração e cliente da Cloud API (I/O com `fetch` injetado)

**Files:** Create `lib/whatsapp/config.ts`, `lib/whatsapp/cloud.ts`; Test `tests/unidade/whatsapp-cloud.test.ts`

**Interfaces — Produces:**
- `configWhatsApp(): { token: string; phoneNumberId: string; wabaId: string; segredos: string[] } | null` — `segredos` = `[META_APP_SECRET, WHATSAPP_APP_SECRET]` sem vazios; `null` se faltar token, phoneNumberId, wabaId ou nenhum segredo. Lida na chamada (`server-only`).
- `type ResultadoCloud = { ok: true; metaId: string } | ({ ok: false } & ErroGraph)`
- `criarCloud(token: string, phoneNumberId: string, f?: typeof fetch): CloudWa` com
  `enviar(waId: string, corpo: Record<string, unknown>): Promise<ResultadoCloud>` (POST `${GRAPH_BASE}/${GRAPH_VERSAO}/${phoneNumberId}/messages`, `{ messaging_product: "whatsapp", recipient_type: "individual", to: waId, ...corpo }`, `Authorization: Bearer`; lê `messages[0].id`; erro → `{status, codigo: error.code, subcodigo: error.error_subcode, mensagem}`; exceção de rede → `status: 0`. Nunca lança),
  `texto(waId: string, texto: string)` (atalho `{ type: "text", text: { body, preview_url: true } }`),
  `infoDoNumero(): Promise<{ numero: string; nomeExibicao: string; qualidade: string } | null>` (GET `?fields=display_phone_number,verified_name,quality_rating`),
  `assinarWebhooks(wabaId: string): Promise<boolean>` (POST `/${wabaId}/subscribed_apps`).

- [ ] **Step 1: Tests** com `fetch` falso: envio OK devolve `metaId`; corpo enviado tem `to` e `messaging_product`; resposta `{error:{code:131047}}` status 400 → `ok:false, codigo:131047`; `fetch` que rejeita → `status 0`; `configWhatsApp()` null sem `WHATSAPP_TOKEN` (usar `vi.stubEnv`).
- [ ] **Step 2: Run** `npx vitest run tests/unidade/whatsapp-cloud.test.ts` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(whatsapp): cliente da Cloud API`.

### Task 6: Motor (regras) + repositório Supabase

**Files:** Create `lib/whatsapp/motor.ts`, `lib/whatsapp/repositorio.ts`, `lib/whatsapp/motor-padrao.ts`, `lib/email/templates/whatsapp-admin.ts`; Test `tests/unidade/whatsapp-motor.test.ts` (repo e cloud falsos em `tests/apoio/whatsapp-falsos.ts`), `tests/unidade/whatsapp-email-admin.test.ts`

**Interfaces:**
- Consumes: Tasks 2–5.
- Produces:
```ts
export interface LeadWa { id: string; tipo: LeadTipoSlug; nome: string; telefone: string;
  protocolo: string; consentimentoWhatsappEm: string | null }
export interface RepositorioWa { /* o construtor define; inclui: */
  contatoPorWaId(variantes: string[]): Promise<ContatoWa | null>;
  garantirContato(waId: string, dados: { leadId?: string | null; nomePerfil?: string | null }): Promise<ContatoWa>;
  leadPorWaId(variantes: string[]): Promise<LeadWa | null>; // mais recente, não arquivado
  registrarEventos(linhas: { chave: string; payload: unknown }[]): Promise<string[]>; // devolve só as chaves novas
  enfileirar(e: NovoEnvioWa): Promise<void>;          // ignora chave repetida
  cancelarPendentes(leadId: string, motivo: "etapa"): Promise<void>;
  reservar(limite: number): Promise<EnvioWa[]>;       // rpc wa_reservar_envios
  concluir(id: string, c: ConclusaoEnvioWa): Promise<void>;
  registrarMensagem(m: NovaMensagemWa): Promise<void>; // ignora meta_id repetido
  atualizarStatus(metaId: string, status: StatusWa, erro: string | null): Promise<void>; // nunca regride
  registrarInteracaoNoLead(leadId: string, texto: string): Promise<void>; // lead_interacoes tipo 'whatsapp', automática
  marcarRespostaFixa(contatoId: string, em: Date): Promise<void>;
  numeroOficial(): Promise<string | null>;
  tocarUltimoEvento(): Promise<void>;
}
export interface MotorWa {
  agendarConfirmacao(lead: LeadWa): Promise<void>;
  agendarAvisoEtapa(lead: LeadWa, etapa: LeadEtapaSlug): Promise<void>;
  cancelarAvisosEtapa(leadId: string): Promise<void>;
  processarEvento(e: EventoWa): Promise<void>;
  dispararFila(limite: number): Promise<{ enviados: number; falhas: number }>;
}
export function criarMotorWa(dep: { repo: RepositorioWa; cloud: CloudWa;
  avisarDono: (a: AvisoDonoWa) => Promise<void>; agora: () => Date }): MotorWa;
```
- Regras:
  - `agendarConfirmacao`: sem `consentimentoWhatsappEm` ou `waIdDoTelefone` nulo → nada. Senão enfileira `motivo "confirmacao"`, chave `conf:<leadId>`, `enviar_apos = agora`, payload de `templateDeConfirmacao`.
  - `agendarAvisoEtapa`: sempre `cancelarPendentes(lead.id, "etapa")` primeiro; depois, sem consentimento / sem template → para. Senão chave `etapa:<leadId>:<etapa>:<agora ms>`, `enviar_apos = agora + ATRASO_EMAIL_LEAD_MS`.
  - `processarEvento(mensagem)`: `garantirContato` (liga ao lead de `leadPorWaId`), `registrarMensagem(entrada)`, atualiza `ultima_entrada_em`; se há lead → `registrarInteracaoNoLead` com `"Mensagem no WhatsApp: <texto ou [áudio/imagem/outro]>"`; sempre `avisarDono` (nome, telefone, protocolo se houver, texto); se `resposta_fixa_em` nulo ou anterior a `agora - 12 h` → enfileira resposta fixa (chave `fixa:<metaId>`, texto livre — a janela está aberta) e `marcarRespostaFixa`.
  - `processarEvento(status)`: `atualizarStatus`; `falhou` com erro → texto `motivoLegivelWa`.
  - `dispararFila`: `reservar`; para cada envio `cloud.enviar`; ok → `concluir enviado` + `registrarMensagem(saida, meta_id)`; erro temporário com `proximaTentativa` → volta a `pendente`; definitivo ou esgotado → `falhou` com `motivoLegivelWa`. Nunca lança (try/catch por envio, `console.error`).
- `whatsapp-admin.ts`: `whatsappAdmin({ nome, telefone, protocolo, texto }): EmailPronto` — assunto `"WhatsApp: <nome> respondeu"`; todo dado do visitante por `escaparHtml`.
- `motor-padrao.ts`: `motorWaPadrao(): MotorWa | null` (null sem `configWhatsApp()`); `avisarDono` envia `whatsappAdmin` para `EMAIL_ADMIN` e registra em `crm_emails` com `tipo "whatsapp-admin"` (reaproveitar `emailerDoAmbiente` e o padrão de registro de `lib/email/notificar.ts`).

- [ ] **Step 1: Tests** (`whatsapp-motor.test.ts`, todos com repo/cloud falsos e `agora` fixo):
  - `"confirmação só com consentimento"`; `"confirmação usa wa_id normalizado"`.
  - `"aviso de etapa agenda +10 min e cancela o anterior"`: dois `agendarAvisoEtapa` → `cancelarPendentes` chamado 2× e 2 enfileirados com `enviar_apos` = agora+600000.
  - `"etapa sem template só cancela"`.
  - `"lead antigo nunca recebe template, mas recebe resposta fixa quando escreve"`.
  - `"resposta fixa no máximo 1 a cada 12 h"`: 3 mensagens em 1 h → 1 resposta fixa, 3 interações, 3 avisos ao dono.
  - `"mensagem de wa_id sem o 9º dígito casa com lead cadastrado com 9"`.
  - `"desconhecido: resposta fixa e aviso ao dono, sem interação"`.
  - `"status não regride"`: `lido` depois `entregue` → repo recebe os dois, mas o falso implementa a regra e o teste confere estado final `lido` (a regra real vive no repositório: `update ... where status is distinct from` ordem; ver Step 3).
  - `"erro temporário volta para pendente; 131047 vira falhou com motivo"`.
  - `"exceção do cloud não escapa de dispararFila"`.
  - `whatsapp-email-admin.test.ts`: escapa `<script>` no texto; assunto com o nome.
- [ ] **Step 2: Run** `npx vitest run tests/unidade/whatsapp-motor.test.ts tests/unidade/whatsapp-email-admin.test.ts` — FAIL.
- [ ] **Step 3: Implement** motor, template de e-mail, repositório (service role via `createAdminClient`; `atualizarStatus` só sobe na ordem `enviado < entregue < lido`, `falhou` sempre grava; `UPDATE` conferido com `.select()`) e `motor-padrao`.
- [ ] **Step 4: Run** — PASS; `npx tsc --noEmit` limpo.
- [ ] **Step 5: Commit** `feat(whatsapp): motor de avisos, respostas e fila`.

### Task 7: Ligações no site (webhook, disparador, lead, movimento)

**Files:**
- Modify: `app/api/meta/webhook/route.ts`, `app/api/meta/disparar/route.ts`, `app/actions/leads.ts`, `app/actions/admin-crm.ts` (`moverLead`)
- Create: `lib/whatsapp/notificar.ts`
- Test: `tests/unidade/whatsapp-rotas.test.ts` (padrão de `tests/unidade/instagram-rotas.test.ts`), `tests/acoes/leads-whatsapp.test.ts`

**Interfaces:**
- Produces: `dispararWhatsAppNovoLead(leadId: string): Promise<void>` e `dispararWhatsAppMudancaEtapa(leadId: string, para: LeadEtapaSlug, suprimir: boolean): Promise<void>` — leem o lead pela service role (para ter `consentimento_whatsapp_em`), consultam `crm_etapas.notifica_lead` (falso → só `cancelarAvisosEtapa`), nunca lançam.
- Webhook: depois de validar o corpo, se `object === "whatsapp_business_account"`: assinatura válida contra **qualquer** de `configWhatsApp().segredos`; `lerEventosWa`; `registrarEventos` (chaves prefixadas `wa:`), `tocarUltimoEvento`, 200, processa novos em `after()`. Sem `configWhatsApp()` → 200 e ignora (o Instagram segue igual). Caminho do Instagram **inalterado**.
- Disparar: depois do motor do Instagram, `motorWaPadrao()?.dispararFila(20)`; falha de um não impede o outro; resposta inclui `{ instagram: {...}, whatsapp: {...} }`.
- `leads.ts`: após o RPC, `update leads set consentimento_whatsapp_em = now()` (service role, conferido com `.select()`; falha = `console.error`, lead segue sem WhatsApp) e `after(() => dispararWhatsAppNovoLead(lead.id))`.
- `moverLead`: no mesmo bloco dos e-mails, `after(() => dispararWhatsAppMudancaEtapa(lead.id, para, simulacaoTemSubstitutoDoAviso))` — `suprimir` cancela pendentes e não agenda.

- [ ] **Step 1: Tests:** rota — POST `whatsapp_business_account` com assinatura do `WHATSAPP_APP_SECRET` → 200 e motor chamado; assinatura inválida → 401; sem variáveis do WhatsApp → 200 sem processar; corpo do Instagram continua chamando o motor do Instagram; disparar chama os dois motores e um que lança não derruba o outro. Ação — `criarLead` grava `consentimento_whatsapp_em` e agenda o WhatsApp; falha do update não muda `{ sucesso: true }`.
- [ ] **Step 2: Run** `npx vitest run tests/unidade/whatsapp-rotas.test.ts tests/acoes/leads-whatsapp.test.ts tests/unidade/instagram-rotas.test.ts` — novos FAIL, Instagram PASS.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** os três + `npm test` completo — PASS (contagem anterior + novos; o *expected fail* continua 1).
- [ ] **Step 5: Commit** `feat(whatsapp): liga webhook, disparador, criação e movimento de lead`.

### Task 8: Consentimento e política de privacidade

**Files:** Modify `lib/legal.ts` (`TEXTO_CONSENTIMENTO`, `POLITICA_ATUALIZADA_EM` para a data do merge), `app/(site)/politica-de-privacidade/page.tsx` (seção nova "Conversas no WhatsApp" + item no índice, depois de "Conversas no Instagram"); Test `tests/unidade/legal-whatsapp.test.ts`

- Seção (texto final redigido pelo construtor, **aprovado pelo dono no PR**): o que é guardado (número, nome do perfil, mensagens trocadas com o número de atendimento, status de entrega), para quê (confirmar o pedido, avisar o andamento, encaminhar ao atendimento), retenção (conversas acompanham o lead; contato sem lead e sem interação há 12 meses é apagado), como pedir exclusão (mesmo canal do `EMAIL_LGPD`). **Sem** mencionar IA nesta fase.

- [ ] **Step 1: Test:** `TEXTO_CONSENTIMENTO` igual à string exata das Global Constraints; a página importa e renderiza `TEXTO_CONSENTIMENTO` (já é assim) e tem `id: "conversas-no-whatsapp"` no índice.
- [ ] **Step 2: Run** `npx vitest run tests/unidade/legal-whatsapp.test.ts` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** + `npm test` — PASS.
- [ ] **Step 5: Commit** `feat(whatsapp): consentimento e política de privacidade`.

### Task 9: Página de configuração `/admin/whatsapp/`

**Files:** Create `app/admin/(protected)/whatsapp/layout.tsx` (`garantirAdminOuRedirecionar()`), `app/admin/(protected)/whatsapp/page.tsx`, `app/actions/admin-whatsapp.ts`, `lib/queries/admin-whatsapp.ts`; Modify `components/admin/SidebarAdmin.tsx` (item "WhatsApp" depois de "Instagram", ícone novo em `components/admin/crm/icones.tsx` se não houver); Test `tests/acoes/admin-whatsapp.test.ts`, `tests/e2e/whatsapp-config.spec.ts` (só leitura)

- Carregar `frontend-design` e `ui-ux-pro-max` antes de desenhar; visual do `/admin/instagram/conexao/`.
- Mostra: configurado ou não (variáveis presentes), número e nome de exibição e qualidade (`infoDoNumero`, falha → "não foi possível consultar"), último evento recebido (`wa_config.ultimo_evento_em`), últimos 20 envios (destino mascarado, motivo, estado, erro legível); campo **Número oficial** (salvar); botão **Assinar webhooks** (`assinarWebhooks(wabaId)`).
- `salvarNumeroOficial(numero: string)`: `exigirAdmin()`; valida com `waIdDoTelefone` (inválido → erro amigável); grava formatado em dígitos; confere `.select()`.
- `assinarWebhooksWhatsApp()`: `exigirAdmin()`; sem config → erro amigável.

- [ ] **Step 1: Tests:** ação recusa não-admin; recusa número inválido; grava número válido normalizado; e2e — `/admin/whatsapp/` carrega para o usuário de QA e mostra o título "WhatsApp" (pulado sem `.env.e2e.local`), sem clicar em salvar nem assinar.
- [ ] **Step 2: Run** `npx vitest run tests/acoes/admin-whatsapp.test.ts` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** + `npm test`, `npx eslint .`, `npx tsc --noEmit` — PASS / limpo.
- [ ] **Step 5: Commit** `feat(whatsapp): página de configuração no admin`.

### Task 10: Documentação do projeto

**Files:** Modify `CLAUDE.md` (seção "### WhatsApp" depois de "Instagram comentário → DM": módulo, tabelas da 038, regras de consentimento, 6 s, 12 h, +10 min, trava por variáveis; trocar "a última é a **037**" por **038**; atualizar a contagem de testes; **substituir** a regra "não mude `TEXTO_CONSENTIMENTO` antes da CAPI" por: o texto mudou em 2026-11 por decisão do dono para cobrir o WhatsApp; nova mudança grava nova coluna/versão de aceite; a CAPI ainda exige revisão do texto), `.env.local.example` (as 4 variáveis, comentadas), `docs/whatsapp-templates.md` (conferir que bate com `TEMPLATES`).

- [ ] **Step 1:** Editar os três arquivos.
- [ ] **Step 2:** `npm test` e `npx eslint .` — PASS.
- [ ] **Step 3: Commit** `docs(whatsapp): CLAUDE.md, variáveis e templates`.

---

## Fora do código (dono, antes de testar em produção)
Linha/chip novo; adicionar e verificar no WhatsApp Manager (SMS ou ligação); nome de exibição;
verificação do portfólio (CNPJ); gerar token permanente de usuário do sistema com
`whatsapp_business_messaging` e `whatsapp_business_management`; cadastrar os templates de
`docs/whatsapp-templates.md` (categoria Utilidade) e esperar aprovação; configurar o webhook do app
(campo `messages`) para `https://rtcapitalimobiliario.com.br/api/meta/webhook/`; variáveis na Vercel
(Production); "Assinar webhooks" e "Número oficial" em `/admin/whatsapp/`.
