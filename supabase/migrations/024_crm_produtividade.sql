-- =====================================================================
-- 024_crm_produtividade.sql
-- Fase 4 do CRM: lembretes na linha do tempo e editar/apagar interação
-- só por autor ou admin.
--
-- 1. LINHA DO TEMPO COM LEMBRETES
--    docs/crm-spec.md §2.2 promete lembretes na timeline, mas a view da 015
--    só unia interações e transições de etapa. Aqui a vw_crm_timeline ganha
--    dois ramos de `crm_lembretes`: "lembrete agendado" (created_at) e
--    "lembrete concluído" (concluido_em). Reagendamento NÃO aparece: a
--    tabela guarda só a data vigente, sem histórico de remarcações — para
--    mostrar seria preciso uma tabela de eventos, fora desta fase.
--
--    As nove colunas anteriores seguem na mesma ordem e com o mesmo tipo
--    (LinhaDoTempo.tsx continua funcionando); `natureza` ganha o valor
--    'lembrete'. Duas colunas novas entram no FIM, como o CREATE OR REPLACE
--    VIEW exige: `item_id` (id da linha de origem, para a interface saber
--    qual interação editar/apagar) e `editada_em`.
--
--    security_invoker (018) é reafirmado no fim: a RLS de crm_lembretes,
--    lead_interacoes e leads continua valendo na leitura pela view.
--
-- 2. EDITAR / APAGAR INTERAÇÃO
--    A 017 criou `lead_interacoes_crud` (FOR ALL): qualquer um que enxerga o
--    lead podia editar e apagar a nota de qualquer outra pessoa. Troca-se
--    por quatro policies:
--      * select e insert: IDÊNTICAS ao comportamento anterior (quem enxerga
--        o lead — admin, responsável ou lead sem dono);
--      * update e delete: além disso, só o autor (autor_id = auth.uid()) ou
--        admin (eh_admin(), 020), e nunca interação `automatica` (log do
--        sistema não é texto de ninguém). O WITH CHECK do update impede o
--        autor de passar a nota para outra pessoa.
--    Exclusão de lead em cascata não passa por RLS de lead_interacoes, então
--    segue funcionando.
--    Coluna nova `editada_em` (nula = nunca editada), gravada por
--    editarInteracao (app/actions/admin-crm.ts), para a timeline marcar
--    "(editada)" e a alteração não ser silenciosa.
--
-- Aplicada pelo workflow migrations-supabase (supabase db push), que já roda
-- cada arquivo numa transação: por isso não há begin/commit aqui.
-- =====================================================================

alter table public.lead_interacoes
  add column editada_em timestamptz;

create or replace view public.vw_crm_timeline as
  select li.lead_id, li.created_at as ocorrido_em, 'interacao' as natureza,
         li.tipo, t.label as tipo_label, li.conteudo as corpo,
         li.automatica, li.autor_id, p.full_name as autor_nome,
         li.id as item_id, li.editada_em
    from public.lead_interacoes li
    join public.crm_interacao_tipos t on t.slug = li.tipo
    left join public.profiles p on p.id = li.autor_id
  union all
  select h.lead_id, h.created_at, 'etapa',
         h.status_novo, e.label, coalesce(h.motivo_obs, h.observacao),
         true, h.alterado_por, p.full_name,
         h.id, null::timestamptz
    from public.lead_status_historico h
    left join public.leads l on l.id = h.lead_id
    left join public.crm_etapas e on e.tipo = l.tipo and e.slug = h.status_novo
    left join public.profiles p on p.id = h.alterado_por
  union all
  select cl.lead_id, cl.created_at, 'lembrete',
         'lembrete-agendado', 'Lembrete agendado',
         cl.descricao || ' · para '
           || to_char(cl.agendado_para at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'),
         true, cl.criado_por, p.full_name,
         cl.id, null::timestamptz
    from public.crm_lembretes cl
    left join public.profiles p on p.id = cl.criado_por
  union all
  select cl.lead_id, cl.concluido_em, 'lembrete',
         'lembrete-concluido', 'Lembrete concluído', cl.descricao,
         true, cl.concluido_por, p.full_name,
         cl.id, null::timestamptz
    from public.crm_lembretes cl
    left join public.profiles p on p.id = cl.concluido_por
   where cl.concluido and cl.concluido_em is not null;

alter view public.vw_crm_timeline set (security_invoker = on);

drop policy "lead_interacoes_crud" on public.lead_interacoes;

create policy "lead_interacoes_select" on public.lead_interacoes for select
  using (exists (
    select 1 from public.leads l
     where l.id = lead_interacoes.lead_id
       and (public.eh_admin() or l.corretor_id = auth.uid() or l.corretor_id is null)
  ));

create policy "lead_interacoes_insert" on public.lead_interacoes for insert
  with check (exists (
    select 1 from public.leads l
     where l.id = lead_interacoes.lead_id
       and (public.eh_admin() or l.corretor_id = auth.uid() or l.corretor_id is null)
  ));

create policy "lead_interacoes_update_autor_ou_admin" on public.lead_interacoes for update
  using (
    not automatica
    and (public.eh_admin() or autor_id = auth.uid())
    and exists (
      select 1 from public.leads l
       where l.id = lead_interacoes.lead_id
         and (public.eh_admin() or l.corretor_id = auth.uid() or l.corretor_id is null)
    )
  )
  with check (
    not automatica
    and (public.eh_admin() or autor_id = auth.uid())
  );

create policy "lead_interacoes_delete_autor_ou_admin" on public.lead_interacoes for delete
  using (
    not automatica
    and (public.eh_admin() or autor_id = auth.uid())
    and exists (
      select 1 from public.leads l
       where l.id = lead_interacoes.lead_id
         and (public.eh_admin() or l.corretor_id = auth.uid() or l.corretor_id is null)
    )
  );

-- =====================================================================
-- FIM — 024_crm_produtividade.sql
-- Confira com:
--   select relname, reloptions from pg_class where relname = 'vw_crm_timeline';
--   -- deve mostrar {security_invoker=on}
--   select policyname, cmd from pg_policies
--    where tablename = 'lead_interacoes' order by policyname;
--   -- quatro policies: select, insert, update_autor_ou_admin, delete_autor_ou_admin
-- =====================================================================
