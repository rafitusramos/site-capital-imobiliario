# CRM Kanban — Especificação de implementação

Contrato de implementação do módulo de CRM em `/admin/crm`. Este documento é a
fonte da verdade para a Fase 2 (desenvolvimento em Sonnet 5). Onde ele conflitar
com o pedido original em inglês, este documento vence — as divergências foram
decididas com o Rafael e estão registradas em "Decisões travadas".

Branch: `feature/admin-crm-kanban`.

---

## 0. Ponto de partida

O CRM **não começa do zero**. A migration `002_leads_crm.sql` já modelou boa
parte do domínio:

| Já existe | Serve para |
|---|---|
| `leads` + protocolo sequencial `RT-2026-0001` | núcleo do card |
| `lead_financiamento`, `lead_home_equity`, `lead_imovel`, `lead_consorcio` (1:1) | campos por origem |
| `lead_status_historico` + trigger `log_lead_status_change` | trilha de auditoria e carimbo de transição |
| `lead_interacoes` | base da linha do tempo |
| `vw_leads_crm` | consulta consolidada |
| `leads.corretor_id` → `profiles` | responsável |
| `leads.utm` (jsonb) | atribuição de mídia |

Já verificado no código e no banco de produção:

- **0 leads, 0 interações, 0 histórico, 1 profile.** Não há dado a migrar —
  o modelo de etapas pode ser substituído sem transição.
- Os RPCs `criar_lead_*` (migration 003) **não passam `status`**; dependem do
  `default 'criado'`. Continuam funcionando desde que todo pipeline tenha a
  etapa `criado`.
- `lead_status`, `lead_tipos.ativo`, `lead_interacoes.agendado_para` e
  `lead_interacoes.concluido` **não são lidos por nenhum arquivo `.ts`/`.tsx`**.
  Podem ser alterados ou removidos à vontade.
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers` e `zod` já são
  dependências. **Nenhum pacote novo é necessário.**
- `components/admin/SidebarAdmin.tsx:62` já tem o item "CRM" com `href: null` e
  tooltip "Em breve" — é o slot desta feature.

### Decisões travadas

1. **Etapas exatamente como na spec.** Financiamento e Home Equity colapsam
   "Análise de Crédito" + "Crédito Aprovado" numa única "Pré-Aprovação".
2. **Criação manual de lead no CRM.** Sem isso a aba Consórcio nasce vazia
   permanentemente (não há formulário de consórcio no site).
3. **A lixeira arquiva.** Exclusão definitiva é uma ação separada, numa tela de
   arquivados.
4. **RLS por papel.** `admin` vê tudo; `corretor` vê os seus e os não atribuídos.
5. **Idioma pt-BR** em toda a interface, nos slugs e nos identificadores de
   código — o projeto inteiro é pt-BR.

### Fora de escopo (deliberado)

- **Lead score.** A spec marca como opcional. Com 0 leads convertidos não há
  base para calibrar peso nenhum; um score inventado agora só produziria um
  número em que ninguém confia. Reavaliar depois de ~100 leads fechados.
- **Notificação de lembrete por e-mail/WhatsApp.** A spec pede indicação visual
  no card, e é isso que será entregue. `lib/notificacoes/whatsapp.ts` existe e
  torna isso barato numa fase 2, mas exige decidir cadência e opt-out.
- **Editor de motivos/etapas na interface.** As tabelas são configuráveis por
  SQL. Uma tela de administração delas é fase 2.
- **Automações/workflows** (mover etapa dispara e-mail, etc.).

---

## 1. Especificação funcional

### 1.1 Pipelines

Um pipeline por origem, independentes. A integridade é garantida no banco por
chave estrangeira composta `(tipo, status)` — **um lead nunca pode ficar numa
etapa de outro pipeline**, nem por bug de aplicação.

| Financiamento | Home Equity | Consórcio | Imóveis |
|---|---|---|---|
| Criado | Criado | Criado | Criado |
| Simulação | Simulação | Apresentação | Qualificação |
| Pré-Aprovação | Pré-Aprovação | Proposta | Visita |
| Vistoria | Vistoria | Contrato | Proposta |
| Contrato | Contrato | Ganho | Contrato |
| Ganho | Ganho | Perdido | Ganho |
| Perdido | Perdido | | Perdido |
| | | | Não Qualificado |

Slugs: `criado`, `simulacao`, `pre-aprovacao`, `vistoria`, `contrato`, `ganho`,
`perdido`, `apresentacao`, `proposta`, `qualificacao`, `visita`,
`nao-qualificado`.

**Regra de transição:** qualquer etapa → qualquer etapa. Não há grafo de
transições permitidas. Mover de `ganho` de volta para `contrato` é permitido e
fica registrado — travar isso faria o operador brigar com a ferramenta em vez de
corrigir um clique errado. A única regra dura é a de motivo obrigatório.

### 1.2 Motivo obrigatório

Entrar em `perdido` ou `nao-qualificado` **exige** motivo. A validação vive na
função Postgres `mover_lead_crm`, não na interface — assim vale tanto para o
arrastar quanto para o `select` de etapa do formulário, sem duplicar regra.

Motivos iniciais: Preço, Crédito não aprovado, Sem resposta, Escolheu
concorrente, Lead inválido, Sem interesse, Orçamento, Duplicado, Outro.

"Preço" e "Orçamento" são distintos de propósito: o imóvel caro demais versus o
cliente sem capacidade. Escolher `outro` exige texto livre (mín. 5 caracteres).

### 1.3 Card

Mostra: nome completo, telefone, e-mail, data da última interação, data do
próximo lembrete. Mais, por decisão de design (§4): protocolo, valor do negócio,
responsável, tags, e a barra de tempo de etapa.

Dois botões circulares flutuantes no canto inferior direito: editar (lápis) e
arquivar (lixeira, com confirmação).

### 1.4 Fluxo de UX

```
/admin/crm                    → redireciona para /admin/crm/financiamento
/admin/crm/[origem]           → quadro da origem
/admin/crm/[origem]?lead=<id> → quadro com o modal do lead aberto
/admin/crm/arquivados         → leads arquivados: restaurar ou excluir
```

O lead aberto vive na URL. Isso dá link compartilhável para um lead, faz o botão
"voltar" fechar o modal, e permite recarregar a página sem perder onde se estava.

**Arrastar para uma coluna comum:** o card se move na hora (estado otimista), a
ação roda no servidor, um toast confirma. Se o servidor recusar, o card volta e
o toast explica o motivo.

**Arrastar para Perdido / Não Qualificado:** o card se move na hora e abre o
diálogo de motivo. Cancelar **desfaz o movimento** — o card volta para a coluna
de origem e nada é gravado.

**Mudar etapa pelo formulário:** o `select` de etapa dispara o mesmo diálogo de
motivo quando aplicável.

---

## 2. Banco de dados

Quatro migrations, aplicadas à mão no SQL Editor do Supabase, **nesta ordem**.
A numeração continua de onde a 013 parou.

### 2.1 `014_crm_pipelines.sql`

```sql
-- Etapas por pipeline. PK composta (tipo, slug) para que a FK em leads
-- consiga amarrar etapa ao tipo do lead.
create table public.crm_etapas (
  tipo         text not null references public.lead_tipos(slug) on delete cascade,
  slug         text not null,
  label        text not null,
  ordem        int  not null,
  cor_bg       text not null,
  cor_texto    text not null,
  is_inicial   boolean not null default false,
  is_final     boolean not null default false,
  is_ganho     boolean not null default false,
  exige_motivo boolean not null default false,
  sla_dias     int,            -- dias saudáveis na etapa; alimenta a barra de tempo
  ativo        boolean not null default true,
  primary key (tipo, slug)
);
create unique index uq_crm_etapa_inicial
  on public.crm_etapas (tipo) where is_inicial;
```

Seeds — cores derivadas da paleta do admin (`app/admin/admin.css`), todas com
contraste ≥ 4.5:1 entre `cor_texto` e `cor_bg`:

| slug | label | cor_bg | cor_texto | sla_dias |
|---|---|---|---|---|
| `criado` | Criado | `#E9E5DA` | `#4A4437` | 1 |
| `simulacao` | Simulação | `#F0E2C8` | `#6B4E22` | 3 |
| `qualificacao` | Qualificação | `#F0E2C8` | `#6B4E22` | 2 |
| `apresentacao` | Apresentação | `#F0E2C8` | `#6B4E22` | 3 |
| `pre-aprovacao` | Pré-Aprovação | `#D8E6DC` | `#1C4633` | 7 |
| `visita` | Visita | `#BFD9C8` | `#143728` | 5 |
| `vistoria` | Vistoria | `#BFD9C8` | `#143728` | 10 |
| `proposta` | Proposta | `#D8E6DC` | `#1C4633` | 5 |
| `contrato` | Contrato | `#1F6B4E` | `#FFFFFF` | 15 |
| `ganho` | Ganho | `#0A241C` | `#E8D9B8` | — |
| `perdido` | Perdido | `#F3DEDA` | `#7A2E22` | — |
| `nao-qualificado` | Não Qualificado | `#E4E1DB` | `#55504A` | — |

`nao-qualificado` é neutro de propósito: não qualificar não é fracasso, é
filtro. Pintar de vermelho junto com "perdido" contaria a história errada.

```sql
create table public.crm_motivos_perda (
  slug  text primary key,
  label text not null,
  ordem int not null default 0,
  ativo boolean not null default true
);

-- Ativa a aba de Consórcio (hoje ativo = false e sem formulário no site;
-- os leads entram pela criação manual).
update public.lead_tipos set ativo = true where slug = 'consorcio';

-- Troca do modelo de status global pelo modelo por pipeline.
alter table public.leads drop constraint leads_status_fkey;
alter table public.leads
  add constraint leads_etapa_fkey
  foreign key (tipo, status) references public.crm_etapas (tipo, slug);

-- O histórico deixa de referenciar lead_status (que será removida).
alter table public.lead_status_historico
  drop constraint lead_status_historico_status_anterior_fkey,
  drop constraint lead_status_historico_status_novo_fkey,
  add column motivo_perda text references public.crm_motivos_perda(slug),
  add column motivo_obs   text;

drop view if exists public.vw_leads_crm;   -- recriada na 015
drop table public.lead_status;

alter table public.leads
  add column motivo_perda text references public.crm_motivos_perda(slug),
  add column motivo_obs   text,
  add column favorito     boolean not null default false,
  add column arquivado_em timestamptz,
  add column arquivado_por uuid references public.profiles(id),
  add column campos_extras jsonb not null default '{}'::jsonb;

create index idx_leads_quadro
  on public.leads (tipo, status) where arquivado_em is null;
create index idx_leads_arquivados
  on public.leads (arquivado_em) where arquivado_em is not null;
```

> **Armadilha:** `leads.status` continua se chamando `status`, mas agora
> significa "etapa dentro do pipeline do tipo". Renomear a coluna quebraria os
> três RPCs `criar_lead_*` e a `vw_leads_crm` sem ganho real. O nome fica; o
> significado está documentado aqui e num `comment on column`.

### 2.2 `015_crm_interacoes_lembretes.sql`

```sql
-- Domínio de tipos de interação, no mesmo padrão que a 011 usou para
-- imovel_tipos: normaliza o antigo CHECK de texto numa tabela.
create table public.crm_interacao_tipos (
  slug  text primary key,
  label text not null,
  icone text not null,     -- slug do catálogo em components/admin/crm/icones.tsx
  ordem int not null default 0,
  ativo boolean not null default true
);
```

Seeds: `ligacao` (Ligação), `whatsapp` (WhatsApp), `email` (E-mail), `reuniao`
(Reunião), `visita` (Visita), `proposta` (Proposta), `contrato` (Contrato),
`nota` (Nota geral), `sistema` (Sistema — reservado para o log automático).

```sql
alter table public.lead_interacoes
  drop constraint lead_interacoes_tipo_check,
  add constraint lead_interacoes_tipo_fkey
    foreign key (tipo) references public.crm_interacao_tipos(slug),
  add column automatica boolean not null default false,
  -- O lembrete vira tabela própria; estas duas colunas duplicariam a regra.
  drop column agendado_para,
  drop column concluido;

create table public.crm_lembretes (
  id            uuid primary key default uuid_generate_v4(),
  lead_id       uuid not null references public.leads(id) on delete cascade,
  interacao_id  uuid references public.lead_interacoes(id) on delete set null,
  agendado_para timestamptz not null,
  descricao     text not null,
  concluido     boolean not null default false,
  concluido_em  timestamptz,
  concluido_por uuid references public.profiles(id) on delete set null,
  criado_por    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index idx_lembretes_pendentes
  on public.crm_lembretes (lead_id, agendado_para) where not concluido;
```

**Por que tabela separada e não `lead_interacoes.agendado_para`:** a spec dá ao
lembrete uma descrição própria, distinta da nota da interação, e `concluido`
numa interação confundiria "o contato aconteceu" com "o follow-up foi feito".
Um lead também pode ter mais de um lembrete aberto.

**Linha do tempo** — une interações, transições de etapa e lembretes numa
única lista cronológica, sem duplicar linha em lugar nenhum:

```sql
create view public.vw_crm_timeline as
  select li.lead_id, li.created_at as ocorrido_em, 'interacao' as natureza,
         li.tipo, t.label as tipo_label, li.conteudo as corpo,
         li.automatica, li.autor_id, p.full_name as autor_nome
    from public.lead_interacoes li
    join public.crm_interacao_tipos t on t.slug = li.tipo
    left join public.profiles p on p.id = li.autor_id
  union all
  select h.lead_id, h.created_at, 'etapa',
         h.status_novo, e.label, coalesce(h.motivo_obs, h.observacao),
         true, h.alterado_por, p.full_name
    from public.lead_status_historico h
    left join public.leads l on l.id = h.lead_id
    left join public.crm_etapas e on e.tipo = l.tipo and e.slug = h.status_novo
    left join public.profiles p on p.id = h.alterado_por;
```

**Quadro** — uma consulta serve o board inteiro. O `left join lateral` traz o
próximo lembrete sem N+1, e o filtro de arquivados mora **na view**, não em cada
consulta, para não haver como esquecer.

> A `vw_leads_crm` é criada **no fim da `016`**, não aqui na `015`: ela
> referencia `lead_tags` e `lead_imovel.orcamento_max`, que só existem depois da
> `016`. Criá-la antes quebra com *relation "lead_tags" does not exist*. A
> `vw_crm_timeline` acima não tem essa dependência e fica mesmo na `015`.

```sql
create view public.vw_leads_crm as
select
  l.id, l.protocolo, l.nome, l.email, l.telefone, l.cpf,
  l.tipo, t.label as tipo_label,
  l.status, e.label as etapa_label, e.cor_bg, e.cor_texto,
  e.ordem as etapa_ordem, e.is_final, e.is_ganho, e.exige_motivo, e.sla_dias,
  l.origem, l.pagina_url, l.imovel_id, i.titulo as imovel_titulo,
  l.corretor_id, p.full_name as corretor_nome,
  l.favorito, l.motivo_perda, l.utm,
  l.created_at, l.status_alterado_em, l.updated_at,
  extract(day from now() - l.status_alterado_em)::int as dias_na_etapa,
  ult.ultima_interacao_em,
  prox.agendado_para as proximo_lembrete_em,
  prox.descricao     as proximo_lembrete_desc,
  coalesce(tg.tags, '{}') as tags,
  (select count(*) from public.lead_interacoes li where li.lead_id = l.id) as total_interacoes,
  coalesce(fin.valor_credito, he.valor_credito_desejado,
           cons.valor_carta, im.orcamento_max) as valor_negocio
from public.leads l
join public.lead_tipos t on t.slug = l.tipo
join public.crm_etapas e on e.tipo = l.tipo and e.slug = l.status
left join public.imoveis  i on i.id = l.imovel_id
left join public.profiles p on p.id = l.corretor_id
left join public.lead_financiamento fin on fin.lead_id = l.id
left join public.lead_home_equity   he  on he.lead_id  = l.id
left join public.lead_consorcio     cons on cons.lead_id = l.id
left join public.lead_imovel        im  on im.lead_id  = l.id
left join lateral (
  select max(li.created_at) as ultima_interacao_em
    from public.lead_interacoes li where li.lead_id = l.id
) ult on true
left join lateral (
  select lb.agendado_para, lb.descricao
    from public.crm_lembretes lb
   where lb.lead_id = l.id and not lb.concluido
   order by lb.agendado_para asc limit 1
) prox on true
left join lateral (
  select array_agg(lt.tag_slug order by lt.tag_slug) as tags
    from public.lead_tags lt where lt.lead_id = l.id
) tg on true
where l.arquivado_em is null;
```

### 2.3 `016_crm_campos_e_tags.sql`

Campos que a spec pede e que ainda não existem. Financiamento **já tem todos**
(`valor_imovel`, `valor_entrada`, `renda_mensal`, `valor_credito`,
`banco_simulado`, `prazo_meses`) — nenhuma coluna nova.

```sql
alter table public.lead_home_equity
  add column situacao_imovel text;      -- quitado | financiado | alienado | inventario

alter table public.lead_consorcio
  add column segmento     text,          -- imovel | veiculo | servicos
  add column grupo        text,
  add column contemplacao text;          -- nao-contemplado | em-lance | contemplado

alter table public.lead_imovel
  add column imovel_desejado  text,      -- texto livre p/ imóvel fora do catálogo
  add column orcamento_max    numeric(14,2),
  add column cidade_preferida text,
  add column dormitorios_min  int,
  add column tipo_imovel      text;

create table public.crm_tags (
  slug  text primary key,
  label text not null,
  cor   text not null default '#8A6C48',
  ordem int not null default 0,
  ativo boolean not null default true
);

create table public.lead_tags (
  lead_id  uuid not null references public.leads(id) on delete cascade,
  tag_slug text not null references public.crm_tags(slug) on delete cascade,
  primary key (lead_id, tag_slug)
);
create index idx_lead_tags_tag on public.lead_tags (tag_slug);
```

Nota: **Loan-to-Value não é coluna.** É `valor_credito_desejado /
valor_imovel_garantia`, calculado em `lib/crm/calculos.ts`. Gravar um derivado
cria a chance de ele discordar das duas parcelas que o originam.

Registro de exclusão definitiva, para que apagar dado a pedido do titular seja
comprovável sem guardar dado pessoal nenhum:

```sql
create table public.crm_exclusoes (
  id         uuid primary key default uuid_generate_v4(),
  protocolo  text not null,
  tipo       text not null,
  excluido_por uuid references public.profiles(id) on delete set null,
  motivo     text,
  created_at timestamptz not null default now()
);
```

### 2.4 `017_crm_funcoes_rls.sql`

```sql
-- search_path fixo: sem isso, uma função SECURITY DEFINER pode ser levada a
-- resolver "profiles" numa schema plantada pelo chamador.
create or replace function public.eh_admin()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.role = 'admin'
  );
$$;
```

**Movimentação de lead** — `security invoker`, de propósito: a RLS continua
valendo dentro da função. Ela não é um jeito de escapar da política, é o lugar
onde a regra de motivo é imposta uma vez só.

```sql
create or replace function public.mover_lead_crm(
  p_lead_id uuid, p_etapa text, p_motivo text default null,
  p_motivo_obs text default null, p_updated_at timestamptz default null
) returns public.leads
language plpgsql security invoker
set search_path = public, pg_temp
as $$
declare v_lead public.leads; v_etapa public.crm_etapas;
begin
  select * into v_lead from public.leads where id = p_lead_id for update;
  if not found then raise exception 'LEAD_NAO_ENCONTRADO'; end if;

  -- Concorrência otimista: duas abas abertas não se sobrescrevem em silêncio.
  if p_updated_at is not null and v_lead.updated_at <> p_updated_at then
    raise exception 'LEAD_DESATUALIZADO';
  end if;

  select * into v_etapa from public.crm_etapas
   where tipo = v_lead.tipo and slug = p_etapa and ativo;
  if not found then raise exception 'ETAPA_INVALIDA'; end if;

  if v_lead.status = p_etapa then return v_lead; end if;   -- no-op, sem histórico

  if v_etapa.exige_motivo then
    if p_motivo is null then raise exception 'MOTIVO_OBRIGATORIO'; end if;
    if p_motivo = 'outro' and coalesce(length(trim(p_motivo_obs)), 0) < 5 then
      raise exception 'MOTIVO_OBS_OBRIGATORIA';
    end if;
  end if;

  update public.leads
     set status = p_etapa,
         motivo_perda = case when v_etapa.exige_motivo then p_motivo else null end,
         motivo_obs   = case when v_etapa.exige_motivo then p_motivo_obs else null end
   where id = p_lead_id
   returning * into v_lead;

  return v_lead;
end;
$$;
```

O trigger `log_lead_status_change` já existente cuida de gravar o histórico e de
atualizar `status_alterado_em`. Ele passa a copiar `new.motivo_perda` /
`new.motivo_obs` para a linha do histórico, para que o motivo fique preso ao
momento da transição e não só ao estado atual do lead.

`registrar_interacao_crm(p_lead_id, p_tipo, p_conteudo, p_lembrete_em,
p_lembrete_desc)` grava interação e lembrete numa transação só — sem isso é
possível salvar a nota e perder o follow-up.

**RLS.** As policies antigas precisam ser **removidas**, não apenas
complementadas:

```sql
-- Policies do mesmo comando se combinam por OR. Deixar "leads_admin_all"
-- (auth.role() = 'authenticated') no lugar anularia toda a regra por papel
-- abaixo, silenciosamente.
drop policy "leads_admin_all"       on public.leads;
drop policy "lead_fin_admin_all"    on public.lead_financiamento;
drop policy "lead_he_admin_all"     on public.lead_home_equity;
drop policy "lead_imovel_admin_all" on public.lead_imovel;
drop policy "lead_cons_admin_all"   on public.lead_consorcio;
drop policy "lead_hist_admin_read"  on public.lead_status_historico;
drop policy "lead_inter_admin_all"  on public.lead_interacoes;

-- Lead sem responsável fica visível para todos: todo lead vindo do site nasce
-- com corretor_id nulo, e sem esta cláusula o corretor não enxergaria
-- justamente os leads novos que precisa atender.
create policy "leads_visiveis" on public.leads for all
  using (public.eh_admin() or corretor_id = auth.uid() or corretor_id is null);
```

As tabelas filhas herdam por `exists (select 1 from public.leads l where
l.id = <t>.lead_id and (public.eh_admin() or l.corretor_id = auth.uid() or
l.corretor_id is null))`. Tabelas de domínio (`crm_etapas`,
`crm_motivos_perda`, `crm_interacao_tipos`, `crm_tags`) têm leitura para
autenticados e escrita só para `eh_admin()`.

**Reatribuição de responsável é trigger, não policy.** `with check` só enxerga a
linha nova, e "assumi um lead livre" e "larguei o meu lead" produzem linhas
igualmente válidas — a diferença está na linha *antiga*. O trigger
`trg_leads_atribuicao` (`before update of corretor_id`) impõe a regra:

| Transição de `corretor_id` | Corretor | Admin |
|---|---|---|
| `null` → ele mesmo (assumir lead livre) | permitido | permitido |
| ele mesmo → `null` (largar o próprio lead) | **bloqueado** | permitido |
| ele mesmo → outro (repassar) | **bloqueado** | permitido |
| inalterado (mexer em lead sem dono) | permitido | permitido |

A última linha é o motivo de não haver auto-claim: o corretor precisa poder
mover etapa e anotar num lead ainda sem dono sem ser obrigado a assumi-lo.

---

## 3. Arquitetura de aplicação

### 3.1 Estrutura de arquivos

```
app/admin/(protected)/crm/
  layout.tsx                 abas de origem + contagem por aba
  page.tsx                   redirect → /admin/crm/financiamento
  [origem]/page.tsx          server component: carrega o quadro
  [origem]/loading.tsx       esqueleto do quadro
  arquivados/page.tsx        restaurar ou excluir definitivamente

app/actions/admin-crm.ts     todas as server actions do módulo

lib/queries/admin-crm.ts     leitura (server-only)
lib/crm/etapas.ts            pipelines, rótulos, helpers de etapa
lib/crm/campos.ts            descritores de campo por origem  ← extensibilidade
lib/crm/calculos.ts          LTV, valor do negócio, soma da coluna
lib/crm/lembretes.ts         atraso, formatação relativa, fuso
lib/crm/filtros.ts           busca/filtro/ordenação em memória (puro, testável)
lib/validations/crm.ts       schemas Zod

components/admin/crm/
  QuadroCRM.tsx              client: DndContext, estado, otimismo
  ColunaEtapa.tsx            coluna droppable
  CardLead.tsx               card draggable
  AcoesCard.tsx              os dois botões circulares
  BarraFiltros.tsx           busca, responsável, tag, atrasados, ordenação
  ModalLead.tsx              casca do diálogo (foco preso, Esc, aria)
  PainelComum.tsx            lado esquerdo
  PainelOrigem.tsx           lado direito, dirigido por campos.ts
  LinhaDoTempo.tsx           histórico unificado
  NovaInteracao.tsx          composer + lembrete opcional
  DialogoMotivo.tsx          motivo obrigatório
  ConfirmarAcao.tsx          confirmação reutilizável
  EstadoVazio.tsx
  icones.tsx                 catálogo SVG (sem emoji, padrão do projeto)

components/admin/Toaster.tsx  + lib/admin/toast.ts   (novo, usado por todo o admin)
```

### 3.2 Fronteira servidor/cliente e estado

Sem Redux, sem Zustand, sem React Query. React 19 já dá o necessário:

- `[origem]/page.tsx` é **server component**: uma consulta a `vw_leads_crm`
  filtrada por tipo, mais as listas de domínio (etapas, motivos, tags,
  corretores). Passa tudo pronto ao cliente.
- `QuadroCRM` é **client component** com `useReducer` sobre a lista de leads.
  Busca, filtro e ordenação acontecem **em memória** (`lib/crm/filtros.ts`) —
  resposta instantânea, sem round-trip por tecla digitada.
- Mover card usa **`useOptimistic`**: o card salta de coluna imediatamente,
  a server action confirma, e o `catch` reverte com toast de erro.
- Depois de cada mutação bem-sucedida, `revalidatePath('/admin/crm/[origem]',
  'page')` para que um F5 conte a verdade.
- **A linha do tempo não vem com o quadro.** É carregada sob demanda ao abrir o
  modal. Trazer todas as interações de todos os leads no payload do board é o
  jeito mais rápido de tornar a página lenta.

### 3.3 Drag and drop

`@dnd-kit/core` — já no projeto e já usado em `GaleriaImovel.tsx`.

- `useDraggable` no card, `useDroppable` na coluna. **Não** `useSortable`: não
  há ordenação manual dentro da coluna (a ordem é uma regra de negócio, exposta
  como controle de ordenação).
- Detecção de colisão `pointerWithin`, com `rectIntersection` de reserva.
  `closestCenter` erra quando os alvos têm tamanhos muito diferentes, que é
  exatamente o caso de colunas altas.
- Sensores: `PointerSensor` com `activationConstraint: { distance: 6 }` — sem
  isso, clicar no botão de editar dispara um arrasto.
- `KeyboardSensor` habilitado: espaço pega, setas movem, espaço solta.
- `DragOverlay` renderiza o card em movimento, para ele não ser cortado pelo
  `overflow` da coluna.
- **Abaixo de 768px o arrasto é desligado.** Arrastar dentro de um contêiner com
  rolagem horizontal em toque é uma experiência ruim de verdade; nessa largura a
  mudança de etapa é feita pelo `select` do formulário, que é o caminho acessível
  que a spec já exige.

### 3.4 Extensibilidade de campos

Sem construtor de formulários e sem tabela de metacampos. O painel direito é
renderizado a partir de um descritor em `lib/crm/campos.ts`:

```ts
export type CampoCRM = {
  chave: string;
  label: string;
  tipo: "moeda" | "numero" | "percentual" | "texto" | "textarea" | "select" | "booleano" | "data";
  fonte: "coluna" | "extra";     // coluna tipada  |  leads.campos_extras (jsonb)
  opcoes?: { valor: string; label: string }[];
  ajuda?: string;
  somenteLeitura?: boolean;      // veio do simulador; editar apagaria o que o cliente respondeu
  calculado?: (dados: Record<string, unknown>) => string;  // ex.: LTV
};

export const CAMPOS_POR_ORIGEM: Record<LeadTipoSlug, CampoCRM[]> = { /* ... */ };
```

Adicionar campo novo = **uma entrada no array**. Com `fonte: "extra"` ele grava
em `leads.campos_extras` e não precisa de migration nenhuma. Campos que merecem
índice, soma ou filtro são promovidos a coluna depois, quando o uso justificar.

`PainelOrigem.tsx` percorre o descritor e renderiza; não conhece nenhuma origem
em particular.

### 3.5 Server actions (a "API")

O projeto não tem route handlers no admin — tudo é server action. Mantido.
Todas retornam `AcaoResultado` (o tipo já existente em
`app/actions/admin-parametros.ts`), todas revalidam `auth.getUser()`, todas usam
`createClient()` (anon + cookies, RLS aplicada).

| Ação | Entrada | Regras |
|---|---|---|
| `moverLead` | `leadId, etapa, motivo?, motivoObs?, updatedAt` | RPC `mover_lead_crm`; traduz `MOTIVO_OBRIGATORIO`, `ETAPA_INVALIDA`, `LEAD_DESATUALIZADO` em mensagem pt-BR |
| `criarLead` | comum + origem | cria `leads` + linha de detalhe da origem; etapa = `is_inicial` do pipeline |
| `atualizarLead` | comum + origem + extras | upsert na tabela de detalhe (lead manual pode não ter linha) |
| `arquivarLead` / `restaurarLead` | `leadId` | grava/limpa `arquivado_em` + `arquivado_por` |
| `excluirLead` | `leadId, motivo?` | só `admin`; grava `crm_exclusoes` antes do delete em cascata |
| `registrarInteracao` | `leadId, tipo, conteudo, lembrete?` | RPC transacional |
| `concluirLembrete` / `reagendarLembrete` | `lembreteId[, novaData]` | |
| `alternarFavorito` | `leadId` | |
| `definirTags` | `leadId, slugs[]` | máx. 8; substitui o conjunto |
| `atribuirResponsavel` | `leadId, corretorId \| null` | só `admin` |

> **Armadilha do projeto, aplicada aqui:** todo `update` termina em `.select()`
> e o resultado é conferido. Um `UPDATE` que não casa linha nenhuma é sucesso no
> Postgres — e sob RLS isso deixa de ser hipótese: é exatamente o que acontece
> quando um corretor tenta mexer num lead que não é dele. Sem conferir o retorno,
> a interface diria "salvo" e nada teria sido salvo.

### 3.6 Validação (`lib/validations/crm.ts`)

Reaproveita `telefoneValido` e `cpfValido` de `lib/financeiro.ts` e o padrão de
normalização de `lib/validations/lead.ts` (tira máscara, valida no servidor,
não confia na formatação do cliente).

| Campo | Regra |
|---|---|
| `nome` | trim, mín. 3 |
| `email` | e-mail válido |
| `telefone` | `telefoneValido`, gravado só com dígitos |
| `cpf` | opcional, `cpfValido` |
| `etapa` | precisa existir em `crm_etapas` para o `tipo` do lead (checado no banco) |
| `motivo` | obrigatório quando `exige_motivo`; `motivoObs` mín. 5 quando motivo = `outro` |
| valores monetários | `>= 0`, `<= 999.999.999,99`, duas casas |
| `prazo_meses` | inteiro, 1–420 |
| `dormitorios_min` | inteiro, 0–20 |
| `lembrete.agendado_para` | futuro na criação; passado permitido só ao reagendar |
| `lembrete.descricao` | mín. 3, máx. 200 |
| `interacao.conteudo` | mín. 1, máx. 5000 |
| tags | máx. 8 por lead, slugs precisam existir |

---

## 4. Design

Direção do site: "Minimalismo Exagerado", preto quente + bronze-dourado. O admin
não carrega `styles/lp.css` — usa a paleta mínima de `app/admin/admin.css` e
as fontes Archivo (`--sans`) e IBM Plex Mono (`--mono`), **ambas já carregadas**
em `app/admin/layout.tsx`. Nenhuma fonte nova.

### O elemento de assinatura: a barra de tempo

Intermediação de crédito é um negócio governado por relógio. Uma aprovação
vence, um lead esfria, e a pergunta que decide a próxima ação quase nunca é
"quem é esse?" — é "há quanto tempo isso está parado aqui?".

Cada card carrega, na borda esquerda, uma régua vertical de 3px cuja cor vem de
`dias_na_etapa` contra o `sla_dias` da etapa:

| Estado | Condição | Cor |
|---|---|---|
| No prazo | `dias ≤ sla` | `--jade` `#1F6B4E` |
| Atenção | `sla < dias ≤ 2×sla` | `--bronze` `#8A6C48` |
| Parado | `dias > 2×sla` | `--erro` `#8A3B2E` |

É o único acento cromático do card. Todo o resto é tipografia e espaço em
branco. Um quadro saudável é uma parede de traços verdes; um quadro em apuros se
lê de longe sem ninguém precisar abrir nada.

**A cor nunca é a única informação:** o card também traz o texto "11 dias em
Simulação", e o cabeçalho de coluna soma quantos estão parados.

### Cabeçalho de coluna

```
┌──────────────────────────────┐
│ SIMULAÇÃO              7     │   label caixa alta, contagem em mono
│ R$ 4.320.000                 │   soma de valor_negocio, IBM Plex Mono
└──────────────────────────────┘
```

Dinheiro e tempo são as duas coisas de que este negócio vive; ambas ficam
legíveis sem abrir card nenhum. Os numerais em IBM Plex Mono alinham verticalmente
entre colunas — a fonte tabular é o que dá caráter de painel operacional sem
custar um byte a mais de download.

### Card

```
┌─┬────────────────────────────┐
│ │ RT-2026-0014      ★        │  protocolo mono 11px · favorito
│ │ Marina Albuquerque         │  nome, Archivo 500, 14px
│ │ (19) 99812-4477            │  mono 12px
│ │ marina@empresa.com.br      │  12px, truncado
│ │ ─────────────────────────  │
│ │ Últ. contato · há 3 dias   │  11px, tinta 60%
│ │ ⏰ Retorno hoje 14:00      │  11px — âmbar se hoje, erro se vencido
│ │ [capital de giro]  RT      │  tags + iniciais do responsável
│ │                     (✎)(🗑)│  botões circulares, canto inf. direito
└─┴────────────────────────────┘
   ↑ barra de tempo
```

- Largura fixa 288px, quadro com rolagem horizontal — colunas são o único lugar
  em que rolagem horizontal é a resposta certa.
- Densidade alta: padding 10px, gap 12px, escala de espaçamento 8/12/16/24/32.
- Os dois botões circulares (32×32, alvo efetivo 44×44 via `::before`) aparecem
  no hover **e no foco de teclado**, e ficam sempre visíveis abaixo de 1024px —
  interface que só existe no hover não existe no toque.
- Lembrete vencido: ícone + texto + cor. Nunca só a cor.

### Regras transversais

- Ícones SVG do catálogo local `icones.tsx`. Sem emoji — regra do projeto.
- Transições 150–200ms; `prefers-reduced-motion: reduce` zera as animações de
  card e mantém só a mudança de estado.
- Anel de foco visível em tudo que é interativo (`focus-visible:ring-2
  ring-[var(--jade)]`).
- Toasts num `role="status"` com `aria-live="polite"`; erros em `role="alert"`.
- O modal prende o foco, fecha com Esc, devolve o foco ao card de origem.
- Atalhos: `/` foca a busca, `n` novo lead, `Esc` fecha modal ou diálogo. Só
  isso — atalho que ninguém descobre é código morto.
- Verificado a 1440, 1280, 1024 e 375px.

---

## 5. Casos de borda

| # | Situação | Tratamento |
|---|---|---|
| 1 | Soltar o card na mesma coluna | No-op; a função retorna cedo, sem linha de histórico |
| 2 | Cancelar o diálogo de motivo | Estado otimista revertido; card volta; nada gravado |
| 3 | Duas abas abertas, lead movido na outra | `updated_at` viaja na ação; `LEAD_DESATUALIZADO` → toast "Este lead mudou em outra aba. Atualize a página." |
| 4 | Lead do site nasce sem `corretor_id` | RLS inclui `corretor_id is null`; sem isso o corretor não veria lead novo nenhum |
| 5 | Lead criado à mão não tem linha de detalhe | `atualizarLead` faz upsert, nunca update seco |
| 6 | Lead arquivado ainda aparece | Filtro `arquivado_em is null` mora na view, não nas consultas |
| 7 | Mudar etapa pelo formulário, não arrastando | Mesmo RPC, mesma exigência de motivo |
| 8 | Lembrete "hoje 14:00" perto da meia-noite | `timestamptz` no banco; atraso e rótulo calculados em `America/Sao_Paulo` |
| 9 | Excluir lead com lembrete e histórico | Cascata; `crm_exclusoes` guarda protocolo e autor, sem dado pessoal |
| 10 | Coluna com centenas de cards | Teto de 500 por coluna com "carregar mais"; a contagem do cabeçalho vem de agregação separada e continua verdadeira |
| 11 | Nome ou e-mail muito longo | `truncate` + `title` com o valor inteiro |
| 12 | Voltar de `ganho` para `contrato` | Permitido e registrado no histórico |
| 13 | Sequência de protocolo na virada do ano | `RT-2027-0042` continua a numeração; a sequência é global. Não é bug — está documentado |
| 14 | Etapa desativada com leads dentro | A coluna continua aparecendo enquanto tiver lead, marcada como inativa; não some com lead dentro |

---

## 6. Desempenho

- **Uma consulta por quadro.** Os `left join lateral` de última interação e
  próximo lembrete eliminam o N+1 óbvio; as tags vêm por `array_agg`.
- Índice parcial `idx_leads_quadro (tipo, status) where arquivado_em is null`
  cobre exatamente o predicado do board.
- Busca e filtro em memória: zero round-trip por tecla.
- Linha do tempo sob demanda, ao abrir o modal.
- Sem virtualização por ora — abaixo de ~500 cards por coluna ela custa mais
  complexidade do que devolve. O teto de 500 é o gatilho para reavaliar.
- `loading.tsx` com esqueleto de colunas, para o quadro não piscar em branco.

## 7. Segurança

- **As duas views precisam de `security_invoker = on`** (migration 018). Uma view
  no Postgres roda com os privilégios de **quem a criou**, não de quem consulta.
  Sem essa opção, `vw_leads_crm` — a única consulta que o quadro usa — ignorava
  por completo a policy `leads_visiveis`, e todo o modelo de permissão da 017 era
  decorativo. Foi apanhado pelo linter do Supabase depois de aplicar em produção;
  qualquer view nova sobre `leads` precisa nascer com a opção ligada.
- **`SUPABASE_SERVICE_ROLE_KEY` não entra em lugar nenhum deste módulo.** Toda
  ação usa `createClient()` (anon + cookies) para que a RLS seja a autoridade.
  `createAdminClient()` não é importado no CRM.
- `eh_admin()` é `security definer` com `search_path` fixo em `public, pg_temp`.
- `mover_lead_crm` e `registrar_interacao_crm` são `security invoker`: elas
  impõem regra de negócio, não contornam permissão.
- As sete policies permissivas da migration 002 são **removidas** na 017.
  Policies do mesmo comando se combinam por OR — deixar uma delas anularia todo
  o modelo por papel sem erro nenhum aparente.
- Cada action reconfirma `auth.getUser()`; o middleware e o layout protegido já
  barram a rota, mas server action é endpoint público até provar o contrário.
- `/admin` continua `noindex` e sem nenhuma tag de medição (`Tags` só é montado
  no layout do site).
- LGPD: arquivar preserva o dado; a exclusão definitiva é o mecanismo de
  atendimento a pedido de eliminação, e fica provável por `crm_exclusoes`.

## 8. Testes (Vitest)

A suíte atual tem 367 passando + 1 *expected fail* intencional, que **continua
existindo**.

| Arquivo | Cobre |
|---|---|
| `tests/validacoes/crm.test.ts` | schemas Zod, motivo obrigatório, limites monetários |
| `tests/unidade/crm-etapas.test.ts` | integridade dos 4 pipelines, etapa inicial única, quais exigem motivo |
| `tests/unidade/crm-lembretes.test.ts` | atraso, rótulo relativo, virada de dia em `America/Sao_Paulo` |
| `tests/unidade/crm-calculos.test.ts` | LTV, valor do negócio por origem, soma de coluna |
| `tests/unidade/crm-filtros.test.ts` | busca, filtros combinados, ordenações |
| `tests/acoes/admin-crm.test.ts` | ações com `tests/apoio/supabase-falso.ts`: sessão expirada, update sem linha afetada, tradução dos erros do RPC |

---

## 9. Ordem de execução (Fase 2)

1. Migrations 014 → 017, aplicadas à mão no SQL Editor, na ordem. Conferir cada
   uma antes da seguinte.
2. `types/database.ts` atualizado à mão (convenção do projeto): remover
   `LeadStatusSlug`/`lead_status`, acrescentar `crm_etapas`, `crm_lembretes`,
   `crm_tags`, `lead_tags`, `crm_motivos_perda`, `crm_interacao_tipos`,
   `crm_exclusoes`, as views e as novas funções.
3. `lib/crm/*` + `lib/validations/crm.ts` + testes unitários — camada pura,
   testável sem banco.
4. `lib/queries/admin-crm.ts` e `app/actions/admin-crm.ts` + testes de ação.
5. `Toaster` e `ConfirmarAcao` (utilitários novos de admin, úteis fora do CRM).
6. Quadro: `[origem]/page.tsx`, `QuadroCRM`, `ColunaEtapa`, `CardLead`,
   `BarraFiltros`, `loading.tsx`, estado vazio.
7. Modal: `ModalLead`, `PainelComum`, `PainelOrigem`, `LinhaDoTempo`,
   `NovaInteracao`, `DialogoMotivo`.
8. Criação manual, arquivados, exclusão definitiva.
9. Ligar o item "CRM" em `SidebarAdmin.tsx` (`href: "/admin/crm"`, remover o
   estado "Em breve").
10. `npm test` e `npm run build` limpos; atualizar `CLAUDE.md` com a seção do
    CRM e as armadilhas novas.

### O que não pode quebrar

- Os três RPCs `criar_lead_*` — são a captação do site inteiro. Depois da 014,
  enviar um formulário de cada simulador e confirmar que o lead aparece na
  coluna Criado da aba certa.
- Nenhum slug de URL pública muda. O CRM só acrescenta rotas sob `/admin`.
- `LeadFormShell`, `SimuladorFinanciamento`, `SimuladorHomeEquity` e
  `LeadImovelModal` não são tocados.
