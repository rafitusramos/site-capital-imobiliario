# Instagram comentário → DM — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o ManyChat por um módulo no `/admin` que responde comentários do @rt.capitalimobiliario com uma sequência de DMs (botão → seguir? → link → lembrete) e mostra, numa caixa de entrada só de leitura, a situação de cada pessoa.

**Architecture:** Webhook público da Meta grava o evento bruto, responde 200 e processa em `after()`. A lógica de decisão é pura (`lib/instagram/fluxo.ts`) e o motor (`motor.ts`) só a orquestra sobre duas interfaces injetáveis: repositório (Supabase, service role) e cliente da Graph API. Todo envio passa por uma fila no banco; o disparador é chamado logo após cada evento e, a cada minuto, por `pg_cron` + `pg_net`.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (Postgres, RLS, pg_cron, pg_net, Vault), zod 4, Vitest, Tailwind (admin).

**Spec:** `docs/superpowers/specs/2026-11-11-instagram-comentario-dm-design.md` — leia antes de qualquer tarefa; os § citados abaixo são de lá.

## Global Constraints

- Branch única `feature/instagram-dm`. Nada vai para `Preview` sem comando do dono.
- Commits: o git desta máquina não tem identidade; use `git -c user.name="rafitusramos" -c user.email="38569382+rafitusramos@users.noreply.github.com" commit ...` e termine a mensagem com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Migrations `034_...` e `035_...`, **sem `begin;`/`commit;`**, cabeçalho no padrão da 023 (POR QUE / REGRAS / COMO VERIFICAR / COMO DESFAZER).
- Toda tabela nova: `enable row level security`, `revoke all ... from anon`, policies `to authenticated` usando `public.eh_admin()`. Toda função nova: `revoke execute ... from public` (e `anon`, `authenticated` quando for só do sistema).
- Token da conta e `SUPABASE_SERVICE_ROLE_KEY` nunca em código de cliente; módulos que os tocam começam com `import "server-only"`.
- Variáveis novas, só servidor: `META_APP_ID`, `META_APP_SECRET`, `META_LOGIN_CONFIG_ID`, `META_WEBHOOK_VERIFY_TOKEN`, `CRON_SECRET`. Ausência de qualquer uma ⇒ rotas `/api/meta/*` respondem **503** e não enviam nada (trava do preview, §7.9).
- URLs com barra final (`trailingSlash: true`): `/api/meta/webhook/`, `/api/meta/disparar/`, `/api/meta/instagram/retorno/`, `/ir/<codigo>/`.
- Regras da Meta: resposta privada = 1 por comentário, até 7 dias; demais mensagens só até 24 h do último toque/mensagem da pessoa.
- Limites de texto: mensagem com botão ≤ **640** caracteres; título de botão ≤ **20**; resposta pública ≤ **300**.
- `catch` sempre com `console.error` antes de virar resultado (armadilha paga do projeto). Nada no módulo lança para fora do webhook/disparador.
- Datas exibidas no servidor com `timeZone: "America/Sao_Paulo"` (`formatarData` de `lib/crm/tempo.ts`). "Hoje" do resumo = dia em São Paulo.
- `npm test` e `npx eslint .` com zero erro e zero aviso ao fim de cada tarefa. A suíte atual tem 1280 passando + 1 *expected fail*; esse *expected fail* continua existindo.
- Telas: carregar as skills `frontend-design` e `ui-ux-pro-max`; visual do admin (Tailwind + variáveis de `app/admin/admin.css`); `--aviso` nunca em texto.
- Endereço e versão da Graph API, formato exato do template de botão e nome do campo "segue a conta" (`is_user_follow_business`): confirmar na documentação atual da Meta (login unificado) e fixar em constantes de `lib/instagram/graph.ts`.

## Review Focus

1. **Eco do próprio envio**: toda DM que o sistema manda volta pelo webhook como `is_echo`. Se for tratada como "o dono respondeu pelo app", cancela todo lembrete. Só é "dono" o eco cujo `mid` não está em `ig_mensagens` nem na fila. → teste na Tarefa 8.
2. **Comentário da própria conta**, inclusive a resposta pública que o próprio sistema posta (ela gera evento de comentário): nunca dispara automação. → teste na Tarefa 8.
3. **Evento repetido / toque duplo**: a Meta reentrega webhooks e a pessoa toca duas vezes. Uma mensagem só (chave de idempotência da fila). → testes nas Tarefas 8 e 9.
4. **Lembrete que já não faz sentido na hora de sair**: link aberto, pessoa escreveu, janela de 24 h fechada. Cancela, não envia. → teste na Tarefa 8.
5. **Navegador interno do Instagram** tem "Instagram" no user-agent e é gente de verdade: conta como abertura. Só robôs de prévia da Meta não contam. → teste na Tarefa 5.

---

## Mapa de arquivos

```
supabase/migrations/034_instagram_dm.sql          tabelas, RLS, funções de fila/resumo/retenção
supabase/migrations/035_instagram_dm_cron.sql     pg_net, chamada do disparador, jobs pg_cron
lib/instagram/tipos.ts                            tipos compartilhados (puro)
lib/instagram/palavras.ts                         normalização e casamento de palavra-chave (puro)
lib/instagram/selecao.ts                          qual automação atende o comentário (puro)
lib/instagram/textos-padrao.ts                    textos padrão de seguir/retomada/lembrete (puro)
lib/instagram/fluxo.ts                            decisões da sequência (puro)
lib/instagram/mensagens.ts                        payloads de botão e leitura de postback (puro)
lib/instagram/link.ts                             código curto, destino com UTM, robôs de prévia (puro)
lib/instagram/fila.ts                             classificação de erro, nova tentativa, motivo legível (puro)
lib/instagram/assinatura.ts                       X-Hub-Signature-256 (server-only)
lib/instagram/eventos.ts                          payload do webhook → EventoIg[] (puro, zod)
lib/instagram/graph.ts                            cliente da Graph API (server-only)
lib/instagram/repositorio.ts                      RepositorioIg sobre o admin client (server-only)
lib/instagram/motor.ts                            processarEvento, dispararFila, registrarClique (server-only)
lib/instagram/config.ts                           leitura das variáveis + `configuracaoCompleta()` (server-only)
app/api/meta/webhook/route.ts                     GET verificação, POST eventos
app/api/meta/disparar/route.ts                    POST do pg_cron
app/api/meta/instagram/retorno/route.ts           retorno do login unificado
app/ir/[codigo]/route.ts                          link curto: registra clique e redireciona
app/robots.ts                                     + disallow /ir/
lib/validations/instagram.ts                      automacaoSchema
lib/queries/admin-instagram.ts                    leituras do painel (cookie client)
app/actions/admin-instagram.ts                    salvar/alternar automação, excluir contato, publicações, iniciar conexão
app/admin/(protected)/instagram/**                layout (guarda admin + abas), caixa, automações, conexão
components/admin/instagram/**                     telas
components/admin/SidebarAdmin.tsx                 + item "Instagram"
types/database.ts                                 + tabelas/funções novas
.env.local.example, CLAUDE.md                     documentação
app/(site)/politica-de-privacidade/page.tsx      + parágrafo (aprovação do dono)
```

---

### Task 1: Migration 034 — tabelas, RLS e funções

**Files:**
- Create: `supabase/migrations/034_instagram_dm.sql`
- Modify: `types/database.ts`
- Test: `tests/unidade/instagram-migration.test.ts`

**Interfaces:**
- Produces (tabelas, todas `public`, RLS ligada, `revoke all from anon`):
  - `ig_conta` — `id smallint pk default 1 check (id = 1)`, `ig_user_id text not null`, `username text`, `nome text`, `foto_url text`, `token text not null`, `webhooks_assinados boolean not null default false`, `conectado_em timestamptz not null default now()`, `conectado_por uuid references profiles(id)`, `ultimo_evento_em timestamptz`. `revoke all ... from authenticated`; `grant select (id, ig_user_id, username, nome, foto_url, webhooks_assinados, conectado_em, ultimo_evento_em) to authenticated`; policy select `to authenticated using (eh_admin())`. **`token` sem grant para ninguém além da service role.**
  - `ig_automacoes` — `id uuid pk default gen_random_uuid()`, `nome text not null`, `slug text not null unique`, `ativa boolean not null default true`, `alvo text not null check (alvo in ('especifica','qualquer','proxima'))`, `midia_id text`, `midia_permalink text`, `midia_thumb text`, `proxima_desde timestamptz`, `palavras text[]` (null = qualquer palavra), `responder_publico boolean not null default true`, `frases_publicas text[] not null default '{}'`, `dm1_texto text not null`, `dm1_botao text not null`, `exigir_seguir boolean not null default false`, `seguir_texto text not null`, `seguir_botao text not null`, `seguir_insiste_texto text not null`, `link_texto text not null`, `link_botao text not null`, `link_url text not null`, `lembrete_ativo boolean not null default true`, `lembrete_horas int not null default 2 check (lembrete_horas between 1 and 23)`, `lembrete_texto text not null`, `retomada_botao_texto text not null`, `retomada_seguir_texto text not null`, `retomada_link_texto text not null`, `criado_por uuid references profiles(id)`, `criado_em`, `atualizado_em` (trigger `set_updated_at` existente). Check: `alvo <> 'especifica' or midia_id is not null`; `alvo <> 'proxima' or proxima_desde is not null`.
  - `ig_contatos` — `id uuid pk`, `canal text not null default 'instagram'`, `igsid text not null`, `username text`, `nome text`, `foto_url text`, `segue boolean`, `segue_conferido_em timestamptz`, `ultima_interacao_em timestamptz not null default now()`, `criado_em`; `unique (canal, igsid)`.
  - `ig_participacoes` — `id uuid pk`, `contato_id uuid not null references ig_contatos on delete cascade`, `automacao_id uuid not null references ig_automacoes on delete cascade`, `midia_id text not null`, `situacao text not null check (situacao in ('aguardando_botao','aguardando_seguir','link_enviado','link_aberto'))`, `comentarios int not null default 0`, `codigo text not null unique`, `janela_ate timestamptz`, `link_enviado_em timestamptz`, `link_aberto_em timestamptz`, `falha_motivo text`, `falha_em timestamptz`, `criado_em`, `atualizado_em`; `unique (contato_id, automacao_id, midia_id)`.
  - `ig_mensagens` — `id uuid pk`, `contato_id uuid not null references ig_contatos on delete cascade`, `participacao_id uuid references ig_participacoes on delete set null`, `direcao text not null check (direcao in ('entrada','saida','dono','sistema'))`, `tipo text not null check (tipo in ('comentario','texto','botao','link_aberto','resposta_publica','aviso'))`, `texto text`, `meta_id text unique`, `criado_em timestamptz not null default now()`.
  - `ig_envios` — `id uuid pk`, `chave text not null unique`, `contato_id uuid not null references ig_contatos on delete cascade`, `participacao_id uuid references ig_participacoes on delete cascade`, `tipo text not null check (tipo in ('resposta_privada','resposta_publica','mensagem','lembrete'))`, `comentario_id text`, `payload jsonb`, `enviar_apos timestamptz not null default now()`, `estado text not null default 'pendente' check (estado in ('pendente','processando','enviado','falhou','cancelado'))`, `tentativas int not null default 0`, `erro text`, `meta_id text`, `reservado_em timestamptz`, `enviado_em timestamptz`, `criado_em`.
  - `ig_eventos` — `chave text pk`, `recebido_em timestamptz not null default now()`, `payload jsonb`, `processado_em timestamptz`, `erro text`.
  - `ig_cliques` — `id uuid pk`, `participacao_id uuid not null references ig_participacoes on delete cascade`, `user_agent text`, `criado_em`.
- Produces (policies): leitura `to authenticated using (eh_admin())` em `ig_automacoes`, `ig_contatos`, `ig_participacoes`, `ig_mensagens`, `ig_envios`, `ig_cliques`; escrita (`insert/update/delete`) `to authenticated` com `eh_admin()` só em `ig_automacoes`; `delete` com `eh_admin()` em `ig_contatos` (exclusão de dados). `ig_eventos`: nenhuma policy (só service role).
- Produces (funções):
  - `ig_reservar_envios(p_limite int) returns setof ig_envios` — `security definer`, `set search_path = public`; marca `processando` + `reservado_em = now()` as linhas `pendente` com `enviar_apos <= now()` **ou** `processando` com `reservado_em < now() - interval '5 minutes'`, `order by enviar_apos`, `limit p_limite`, `for update skip locked`. `revoke execute from public, anon, authenticated`; `grant execute to service_role`.
  - `ig_resumo_do_dia(p_automacao uuid default null) returns table (comentarios int, links_enviados int, links_abertos int, falhas int)` — `security invoker`, conta eventos do dia corrente em `America/Sao_Paulo` (comentários = `ig_mensagens.tipo='comentario'`; enviados = `link_enviado_em`; abertos = `link_aberto_em`; falhas = `falha_em`). `revoke from public, anon`; `grant to authenticated`.
  - `ig_apagar_inativos() returns int` — apaga `ig_contatos` com `ultima_interacao_em < now() - interval '12 months'` (cascata leva o resto). `security definer`, revogada de todos.
  - `ig_limpar_eventos() returns int` — apaga `ig_eventos` com `recebido_em < now() - interval '30 days'`. `security definer`, revogada de todos.

- [ ] **Step 1: Write the failing test** `tests/unidade/instagram-migration.test.ts`, no padrão de `crm-sem-acesso-anonimo.test.ts` (lê o `.sql`, tira comentários `--`):

```ts
const TABELAS = ["ig_conta","ig_automacoes","ig_contatos","ig_participacoes","ig_mensagens","ig_envios","ig_eventos","ig_cliques"];
it.each(TABELAS)("%s tem RLS ligada", t => expect(sql).toMatch(new RegExp(`alter table public\\.${t} enable row level security`, "i")));
it.each(TABELAS)("%s revoga tudo do anon", t => expect(sql).toMatch(new RegExp(`revoke all on (table )?public\\.${t} from anon`, "i")));
it("toda policy é to authenticated", () => { for (const p of sql.match(/create policy[\s\S]*?;/gi)!) expect(p).toMatch(/to authenticated/i); });
it("token de ig_conta não recebe grant", () => expect(sql).not.toMatch(/grant[^;]*\btoken\b[^;]*to authenticated/i));
it.each(["ig_reservar_envios","ig_resumo_do_dia","ig_apagar_inativos","ig_limpar_eventos"])("%s revoga execute de public", f =>
  expect(sql).toMatch(new RegExp(`revoke (all|execute)[^;]*function public\\.${f}[^;]*from public`, "i")));
it("sem begin/commit", () => expect(sql).not.toMatch(/^\s*(begin|commit);/im));
it("lembrete entre 1 e 23 horas", () => expect(sql).toMatch(/lembrete_horas between 1 and 23/i));
```

- [ ] **Step 2: Run** `npx vitest run tests/unidade/instagram-migration.test.ts` — Expected: FAIL (arquivo não existe).
- [ ] **Step 3: Write `034_instagram_dm.sql`** com o que está em Interfaces.
- [ ] **Step 4: Run** o teste — Expected: PASS. Rodar a migration num banco descartável **não** é possível (banco único); validar a sintaxe com `npx supabase db lint` se a CLI estiver configurada, senão revisão linha a linha contra a 023/031.
- [ ] **Step 5: Atualizar `types/database.ts`** com as 8 tabelas e as 4 funções (à mão, no formato existente). Run `npx tsc --noEmit` — Expected: sem erro.
- [ ] **Step 6: Commit** `feat(instagram): migration 034 com tabelas, RLS e funções`.

### Task 2: Migration 035 — disparador por minuto e limpezas

**Files:**
- Create: `supabase/migrations/035_instagram_dm_cron.sql`
- Test: `tests/unidade/instagram-migration.test.ts` (acrescentar)

**Interfaces:**
- Consumes: funções da Task 1.
- Produces: `create extension if not exists pg_net;` função `ig_chamar_disparador() returns void` (`security definer`, revogada de todos) que lê de `vault.decrypted_secrets` os segredos **`ig_disparar_url`** (ex.: `https://rtcapitalimobiliario.com.br/api/meta/disparar/`) e **`ig_cron_secret`**; se algum faltar, retorna sem fazer nada; senão `net.http_post(url, headers := jsonb_build_object('Authorization','Bearer '||segredo,'Content-Type','application/json'), body := '{}'::jsonb)`. Jobs (padrão `unschedule` se existir + `schedule` da 023): `ig-disparar` `* * * * *` → `select public.ig_chamar_disparador()`; `ig-apagar-inativos` `15 6 * * *`; `ig-limpar-eventos` `30 6 * * *`. Os segredos do Vault são criados **fora** da migration (Etapa 4 do roteiro); o cabeçalho diz como (`select vault.create_secret('<valor>','ig_cron_secret')`).

- [ ] **Step 1: Failing tests**: `sql035` contém `create extension if not exists pg_net`; contém `cron.schedule('ig-disparar', '* * * * *'`; não contém `Bearer ` seguido de literal (regex `/Bearer\s+[A-Za-z0-9]{8,}/` não casa); `ig_chamar_disparador` revoga execute de public; contém `decrypted_secrets`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Write `035_instagram_dm_cron.sql`.**
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(instagram): migration 035 com disparador por minuto e limpezas`.

### Task 3: Tipos, palavras-chave e seleção da automação

**Files:**
- Create: `lib/instagram/tipos.ts`, `lib/instagram/palavras.ts`, `lib/instagram/selecao.ts`
- Test: `tests/unidade/instagram-palavras.test.ts`, `tests/unidade/instagram-selecao.test.ts`

**Interfaces:**
- Produces `tipos.ts`:
  - `type Situacao = "aguardando_botao" | "aguardando_seguir" | "link_enviado" | "link_aberto"`
  - `type Alvo = "especifica" | "qualquer" | "proxima"`
  - `interface Automacao` — camelCase das colunas de `ig_automacoes` (`id, nome, slug, ativa, alvo, midiaId, proximaDesde, palavras: string[] | null, responderPublico, frasesPublicas, dm1Texto, dm1Botao, exigirSeguir, seguirTexto, seguirBotao, seguirInsisteTexto, linkTexto, linkBotao, linkUrl, lembreteAtivo, lembreteHoras, lembreteTexto, retomadaBotaoTexto, retomadaSeguirTexto, retomadaLinkTexto, criadoEm`).
  - `interface Participacao { id; contatoId; automacaoId; midiaId; situacao: Situacao; comentarios: number; codigo: string; janelaAte: string | null }`
  - `type Botao = { tipo: "postback"; titulo: string; payload: string } | { tipo: "link"; titulo: string; url: string }`
  - `interface MensagemSaida { texto: string; botao: Botao }`
- Produces `palavras.ts`: `normalizar(texto: string): string` (NFD, remove diacríticos, minúsculas) e `casaPalavras(comentario: string, palavras: string[] | null): boolean` — `null` ou lista vazia = qualquer palavra; casamento por **sequência de tokens inteiros** (tokens = `\p{L}|\p{N}` contíguos), então expressão com várias palavras casa em sequência.
- Produces `selecao.ts`: `escolherAutomacao(lista: Automacao[], c: { midiaId: string; texto: string; midiaCriadaEm: string | null }): { automacao: Automacao; vincular: boolean } | null`. Filtra `ativa` e `casaPalavras`; prioridade: (1) `alvo` especifica **ou** proxima já vinculada com `midiaId` igual; (2) proxima sem `midiaId` com `proximaDesde < midiaCriadaEm` → `vincular: true`; (3) qualquer. Empate: maior `criadoEm`.

- [ ] **Step 1: Failing tests** (`palavras`):

```ts
expect(casaPalavras("Quero AVALIAR!!", ["avaliar"])).toBe(true);
expect(casaPalavras("reavaliar", ["avaliar"])).toBe(false);
expect(casaPalavras("simulação já", ["simulacao"])).toBe(true);
expect(casaPalavras("quero simular agora", ["quero simular"])).toBe(true);
expect(casaPalavras("simular quero", ["quero simular"])).toBe(false);
expect(casaPalavras("🔥 Avaliar 🔥", ["avaliar"])).toBe(true);
expect(casaPalavras("qualquer coisa", null)).toBe(true);
expect(casaPalavras("", ["avaliar"])).toBe(false);
```
  (`selecao`): específica vence qualquer; proxima vinculada conta como específica; proxima sem vínculo vincula só se a mídia é mais nova que `proximaDesde` (`vincular: true`) e não vincula mídia mais antiga; pausada nunca é escolhida; palavra que não casa na específica deixa a "qualquer" que casa ganhar; empate → mais recente.
- [ ] **Step 2: Run** `npx vitest run tests/unidade/instagram-palavras.test.ts tests/unidade/instagram-selecao.test.ts` — FAIL.
- [ ] **Step 3: Implement** os três arquivos.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(instagram): palavras-chave e seleção de automação`.

### Task 4: Decisões da sequência (`fluxo.ts`)

**Files:**
- Create: `lib/instagram/fluxo.ts`, `lib/instagram/textos-padrao.ts`
- Test: `tests/unidade/instagram-fluxo.test.ts`

**Interfaces:**
- Consumes: `tipos.ts`. Esta tarefa **cria** `lib/instagram/mensagens.ts` só com `payloadBotao(acao: "b1" | "seguir", participacaoId: string): string` → `"ig:b1:<id>"` / `"ig:seguir:<id>"`; a Task 5 acrescenta o resto do arquivo.
- Produces:
  - `type Acao = { tipo: "resposta_publica"; comentarioId: string; texto: string } | { tipo: "resposta_privada"; comentarioId: string; mensagem: MensagemSaida; situacao?: Situacao } | { tipo: "mensagem"; mensagem: MensagemSaida; situacao?: Situacao } | { tipo: "agendar_lembrete"; enviarApos: Date } | { tipo: "cancelar_lembretes" } | { tipo: "aviso"; texto: string }` — `situacao` só é aplicada quando o envio dá certo.
  - `decidirAoComentar(a: Automacao, p: { id: string; situacao: Situacao | null; comentarios: number }, ctx: { comentarioId: string; segue: boolean | null; urlCurta: string; sortear: (n: number) => number }): Acao[]` — `p.comentarios` já inclui este comentário; `situacao: null` = participação nova.
  - `decidirAoTocar(a: Automacao, p: { id: string; situacao: Situacao }, botao: "b1" | "seguir", ctx: { segue: boolean | null; urlCurta: string; agora: Date; janelaAte: Date }): Acao[]`
  - `decidirLembrete(a: Automacao, p: { situacao: Situacao; janelaAte: string | null }, ctx: { urlCurta: string; agora: Date }): Acao[]`
  - `momentoDoLembrete(agora: Date, horas: number, janelaAte: Date): Date` = `min(agora + horas, janelaAte − 5 min)`.
  - `textos-padrao.ts`: `TEXTOS_PADRAO` com exatamente:
    - `seguirTexto`: "Quase lá! Me segue aqui no perfil e toca no botão abaixo que eu te mando o link 👇"
    - `seguirBotao`: "Já estou seguindo"
    - `seguirInsisteTexto`: "Ainda não apareceu aqui que você me segue 🙂 Segue o perfil e toca de novo:"
    - `lembreteTexto`: "Vi que você ainda não abriu o link 🙂 Ele continua aqui:"
    - `retomadaBotaoTexto`: "Olá! Vi que você comentou novamente no post. Toca no botão abaixo que eu te mando o link:"
    - `retomadaSeguirTexto`: "Olá! Vi que você comentou novamente no post. Vou te mandar o link depois que nos seguir por aqui 👇"
    - `retomadaLinkTexto`: "Olá! Vi que você comentou novamente no post. Aqui está o link:"
- Regras (spec §6.1, §6.2, §7.2, §7.3, §7.5): `segue === null` conta como **segue** (falha aberta: entregar o link é o objetivo). Situação nova → `aguardando_botao`. Botão `b1` com `exigirSeguir` e não segue → mensagem de seguir (botão `seguir`), situação `aguardando_seguir`, lembrete. Botão `seguir` e ainda não segue → `seguirInsisteTexto` com botão `seguir`, **sem** novo lembrete. Link entregue → situação `link_enviado`, `cancelar_lembretes` antes de `agendar_lembrete` (um lembrete por sequência). `lembreteAtivo = false` → nenhum `agendar_lembrete`. Lembrete: sai só se situação ∈ {`link_enviado`, `aguardando_seguir`} e `janelaAte > agora`; leva `lembreteTexto` + botão de link e muda para `link_enviado`.

- [ ] **Step 1: Failing tests** (uma `it` por linha; `a` = automação de teste com `exigirSeguir` variando; `agora` fixo):
  - 1º comentário, `responderPublico` com 3 frases e `sortear = () => 1` → `[resposta_publica(frases[1]), resposta_privada(dm1Texto, botão postback "ig:b1:<id>", situacao "aguardando_botao")]`.
  - 1º comentário com `responderPublico = false` → só a `resposta_privada`.
  - 2º comentário parado em `aguardando_botao` → resposta pública (se `responderPublico`) + resposta privada com `retomadaBotaoTexto` + botão b1.
  - 2º comentário parado em `aguardando_seguir`, `segue: false` → `retomadaSeguirTexto` + botão seguir; com `segue: true` → `retomadaLinkTexto` + botão link `urlCurta`, situação `link_enviado`.
  - 2º comentário parado em `link_enviado` e em `link_aberto` → `retomadaLinkTexto` + link.
  - 3º comentário → `[{ tipo: "aviso", texto: "comentou 3+ vezes" }]` e nada mais.
  - Toque b1 sem `exigirSeguir` → mensagem `linkTexto` + link, situação `link_enviado`, `cancelar_lembretes`, `agendar_lembrete` em `agora + 2h`.
  - Toque b1 com `exigirSeguir`, `segue: false` → `seguirTexto` + botão seguir, situação `aguardando_seguir`, lembrete agendado.
  - Toque b1 com `exigirSeguir`, `segue: null` → link (falha aberta).
  - Toque seguir, `segue: false` → `seguirInsisteTexto`, sem `agendar_lembrete`.
  - `momentoDoLembrete(agora, 23, agora+24h)` = agora+23h; `momentoDoLembrete(agora, 23, agora+10h)` = agora+10h−5min.
  - `decidirLembrete` com `link_aberto` → `[]`; com janela vencida → `[]`; com `aguardando_seguir` → mensagem com link e situação `link_enviado`.
- [ ] **Step 2: Run** `npx vitest run tests/unidade/instagram-fluxo.test.ts` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(instagram): decisões da sequência de DMs`.

### Task 5: Mensagens, link curto e fila (puros)

**Files:**
- Create: `lib/instagram/mensagens.ts`, `lib/instagram/link.ts`, `lib/instagram/fila.ts`
- Test: `tests/unidade/instagram-mensagens.test.ts`, `tests/unidade/instagram-link.test.ts`, `tests/unidade/instagram-fila.test.ts`

**Interfaces:**
- Produces `mensagens.ts`: `payloadBotao(acao: "b1" | "seguir", participacaoId: string): string`; `lerPayload(payload: string): { acao: "b1" | "seguir"; participacaoId: string } | null` (só aceita `ig:(b1|seguir):<uuid>`); `corpoMensagem(m: MensagemSaida): object` — template de botão da Graph API (formato confirmado na doc; um botão `postback` ou `web_url`).
- Produces `link.ts`: `gerarCodigo(): string` (10 caracteres de `[a-z0-9]`, `crypto.getRandomValues`); `urlCurta(codigo: string): string` = `${SITE_URL}/ir/${codigo}/`; `destinoComUtm(url: string, slug: string): string` — só quando o host é `rtcapitalimobiliario.com.br`, acrescenta `utm_source=instagram`, `utm_medium=dm`, `utm_campaign=<slug>` sem apagar query nem `#hash` existentes e sem sobrescrever UTM já presente; `ehRoboDePrevia(ua: string | null): boolean` — verdadeiro só para `facebookexternalhit`, `Facebot`, `meta-externalagent`, `meta-externalfetcher` (sem diferenciar maiúscula).
- Produces `fila.ts`: `type ErroGraph = { status: number; codigo?: number; subcodigo?: number; mensagem: string }`; `ehTemporario(e: ErroGraph): boolean` (status 429 ou ≥ 500, ou `codigo` ∈ {1, 2, 4, 17, 32, 613}); `proximaTentativa(tentativas: number, agora: Date): Date | null` → `agora + 2^tentativas min` enquanto `tentativas < 3`, senão `null`; `motivoLegivel(e: ErroGraph): string` — janela fechada (`codigo 10` ou subcódigo `2018278`, ou mensagem contendo "outside of allowed window") → "Janela de 24 h fechada"; `codigo 551` → "A pessoa não aceita mensagens"; fallback `A Meta recusou o envio (código ${codigo ?? status})`. Conferir os códigos na doc e acrescentar os que faltarem.

- [ ] **Step 1: Failing tests**:

```ts
expect(lerPayload(payloadBotao("b1", ID))).toEqual({ acao: "b1", participacaoId: ID });
expect(lerPayload("ig:b1:nao-uuid")).toBeNull();
expect(lerPayload("MANYCHAT_XYZ")).toBeNull();
expect(destinoComUtm("https://rtcapitalimobiliario.com.br/financiamento/#simulador", "parcela"))
  .toBe("https://rtcapitalimobiliario.com.br/financiamento/?utm_source=instagram&utm_medium=dm&utm_campaign=parcela#simulador");
expect(destinoComUtm("https://wa.me/5519999", "x")).toBe("https://wa.me/5519999");
expect(destinoComUtm("https://rtcapitalimobiliario.com.br/?utm_source=ads", "x")).toContain("utm_source=ads");
expect(ehRoboDePrevia("facebookexternalhit/1.1")).toBe(true);
expect(ehRoboDePrevia("Mozilla/5.0 (iPhone) ... Instagram 300.0.0")).toBe(false);
expect(ehRoboDePrevia(null)).toBe(false);
expect(gerarCodigo()).toMatch(/^[a-z0-9]{10}$/);
expect(proximaTentativa(0, T)).toEqual(new Date(+T + 60_000));
expect(proximaTentativa(3, T)).toBeNull();
expect(ehTemporario({ status: 400, codigo: 10, mensagem: "" })).toBe(false);
expect(motivoLegivel({ status: 400, codigo: 10, mensagem: "" })).toBe("Janela de 24 h fechada");
```
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(instagram): mensagens, link curto e política de reenvio`.

### Task 6: Assinatura e leitura do webhook

**Files:**
- Create: `lib/instagram/assinatura.ts`, `lib/instagram/eventos.ts`
- Test: `tests/unidade/instagram-assinatura.test.ts`, `tests/unidade/instagram-eventos.test.ts` (+ fixtures em `tests/apoio/instagram-webhooks.ts`, montadas a partir dos exemplos da documentação da Meta)

**Interfaces:**
- Produces `assinatura.ts`: `assinaturaValida(corpoBruto: string, cabecalho: string | null, segredo: string): boolean` — HMAC-SHA256, comparação com `timingSafeEqual`, cabeçalho no formato `sha256=<hex>`.
- Produces `eventos.ts`: `type EventoIg = { tipo: "comentario"; chave: string; comentarioId: string; midiaId: string; deId: string; deUsername: string | null; texto: string } | { tipo: "botao"; chave: string; deId: string; payload: string; titulo: string } | { tipo: "texto"; chave: string; deId: string; paraId: string; texto: string | null; eco: boolean; mid: string }`; `lerEventos(corpo: unknown): EventoIg[]` — `object: "instagram"`, `entry[].changes[]` com `field: "comments"` e `entry[].messaging[]` (postback, message, `is_echo`); `chave` = id do comentário, `mid` do postback/mensagem; ignora o que não reconhece (nunca lança); reação, leitura e anexo sem texto viram nada ou `texto: null`.

- [ ] **Step 1: Failing tests**: assinatura certa → true; corpo alterado → false; cabeçalho ausente ou sem `sha256=` → false. `lerEventos` com fixture de comentário → 1 evento `comentario` com `midiaId` e `deUsername`; postback → `botao` com `payload`; mensagem → `texto` com `eco: false`; eco → `eco: true` e `paraId` = destinatário; `{object: "page"}` → `[]`; corpo `null` → `[]`; lote com 2 entries → 2 eventos.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(instagram): assinatura e leitura de eventos do webhook`.

### Task 7: Cliente da Graph API e configuração

**Files:**
- Create: `lib/instagram/graph.ts`, `lib/instagram/config.ts`
- Test: `tests/unidade/instagram-graph.test.ts` (com `fetch` substituído por `vi.fn`)

**Interfaces:**
- Produces `config.ts`: `configMeta(): { appId; appSecret; loginConfigId; verifyToken; cronSecret } | null` — `null` se qualquer variável faltar (é a trava de 503).
- Produces `graph.ts`:
  - `type ResultadoGraph = { ok: true; id?: string } | ({ ok: false } & ErroGraph)`
  - `interface GraphIg { respostaPrivada(comentarioId: string, m: MensagemSaida): Promise<ResultadoGraph>; mensagem(igsid: string, m: MensagemSaida): Promise<ResultadoGraph>; responderComentario(comentarioId: string, texto: string): Promise<ResultadoGraph>; segue(igsid: string): Promise<boolean | null>; midiaCriadaEm(midiaId: string): Promise<string | null>; publicacoes(limite: number): Promise<Publicacao[]>; perfil(igsid: string): Promise<{ username: string | null; nome: string | null; fotoUrl: string | null } | null> }`
  - `type Publicacao = { id: string; legenda: string | null; tipo: string; miniatura: string | null; permalink: string; criadaEm: string }`
  - `criarGraph(token: string, igUserId: string, f?: typeof fetch): GraphIg`
  - Login: `urlDeLogin(state: string, redirectUri: string): string` (diálogo OAuth com `config_id`); `trocarCodigo(code: string, redirectUri: string): Promise<{ token: string } | null>`; `contaAtribuida(token: string): Promise<{ igUserId; username; nome; fotoUrl } | null>`; `assinarWebhooks(token: string, igUserId: string): Promise<boolean>` (campos `comments,messages,messaging_postbacks`).
  - Nunca lança: erro de rede vira `{ ok: false, status: 0, mensagem }` (com `console.error`); `segue`/`perfil`/`midiaCriadaEm` devolvem `null`. Token só no cabeçalho `Authorization`, nunca na URL nem em log.
- [ ] **Step 1: Failing tests**: `mensagem` faz POST no endpoint de mensagens com o corpo de `corpoMensagem` e `Authorization: Bearer <token>`; resposta `{message_id}` → `{ok: true, id}`; resposta de erro Graph `{error:{code:10,...}}` 400 → `{ok:false, status:400, codigo:10}`; `fetch` rejeitando → `{ok:false, status:0}`; `segue` lê o campo de "segue a conta" e devolve `null` em erro; nenhum `console.error` contém o token.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(instagram): cliente da Graph API`.

### Task 8: Repositório e motor

**Files:**
- Create: `lib/instagram/repositorio.ts`, `lib/instagram/motor.ts`
- Test: `tests/unidade/instagram-motor.test.ts` (repositório e Graph falsos em memória, em `tests/apoio/instagram-falsos.ts`)

**Interfaces:**
- Consumes: Tasks 3–7.
- Produces `motor.ts`:
  - `interface RepositorioIg` (implementado em `repositorio.ts` com `createAdminClient()`): `conta(): Promise<{ igUserId: string; token: string } | null>`; `automacoesAtivas(): Promise<Automacao[]>`; `automacao(id): Promise<Automacao | null>`; `vincularProxima(automacaoId, midiaId): Promise<void>`; `contato(igsid): Promise<{ id: string } | null>`; `salvarContato(c: { igsid; username?; nome?; fotoUrl?; segue?: boolean | null }): Promise<{ id: string }>` (upsert e renova `ultima_interacao_em`); `participacao(contatoId, automacaoId, midiaId): Promise<Participacao | null>`; `participacaoPorId(id): Promise<Participacao | null>`; `participacaoPorCodigo(codigo): Promise<Participacao | null>`; `contarComentario(p: { contatoId; automacaoId; midiaId; codigo }): Promise<{ participacao: Participacao; situacaoAntes: Situacao | null }>` (cria com `aguardando_botao`, `comentarios` 1, ou incrementa); `atualizarParticipacao(id, campos): Promise<void>`; `participaDeAlguma(contatoId): Promise<boolean>`; `registrarMensagem(m): Promise<void>` (ignora `meta_id` repetido); `mensagemConhecida(metaId): Promise<boolean>` (procura em `ig_mensagens.meta_id` **e** `ig_envios.meta_id`); `enfileirar(e): Promise<boolean>` (`false` se a `chave` já existe); `cancelarLembretes(participacaoId): Promise<void>`; `reservarEnvios(limite): Promise<Envio[]>` (RPC `ig_reservar_envios`); `concluirEnvio(id, r): Promise<void>`; `registrarClique(participacaoId, ua): Promise<void>`; `descartarConteudo(chave): Promise<void>`; `marcarEvento(chave, erro?): Promise<void>`.
  - `criarMotor(dep: { repo: RepositorioIg; graph: GraphIg | null; agora: () => Date; sortear: (n: number) => number })` → `{ processarEvento(e: EventoIg): Promise<void>; dispararFila(limite?: number): Promise<{ enviados: number; falhas: number }>; registrarClique(codigo: string, ua: string | null): Promise<string | null> }` (`registrarClique` devolve o destino com UTM, ou `null` se o código não existe).
  - Chaves de idempotência da fila: `c:<comentarioId>:privada`, `c:<comentarioId>:publica`, `b:<mid>` para o que um toque gera, `l:<chave do evento que agendou>` para o lembrete.
- Regras do motor (o que não está em `fluxo.ts`):
  - `comentario`: `deId` = conta conectada → ignora. Seleção por `escolherAutomacao` (busca `midiaCriadaEm` só se houver `proxima` sem vínculo; `vincular` → `vincularProxima`). Sem automação → nada é gravado. Com automação: `salvarContato`, `contarComentario`, mensagem `entrada/comentario`, se for o 2º comentário e a situação for `aguardando_seguir` consulta `graph.segue`, aplica `decidirAoComentar`, enfileira as ações e chama `dispararFila()`.
  - `botao`: `lerPayload` inválido → ignora. Participação inexistente → ignora. `janela_ate = agora + 24h`, mensagem `entrada/botao`, consulta `segue` quando relevante, `decidirAoTocar`, enfileira, dispara.
  - `texto` com `eco: true`: `mensagemConhecida(mid)` → ignora (é nosso); senão, se o destinatário participa de alguma automação → mensagem `dono` + `cancelarLembretes` de todas as participações dele; senão `descartarConteudo`.
  - `texto` com `eco: false`: participa → mensagem `entrada/texto`, renova `janela_ate`, `cancelarLembretes`; não participa → `descartarConteudo`, nada mais.
  - `dispararFila`: para cada envio reservado — lembrete recalcula com `decidirLembrete` (vazio ⇒ `cancelado`); envia via Graph; sucesso ⇒ `enviado`, `meta_id`, mensagem `saida`, aplica `situacao` (e `link_enviado_em`); erro temporário com `proximaTentativa` ⇒ volta a `pendente`; senão `falhou` + `falha_motivo`/`falha_em` na participação. Sem conta conectada ou `graph` nulo ⇒ não reserva nada.
  - `registrarClique`: código inexistente ⇒ `null`. Robô ⇒ destino sem registrar. Gente ⇒ `ig_cliques`, `link_aberto` + `link_aberto_em` (se ainda não), mensagem `sistema/link_aberto`, `cancelarLembretes`.
- [ ] **Step 1: Failing tests** (com falsos):
  - 1º comentário com palavra → fila tem resposta pública + privada; `graph.respostaPrivada` chamado uma vez; situação `aguardando_botao`.
  - Comentário cujo `deId` é a conta → nenhuma escrita (Review Focus 2).
  - Mesmo comentário processado duas vezes → uma resposta privada (Review Focus 3).
  - Toque b1 duas vezes com o mesmo `mid` → uma mensagem; com `mid` diferente → a segunda vira mensagem do fluxo, sem lembrete duplicado.
  - Eco com `mid` de mensagem que o sistema enviou → não cancela lembrete (Review Focus 1); eco com `mid` desconhecido → mensagem `dono` e lembrete `cancelado`.
  - Texto livre de quem não participa → `descartarConteudo` chamado, nenhuma mensagem gravada.
  - Lembrete vencido com situação `link_aberto` → `cancelado`, Graph não chamado; com janela fechada → `cancelado` (Review Focus 4).
  - Erro 500 da Graph → `pendente` com `enviar_apos` +1 min; quarta falha → `falhou` e `falha_motivo` preenchido.
  - `registrarClique` com UA do Instagram → `link_aberto`; com `facebookexternalhit` → destino devolvido e situação intacta.
  - Automação pausada: comentário novo não inicia nada; toque b1 de quem já estava na sequência ainda entrega o link; lembrete pendente ainda sai (§7.2).
- [ ] **Step 2: Run** `npx vitest run tests/unidade/instagram-motor.test.ts` — FAIL.
- [ ] **Step 3: Implement** `motor.ts`, depois `repositorio.ts` (só tradução para o Supabase; conferir retornos com `.select()` em todo update — armadilha paga).
- [ ] **Step 4: Run** — PASS. Run `npx tsc --noEmit` — sem erro.
- [ ] **Step 5: Commit** `feat(instagram): motor de eventos e fila de envios`.

### Task 9: Rotas públicas — webhook, disparador e link curto

**Files:**
- Create: `app/api/meta/webhook/route.ts`, `app/api/meta/disparar/route.ts`, `app/ir/[codigo]/route.ts`, `lib/instagram/motor-padrao.ts` (`motorPadrao(): Promise<Motor | null>` monta repo + graph a partir de `configMeta()` e da conta)
- Modify: `app/robots.ts` (`DISALLOW` vira `["/admin", "/ir/"]` nos dois grupos), `tests/unidade/robots.test.ts`
- Test: `tests/unidade/instagram-rotas.test.ts`

**Interfaces:**
- Consumes: `configMeta`, `assinaturaValida`, `lerEventos`, `motorPadrao`.
- Produces: rotas com `runtime = "nodejs"`, `dynamic = "force-dynamic"`, `Cache-Control: no-store`, padrão de `app/api/admin/crm/simulacao/route.ts`.
  - Webhook `GET`: `hub.mode=subscribe` e `hub.verify_token` igual a `verifyToken` → 200 com `hub.challenge` em texto puro; senão 403; sem config → 503.
  - Webhook `POST`: sem config → 503; lê `req.text()` (limite 1 MB → 413); assinatura inválida → 401; insere cada evento em `ig_eventos` (`on conflict do nothing`), atualiza `ig_conta.ultimo_evento_em`, responde **200** e em `after()` processa só os eventos novos e marca `processado_em`/`erro`.
  - Disparar `POST`: sem config → 503; `Authorization` diferente de `Bearer <cronSecret>` (comparação em tempo constante) → 401; senão `dispararFila(20)` e `{ enviados, falhas }`.
  - `/ir/[codigo]/` `GET`: `registrarClique`; destino → 302 com `X-Robots-Tag: noindex`; código desconhecido → 302 para `SITE_URL` (nunca 404 nem erro).
- [ ] **Step 1: Failing tests** (motor e config mockados com `vi.mock`): GET com token certo devolve o challenge; token errado 403; sem config 503 nos três endpoints; POST com assinatura errada 401 e motor não chamado; POST válido 200 e motor chamado só para chave nova (evento repetido não reprocessa); disparar sem Bearer 401; `/ir/abc/` desconhecido → 302 para `SITE_URL`; robots tem `/ir/` nos dois grupos.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(instagram): rotas do webhook, disparador e link curto`.

### Task 10: Validação e ações do painel

**Files:**
- Create: `lib/validations/instagram.ts`, `app/actions/admin-instagram.ts`, `lib/queries/admin-instagram.ts`
- Test: `tests/validacoes/instagram.test.ts`, `tests/acoes/admin-instagram.test.ts`

**Interfaces:**
- Produces `automacaoSchema` (zod): `nome` 1–80; `alvo`; `midiaId` obrigatório se `especifica`; `palavras: string[] | null` (cada 1–40, mínimo 1 se não for "qualquer palavra"); `frasesPublicas` mínimo 1 e cada ≤ 300 se `responderPublico`; textos com botão ≤ 640; títulos de botão 1–20; `linkUrl` `https://`; `lembreteHoras` inteiro 1–23; textos de retomada/seguir/lembrete obrigatórios (o editor pré-preenche com `TEXTOS_PADRAO`).
- Produces ações (todas começam com `exigirAdmin()`, retornam `AcaoResultado`, conferem update com `.select("id")`, `revalidatePath("/admin/instagram", "layout")`):
  - `salvarAutomacao(input): Promise<AcaoResultado & { id?: string }>` — cria ou atualiza; `slug` por `slugify(nome)` (`lib/blog/slugify.ts`) com sufixo numérico se repetir; ao criar `proxima`, `proxima_desde = now()`.
  - `alternarAutomacao(id: string, ativa: boolean): Promise<AcaoResultado>`
  - `excluirAutomacao(id: string): Promise<AcaoResultado>`
  - `excluirContato(id: string): Promise<AcaoResultado>` — apaga o contato (cascata).
  - `listarPublicacoes(): Promise<AcaoResultado & { publicacoes?: Publicacao[] }>` — via `motorPadrao`/Graph, 24 mais recentes; sem conta → erro "Conecte o Instagram primeiro."
  - `iniciarConexao(): Promise<AcaoResultado & { url?: string }>` — gera `state` aleatório, grava cookie `ig_oauth_state` (httpOnly, secure, sameSite lax, 10 min) e devolve `urlDeLogin`.
- Produces queries (cookie client, RLS): `listarAutomacoes()`, `automacaoPorId(id)`, `caixaDeEntrada(filtro: { automacaoId?: string; situacao?: Situacao | "falha" | "3mais" })` (contatos com participação mais recente, etiqueta e horário do lembrete pendente), `conversa(contatoId)` (mensagens em ordem), `resumoDoDia(automacaoId?)` (RPC `ig_resumo_do_dia`), `statusConexao()`.
- [ ] **Step 1: Failing tests**: schema rejeita botão de 21 caracteres, `lembreteHoras` 24, `especifica` sem `midiaId`, `http://`; aceita `palavras: null`. Ações (padrão `criarSupabaseFalso`): corretor recebe `ERRO_APENAS_ADMIN`; update que não casa linha devolve erro; `iniciarConexao` grava o cookie e a URL contém `config_id` e o mesmo `state`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(instagram): validação, ações e consultas do painel`.

### Task 11: Conexão da conta

**Files:**
- Create: `app/api/meta/instagram/retorno/route.ts`, `app/admin/(protected)/instagram/conexao/page.tsx`, `components/admin/instagram/StatusConexao.tsx`
- Test: `tests/unidade/instagram-retorno.test.ts`

**Interfaces:**
- Consumes: `iniciarConexao`, `trocarCodigo`, `contaAtribuida`, `assinarWebhooks`, `statusConexao`.
- Produces: retorno `GET` — exige admin (`exigirAdmin()`; senão redireciona para `/admin/login/`); `state` diferente do cookie → redireciona para `/admin/instagram/conexao/?erro=state`; troca o código, descobre a conta, grava `ig_conta` (upsert id 1, com service role), assina webhooks, apaga o cookie, redireciona para `/admin/instagram/conexao/?ok=1`. Qualquer falha → `?erro=<motivo curto>` com `console.error`. `redirect_uri` = `${SITE_URL}/api/meta/instagram/retorno/`.
  - Página: conta (@, foto, desde quando), "webhooks assinados", "último evento recebido", botão **Conectar Instagram** / **Reconectar** (chama `iniciarConexao` e navega para a URL), mensagens de `?ok`/`?erro`.
- [ ] **Step 1: Failing tests**: sem admin → redirect para login; `state` divergente → `?erro=state` e nada gravado; fluxo feliz grava a conta com o token e chama `assinarWebhooks`; token nunca aparece na URL de redirecionamento.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(instagram): conexão da conta pelo login unificado`.

### Task 12: Telas de automação

**Files:**
- Create: `app/admin/(protected)/instagram/layout.tsx` (guarda `garantirAdminOuRedirecionar()` + abas Caixa de entrada · Automações · Conexão), `app/admin/(protected)/instagram/automacoes/page.tsx`, `.../automacoes/nova/page.tsx`, `.../automacoes/[id]/page.tsx`, `components/admin/instagram/ListaAutomacoes.tsx`, `EditorAutomacao.tsx`, `SeletorPublicacao.tsx`, `PreviaCelular.tsx`
- Modify: `components/admin/SidebarAdmin.tsx` (item `{ label: "Instagram", href: "/admin/instagram", icone: IconeInstagram }`, ícone SVG inline no padrão dos outros)
- Test: `tests/unidade/instagram-editor.test.ts` (funções puras do editor: montar payload do formulário e pré-preencher padrões)

**Interfaces:**
- Consumes: ações e queries da Task 10, `TEXTOS_PADRAO`.
- Produces: editor na ordem do §6.1 (seções numeradas como no ManyChat e nos esboços aprovados); grade de publicações via `listarPublicacoes`; contador de caracteres nos campos com limite; prévia de celular ao lado reproduzindo a sequência (1ª DM com botão → [seguir] → link → lembrete); lista com nome, publicação (miniatura), palavras, liga/pausa (`alternarAutomacao`) e excluir com `ConfirmarAcao`; `useGuardaAlteracoes` no editor; erros via `useToast`. Corretor que digita a URL é redirecionado ao CRM pela guarda do layout (a sidebar não filtra por papel — comportamento atual do projeto).
- [ ] **Step 1: Failing tests**: `formularioParaPayload` (em `lib/instagram/formulario.ts`) converte "Avaliar, simular , " em `["Avaliar","simular"]` e "qualquer palavra" em `null`; `automacaoNova()` vem com `TEXTOS_PADRAO`, `lembreteHoras: 2`, `responderPublico: true`, `exigirSeguir: false`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** (carregar `frontend-design` e `ui-ux-pro-max` antes). **Step 4: Run** — PASS; `npm run build` sem erro.
- [ ] **Step 5: Verificar no navegador** com `npm run dev` (um servidor só). O `.env.local` aponta para o banco de **produção**: conferir layout, validações e prévia **sem salvar**. Salvar de verdade fica para o dono, na Etapa 6.
- [ ] **Step 6: Commit** `feat(instagram): telas de automação no /admin`.

### Task 13: Caixa de entrada

**Files:**
- Create: `app/admin/(protected)/instagram/page.tsx`, `components/admin/instagram/CaixaEntrada.tsx`, `ResumoDoDia.tsx`, `ListaContatos.tsx`, `ConversaContato.tsx`, `lib/instagram/etiquetas.ts`
- Test: `tests/unidade/instagram-etiquetas.test.ts`

**Interfaces:**
- Consumes: `caixaDeEntrada`, `conversa`, `resumoDoDia`, `excluirContato`.
- Produces `etiquetas.ts`: `etiquetaDaSituacao(p: { situacao: Situacao; comentarios: number; falhaMotivo: string | null; lembreteEm: string | null }): { texto: string; tom: "neutro" | "andamento" | "sucesso" | "erro" }` — falha vence tudo ("falha: <motivo>", erro); `comentarios >= 3` → "comentou 3+ vezes"; `aguardando_botao` → "esperando o toque no botão"; `aguardando_seguir` → "não segue ainda"; `link_enviado` → "recebeu o link, não abriu" + " · lembrete às HH:MM" quando houver; `link_aberto` → "abriu o link" (sucesso).
  - Tela conforme esboço aprovado (`caixa-entrada-v2`): números do dia no topo (falhas em `--erro`), filtros por automação e situação (na URL, como o CRM), lista à esquerda, conversa à direita com direção visível (pessoa / sistema / "você, pelo app"), linha de sistema para link aberto, link "abrir no Instagram ↗" (`https://ig.me/m/<username>` quando houver username), botão "Excluir dados deste contato" com `ConfirmarAcao`. **Sem campo de resposta.** Estado vazio explicando que a caixa mostra só quem comentou uma palavra-chave.
- [ ] **Step 1: Failing tests** para cada caso de `etiquetaDaSituacao`, incluindo hora formatada em São Paulo.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** (skills de design carregadas). **Step 4: Run** — PASS; `npm run build` sem erro.
- [ ] **Step 5: Commit** `feat(instagram): caixa de entrada só de leitura`.

### Task 14: Documentação, variáveis e política de privacidade

**Files:**
- Modify: `.env.local.example`, `CLAUDE.md` (seção "### Instagram comentário → DM" em "Estado atual": rotas, tabelas, migrations 034/035, Vault, trava 503, regras de eco/idempotência; última migration passa a **035**; contagem de testes atualizada), `app/(site)/politica-de-privacidade/page.tsx`
- Test: `npm test`, `npx eslint .`, `npm run build`

- [ ] **Step 1: `.env.local.example`** com as 5 variáveis novas e um comentário por linha (onde obter; só servidor; `CRON_SECRET` igual ao segredo `ig_cron_secret` do Vault).
- [ ] **Step 2: Rascunho do parágrafo da política** (spec §7.12: o que é guardado, para quê, 12 meses, como pedir exclusão por DM ou e-mail). **Não publicar sozinho**: deixar o texto no PR marcado "aguarda aprovação do dono" e o orquestrador mostra ao dono antes do merge. `lib/legal.ts` não muda.
- [ ] **Step 3: Atualizar `CLAUDE.md`.**
- [ ] **Step 4: Run** `npm test` (1280 + novos passando, 1 *expected fail*), `npx eslint .` (zero erro e zero aviso), `npm run build` — tudo verde.
- [ ] **Step 5: Commit** `docs(instagram): variáveis, CLAUDE.md e política de privacidade`.

---

## Depois do código (fora deste plano, guiado pelo roteiro)

Etapas 4–6 do `C:\Repos-GIT\comentario-dm\ROTEIRO.md`: segredos do Vault (`ig_disparar_url`, `ig_cron_secret`), variáveis só no ambiente Production da Vercel, URL de redirecionamento e webhook no console da Meta, conectar a conta em `/admin/instagram/conexao/`, publicar o app, criar a primeira automação, teste com comentário real e só então desligar a automação equivalente no ManyChat.
