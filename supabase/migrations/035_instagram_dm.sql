-- =====================================================================
-- 035_instagram_dm.sql
-- Módulo Instagram: comentário -> DM com botão, entrega de link e lembrete.
-- Base de dados: 8 tabelas ig_*, RLS e 4 funções.
--
-- NUMERAÇÃO: o plano previa 034, mas a 034 já é `post_revisado_em`.
--
-- POR QUE
-- Quem comenta uma palavra-chave num post recebe uma DM com botão; o clique
-- libera a janela de 24 h da Meta, e a partir dela o fluxo entrega o link
-- (opcionalmente exigindo que a pessoa siga a conta) e lembra a pessoa que
-- ficou pelo caminho. O disparador (cron + webhook) roda com a service role.
--
-- REGRAS
--   * Tudo é só do admin: RLS ligada, `revoke all ... from anon`, policies
--     `to authenticated` com public.eh_admin() (corretor não vê nada daqui).
--   * `ig_conta.token` NUNCA é concedido a authenticated: o grant de SELECT
--     é por coluna e deixa o token de fora. Só a service role o lê.
--   * `ig_eventos` não tem policy: só a service role (idempotência do webhook).
--   * Escrita pelo admin só em `ig_automacoes` (CRUD) e `delete` em
--     `ig_contatos` (exclusão de dados a pedido do titular). O resto é
--     escrito pela service role.
--   * `ig_envios` é a fila de saída; ig_reservar_envios reserva um lote com
--     `for update skip locked` (dois disparos simultâneos não pegam a mesma
--     linha) e recupera `processando` parado há mais de 5 minutos.
--   * set_updated_at() (001) grava `updated_at`, e aqui a coluna é
--     `atualizado_em`; por isso a função própria ig_set_atualizado_em().
--
-- Aplicada pelo workflow migrations-supabase (supabase db push), que já roda
-- cada arquivo numa transação: por isso não há begin/commit aqui.
--
-- COMO VERIFICAR: bloco comentado no fim deste arquivo.
-- COMO DESFAZER:  bloco comentado no fim deste arquivo.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Trigger de atualizado_em (set_updated_at grava updated_at, outra coluna).
-- ---------------------------------------------------------------------
create or replace function public.ig_set_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. ig_conta: singleton da conta Instagram conectada.
-- ---------------------------------------------------------------------
create table public.ig_conta (
  id                  smallint primary key default 1 check (id = 1),
  ig_user_id          text not null,
  username            text,
  nome                text,
  foto_url            text,
  token               text not null,
  webhooks_assinados  boolean not null default false,
  conectado_em        timestamptz not null default now(),
  conectado_por       uuid references public.profiles(id),
  ultimo_evento_em    timestamptz
);

-- ---------------------------------------------------------------------
-- 2. ig_automacoes: uma regra comentário -> DM.
-- ---------------------------------------------------------------------
create table public.ig_automacoes (
  id                    uuid primary key default gen_random_uuid(),
  nome                  text not null,
  slug                  text not null unique,
  ativa                 boolean not null default true,
  alvo                  text not null check (alvo in ('especifica', 'qualquer', 'proxima')),
  midia_id              text,
  midia_permalink       text,
  midia_thumb           text,
  proxima_desde         timestamptz,
  palavras              text[],                       -- null = qualquer palavra
  responder_publico     boolean not null default true,
  frases_publicas       text[] not null default '{}',
  dm1_texto             text not null,
  dm1_botao             text not null,
  exigir_seguir         boolean not null default false,
  seguir_texto          text not null,
  seguir_botao          text not null,
  seguir_insiste_texto  text not null,
  link_texto            text not null,
  link_botao            text not null,
  link_url              text not null,
  lembrete_ativo        boolean not null default true,
  lembrete_horas        int not null default 2 check (lembrete_horas between 1 and 23),
  lembrete_texto        text not null,
  retomada_botao_texto  text not null,
  retomada_seguir_texto text not null,
  retomada_link_texto   text not null,
  criado_por            uuid references public.profiles(id),
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now(),
  check (alvo <> 'especifica' or midia_id is not null),
  check (alvo <> 'proxima' or proxima_desde is not null)
);

create trigger trg_ig_automacoes_atualizado_em
  before update on public.ig_automacoes
  for each row execute function public.ig_set_atualizado_em();

-- ---------------------------------------------------------------------
-- 3. ig_contatos: quem interagiu (um por canal + igsid).
-- ---------------------------------------------------------------------
create table public.ig_contatos (
  id                   uuid primary key default gen_random_uuid(),
  canal                text not null default 'instagram',
  igsid                text not null,
  username             text,
  nome                 text,
  foto_url             text,
  segue                boolean,
  segue_conferido_em   timestamptz,
  ultima_interacao_em  timestamptz not null default now(),
  criado_em            timestamptz not null default now(),
  unique (canal, igsid)
);

-- ---------------------------------------------------------------------
-- 4. ig_participacoes: o caminho de um contato numa automação + mídia.
-- ---------------------------------------------------------------------
create table public.ig_participacoes (
  id               uuid primary key default gen_random_uuid(),
  contato_id       uuid not null references public.ig_contatos(id) on delete cascade,
  automacao_id     uuid not null references public.ig_automacoes(id) on delete cascade,
  midia_id         text not null,
  situacao         text not null check (situacao in ('aguardando_botao', 'aguardando_seguir', 'link_enviado', 'link_aberto')),
  comentarios      int not null default 0,
  codigo           text not null unique,
  janela_ate       timestamptz,
  link_enviado_em  timestamptz,
  link_aberto_em   timestamptz,
  falha_motivo     text,
  falha_em         timestamptz,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  unique (contato_id, automacao_id, midia_id)
);

create trigger trg_ig_participacoes_atualizado_em
  before update on public.ig_participacoes
  for each row execute function public.ig_set_atualizado_em();

-- ---------------------------------------------------------------------
-- 5. ig_mensagens: histórico da conversa.
-- ---------------------------------------------------------------------
create table public.ig_mensagens (
  id               uuid primary key default gen_random_uuid(),
  contato_id       uuid not null references public.ig_contatos(id) on delete cascade,
  participacao_id  uuid references public.ig_participacoes(id) on delete set null,
  direcao          text not null check (direcao in ('entrada', 'saida', 'dono', 'sistema')),
  tipo             text not null check (tipo in ('comentario', 'texto', 'botao', 'link_aberto', 'resposta_publica', 'aviso')),
  texto            text,
  meta_id          text unique,
  criado_em        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. ig_envios: fila de saída (idempotente por `chave`).
-- ---------------------------------------------------------------------
create table public.ig_envios (
  id               uuid primary key default gen_random_uuid(),
  chave            text not null unique,
  contato_id       uuid not null references public.ig_contatos(id) on delete cascade,
  participacao_id  uuid references public.ig_participacoes(id) on delete cascade,
  tipo             text not null check (tipo in ('resposta_privada', 'resposta_publica', 'mensagem', 'lembrete')),
  comentario_id    text,
  payload          jsonb,
  enviar_apos      timestamptz not null default now(),
  estado           text not null default 'pendente' check (estado in ('pendente', 'processando', 'enviado', 'falhou', 'cancelado')),
  tentativas       int not null default 0,
  erro             text,
  meta_id          text,
  reservado_em     timestamptz,
  enviado_em       timestamptz,
  criado_em        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. ig_eventos: eventos recebidos do webhook (idempotência por `chave`).
-- ---------------------------------------------------------------------
create table public.ig_eventos (
  chave          text primary key,
  recebido_em    timestamptz not null default now(),
  payload        jsonb,
  processado_em  timestamptz,
  erro           text
);

-- ---------------------------------------------------------------------
-- 8. ig_cliques: cada abertura do link curto /ir/<codigo>/.
-- ---------------------------------------------------------------------
create table public.ig_cliques (
  id               uuid primary key default gen_random_uuid(),
  participacao_id  uuid not null references public.ig_participacoes(id) on delete cascade,
  user_agent       text,
  criado_em        timestamptz not null default now()
);

-- Índices dos acessos quentes (fila, histórico por contato, retenção).
create index ig_envios_fila_idx        on public.ig_envios (enviar_apos) where estado in ('pendente', 'processando');
create index ig_mensagens_contato_idx  on public.ig_mensagens (contato_id, criado_em desc);
create index ig_participacoes_auto_idx on public.ig_participacoes (automacao_id);
create index ig_cliques_particip_idx   on public.ig_cliques (participacao_id);
create index ig_contatos_interacao_idx on public.ig_contatos (ultima_interacao_em);
create index ig_eventos_recebido_idx   on public.ig_eventos (recebido_em);

-- ---------------------------------------------------------------------
-- RLS e privilégios (padrão da 031: anon sem nada, policy `to authenticated`).
-- ---------------------------------------------------------------------
alter table public.ig_conta enable row level security;
alter table public.ig_automacoes enable row level security;
alter table public.ig_contatos enable row level security;
alter table public.ig_participacoes enable row level security;
alter table public.ig_mensagens enable row level security;
alter table public.ig_envios enable row level security;
alter table public.ig_eventos enable row level security;
alter table public.ig_cliques enable row level security;

revoke all on table public.ig_conta from anon;
revoke all on table public.ig_automacoes from anon;
revoke all on table public.ig_contatos from anon;
revoke all on table public.ig_participacoes from anon;
revoke all on table public.ig_mensagens from anon;
revoke all on table public.ig_envios from anon;
revoke all on table public.ig_eventos from anon;
revoke all on table public.ig_cliques from anon;

-- authenticated: parte do zero e recebe só o necessário.
revoke all on table public.ig_conta from authenticated;
revoke all on table public.ig_automacoes from authenticated;
revoke all on table public.ig_contatos from authenticated;
revoke all on table public.ig_participacoes from authenticated;
revoke all on table public.ig_mensagens from authenticated;
revoke all on table public.ig_envios from authenticated;
revoke all on table public.ig_eventos from authenticated;
revoke all on table public.ig_cliques from authenticated;

-- ig_conta: SELECT por coluna, SEM `token` (só a service role o lê).
grant select (id, ig_user_id, username, nome, foto_url, webhooks_assinados, conectado_em, ultimo_evento_em)
  on public.ig_conta to authenticated;

grant select, insert, update, delete on public.ig_automacoes to authenticated;
grant select, delete                 on public.ig_contatos   to authenticated;
grant select on public.ig_participacoes to authenticated;
grant select on public.ig_mensagens     to authenticated;
grant select on public.ig_envios        to authenticated;
grant select on public.ig_cliques       to authenticated;

create policy ig_conta_admin_read on public.ig_conta
  for select to authenticated using (public.eh_admin());

create policy ig_automacoes_admin_read on public.ig_automacoes
  for select to authenticated using (public.eh_admin());
create policy ig_automacoes_admin_insert on public.ig_automacoes
  for insert to authenticated with check (public.eh_admin());
create policy ig_automacoes_admin_update on public.ig_automacoes
  for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
create policy ig_automacoes_admin_delete on public.ig_automacoes
  for delete to authenticated using (public.eh_admin());

create policy ig_contatos_admin_read on public.ig_contatos
  for select to authenticated using (public.eh_admin());
create policy ig_contatos_admin_delete on public.ig_contatos
  for delete to authenticated using (public.eh_admin());

create policy ig_participacoes_admin_read on public.ig_participacoes
  for select to authenticated using (public.eh_admin());
create policy ig_mensagens_admin_read on public.ig_mensagens
  for select to authenticated using (public.eh_admin());
create policy ig_envios_admin_read on public.ig_envios
  for select to authenticated using (public.eh_admin());
create policy ig_cliques_admin_read on public.ig_cliques
  for select to authenticated using (public.eh_admin());

-- ig_eventos: nenhuma policy (RLS ligada sem policy = só a service role).

-- ---------------------------------------------------------------------
-- Funções
-- ---------------------------------------------------------------------

-- Reserva um lote da fila. `skip locked` evita que dois disparos simultâneos
-- peguem a mesma linha; `processando` há mais de 5 min volta a ser elegível
-- (o disparo anterior morreu no meio).
create or replace function public.ig_reservar_envios(p_limite int)
returns setof public.ig_envios
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.ig_envios e
     set estado = 'processando',
         reservado_em = now()
   where e.id in (
     select f.id
       from public.ig_envios f
      where (f.estado = 'pendente' and f.enviar_apos <= now())
         or (f.estado = 'processando' and f.reservado_em < now() - interval '5 minutes')
      order by f.enviar_apos
      limit p_limite
        for update skip locked
   )
  returning e.*;
end;
$$;

revoke execute on function public.ig_reservar_envios(int) from public, anon, authenticated;
grant execute on function public.ig_reservar_envios(int) to service_role;

-- Resumo do dia corrente em São Paulo. SECURITY INVOKER: a RLS vale (só admin vê).
create or replace function public.ig_resumo_do_dia(p_automacao uuid default null)
returns table (comentarios int, links_enviados int, links_abertos int, falhas int)
language sql
stable
security invoker
set search_path = public
as $$
  with limites as (
    select (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') as ini
  )
  select
    (select count(*)::int
       from public.ig_mensagens m
       left join public.ig_participacoes p on p.id = m.participacao_id
      where m.tipo = 'comentario'
        and m.criado_em >= (select ini from limites)
        and m.criado_em <  (select ini from limites) + interval '1 day'
        and (p_automacao is null or p.automacao_id = p_automacao)),
    (select count(*)::int from public.ig_participacoes p
      where p.link_enviado_em >= (select ini from limites)
        and p.link_enviado_em <  (select ini from limites) + interval '1 day'
        and (p_automacao is null or p.automacao_id = p_automacao)),
    (select count(*)::int from public.ig_participacoes p
      where p.link_aberto_em >= (select ini from limites)
        and p.link_aberto_em <  (select ini from limites) + interval '1 day'
        and (p_automacao is null or p.automacao_id = p_automacao)),
    (select count(*)::int from public.ig_participacoes p
      where p.falha_em >= (select ini from limites)
        and p.falha_em <  (select ini from limites) + interval '1 day'
        and (p_automacao is null or p.automacao_id = p_automacao));
$$;

revoke execute on function public.ig_resumo_do_dia(uuid) from public, anon;
grant execute on function public.ig_resumo_do_dia(uuid) to authenticated;

-- Retenção: contato sem interação há 12 meses sai (a cascata leva o resto).
create or replace function public.ig_apagar_inativos()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
begin
  delete from public.ig_contatos
   where ultima_interacao_em < now() - interval '12 months';
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke execute on function public.ig_apagar_inativos() from public, anon, authenticated;

-- Retenção: eventos de webhook com mais de 30 dias.
create or replace function public.ig_limpar_eventos()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
begin
  delete from public.ig_eventos
   where recebido_em < now() - interval '30 days';
  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke execute on function public.ig_limpar_eventos() from public, anon, authenticated;


-- =====================================================================
-- COMO VERIFICAR (rodar à mão no SQL Editor, depois de aplicada)
-- =====================================================================
-- 1) Token fora do alcance do admin logado:
--    select has_column_privilege('authenticated', 'public.ig_conta', 'token', 'SELECT');  -- false
-- 2) Anon sem acesso:
--    select has_table_privilege('anon', 'public.ig_automacoes', 'SELECT');  -- false
-- 3) Funções do sistema fechadas:
--    select has_function_privilege('authenticated', 'public.ig_reservar_envios(int)', 'EXECUTE');  -- false
--    select has_function_privilege('service_role',  'public.ig_reservar_envios(int)', 'EXECUTE');  -- true
-- 4) Resumo (como admin): select * from public.ig_resumo_do_dia();
--
-- =====================================================================
-- COMO DESFAZER
-- =====================================================================
--    drop table public.ig_cliques, public.ig_envios, public.ig_mensagens,
--      public.ig_participacoes, public.ig_automacoes, public.ig_contatos,
--      public.ig_eventos, public.ig_conta cascade;
--    drop function public.ig_reservar_envios(int);
--    drop function public.ig_resumo_do_dia(uuid);
--    drop function public.ig_apagar_inativos();
--    drop function public.ig_limpar_eventos();
--    drop function public.ig_set_atualizado_em();
