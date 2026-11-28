-- =====================================================================
-- 039_crm_somente_membros.sql
-- CRM e leitura de `profiles` só para MEMBROS da equipe (quem tem linha em
-- `public.profiles`), e exclusão de lead só por admin já na RLS.
--
-- Problema: a RLS do CRM só perguntava "existe sessão autenticada?", nunca
-- "esta pessoa é da equipe?". `leads_visiveis` liberava `corretor_id is null`
-- (todo lead novo do site) a QUALQUER conta logada, e as tabelas de domínio e
-- `profiles_read_authenticated` usavam `auth.role() = 'authenticated'`. Hoje o
-- auto-cadastro do Supabase está desligado, então é defesa em profundidade:
-- qualquer conta que venha a existir em auth.users sem linha em `profiles`
-- (convite por engano, cadastro reativado) não pode enxergar nada.
--
-- Também: a policy `for all` deixava um corretor apagar lead direto pelo
-- PostgREST, pulando a checagem de admin e o registro de LGPD
-- (`crm_exclusoes`) de `excluirLead`. DELETE em leads passa a ser só admin.
--
-- Policies recriadas (a definição vigente de cada uma foi lida das migrations,
-- a última alteração vence: 017 -> 024 -> 030 -> 031):
--   leads                 leads_visiveis (017, for all)  ->  leads_membros_select,
--                         leads_membros_insert, leads_membros_update, leads_admin_delete
--   lead_financiamento    lead_financiamento_crud (017)
--   lead_home_equity      lead_home_equity_crud (017)
--   lead_imovel           lead_imovel_crud (017)
--   lead_consorcio        lead_consorcio_crud (017)
--   lead_status_historico lead_status_historico_select (017)
--   lead_interacoes       lead_interacoes_select, _insert,
--                         _update_autor_ou_admin, _delete_autor_ou_admin (024)
--   crm_lembretes         crm_lembretes_crud (017)
--   lead_tags             lead_tags_crud (017)
--   crm_simulacoes        crm_simulacoes_select (030)
--   crm_etapas / crm_interacao_tipos / crm_motivos_perda / crm_tags
--                         *_read (017): auth.role() = 'authenticated' -> eh_membro_crm()
--   profiles              profiles_read_authenticated (006) -> eh_membro_crm();
--                         profiles_select_own / profiles_update_own (001) ganham
--                         `to authenticated` e (select auth.uid()).
-- As policies `*_admin_write` (eh_admin()) e os grants de coluna de `profiles`
-- (020) não mudam. A regra de reatribuição segue no trigger
-- validar_atribuicao_lead (017).
--
-- `eh_membro_crm()` é security definer (lê `profiles` sem passar pela própria
-- RLS dela, o que evitaria recursão) e tem search_path fixo, igual a eh_admin().
--
-- Tabela/policy nova de CRM: `to authenticated` E `eh_membro_crm()`.
-- Sem BEGIN/COMMIT: a CLI já abre uma transação por arquivo.
-- Reverter: ver o bloco de rollback na descrição do PR.
-- =====================================================================

-- 1. eh_membro_crm() ---------------------------------------------------
create or replace function public.eh_membro_crm()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
  );
$$;

-- O execute padrão de função é de PUBLIC (que o anon herda): revogar de lá.
revoke execute on function public.eh_membro_crm() from public, anon;
grant execute on function public.eh_membro_crm() to authenticated;

-- 2. leads -------------------------------------------------------------
drop policy if exists "leads_visiveis" on public.leads;
drop policy if exists "leads_membros_select" on public.leads;
drop policy if exists "leads_membros_insert" on public.leads;
drop policy if exists "leads_membros_update" on public.leads;
drop policy if exists "leads_admin_delete" on public.leads;

create policy "leads_membros_select" on public.leads for select to authenticated
  using (
    public.eh_membro_crm()
    and (public.eh_admin() or corretor_id = (select auth.uid()) or corretor_id is null)
  );

create policy "leads_membros_insert" on public.leads for insert to authenticated
  with check (
    public.eh_membro_crm()
    and (public.eh_admin() or corretor_id = (select auth.uid()) or corretor_id is null)
  );

create policy "leads_membros_update" on public.leads for update to authenticated
  using (
    public.eh_membro_crm()
    and (public.eh_admin() or corretor_id = (select auth.uid()) or corretor_id is null)
  )
  with check (
    public.eh_membro_crm()
    and (public.eh_admin() or corretor_id = (select auth.uid()) or corretor_id is null)
  );

-- Só admin apaga (excluirLead grava o registro de LGPD antes).
create policy "leads_admin_delete" on public.leads for delete to authenticated
  using (public.eh_admin());

-- 3. Tabelas filhas ----------------------------------------------------
drop policy if exists "lead_financiamento_crud" on public.lead_financiamento;
create policy "lead_financiamento_crud" on public.lead_financiamento for all to authenticated
  using (public.eh_membro_crm() and exists (
    select 1 from public.leads l
     where l.id = lead_financiamento.lead_id
       and (public.eh_admin() or l.corretor_id = (select auth.uid()) or l.corretor_id is null)
  ));

drop policy if exists "lead_home_equity_crud" on public.lead_home_equity;
create policy "lead_home_equity_crud" on public.lead_home_equity for all to authenticated
  using (public.eh_membro_crm() and exists (
    select 1 from public.leads l
     where l.id = lead_home_equity.lead_id
       and (public.eh_admin() or l.corretor_id = (select auth.uid()) or l.corretor_id is null)
  ));

drop policy if exists "lead_imovel_crud" on public.lead_imovel;
create policy "lead_imovel_crud" on public.lead_imovel for all to authenticated
  using (public.eh_membro_crm() and exists (
    select 1 from public.leads l
     where l.id = lead_imovel.lead_id
       and (public.eh_admin() or l.corretor_id = (select auth.uid()) or l.corretor_id is null)
  ));

drop policy if exists "lead_consorcio_crud" on public.lead_consorcio;
create policy "lead_consorcio_crud" on public.lead_consorcio for all to authenticated
  using (public.eh_membro_crm() and exists (
    select 1 from public.leads l
     where l.id = lead_consorcio.lead_id
       and (public.eh_admin() or l.corretor_id = (select auth.uid()) or l.corretor_id is null)
  ));

drop policy if exists "lead_status_historico_select" on public.lead_status_historico;
create policy "lead_status_historico_select" on public.lead_status_historico for select to authenticated
  using (public.eh_membro_crm() and exists (
    select 1 from public.leads l
     where l.id = lead_status_historico.lead_id
       and (public.eh_admin() or l.corretor_id = (select auth.uid()) or l.corretor_id is null)
  ));

drop policy if exists "lead_interacoes_select" on public.lead_interacoes;
create policy "lead_interacoes_select" on public.lead_interacoes for select to authenticated
  using (public.eh_membro_crm() and exists (
    select 1 from public.leads l
     where l.id = lead_interacoes.lead_id
       and (public.eh_admin() or l.corretor_id = (select auth.uid()) or l.corretor_id is null)
  ));

drop policy if exists "lead_interacoes_insert" on public.lead_interacoes;
create policy "lead_interacoes_insert" on public.lead_interacoes for insert to authenticated
  with check (public.eh_membro_crm() and exists (
    select 1 from public.leads l
     where l.id = lead_interacoes.lead_id
       and (public.eh_admin() or l.corretor_id = (select auth.uid()) or l.corretor_id is null)
  ));

drop policy if exists "lead_interacoes_update_autor_ou_admin" on public.lead_interacoes;
create policy "lead_interacoes_update_autor_ou_admin" on public.lead_interacoes for update to authenticated
  using (
    public.eh_membro_crm()
    and not automatica
    and (public.eh_admin() or autor_id = (select auth.uid()))
    and exists (
      select 1 from public.leads l
       where l.id = lead_interacoes.lead_id
         and (public.eh_admin() or l.corretor_id = (select auth.uid()) or l.corretor_id is null)
    )
  )
  with check (
    public.eh_membro_crm()
    and not automatica
    and (public.eh_admin() or autor_id = (select auth.uid()))
  );

drop policy if exists "lead_interacoes_delete_autor_ou_admin" on public.lead_interacoes;
create policy "lead_interacoes_delete_autor_ou_admin" on public.lead_interacoes for delete to authenticated
  using (
    public.eh_membro_crm()
    and not automatica
    and (public.eh_admin() or autor_id = (select auth.uid()))
    and exists (
      select 1 from public.leads l
       where l.id = lead_interacoes.lead_id
         and (public.eh_admin() or l.corretor_id = (select auth.uid()) or l.corretor_id is null)
    )
  );

drop policy if exists "crm_lembretes_crud" on public.crm_lembretes;
create policy "crm_lembretes_crud" on public.crm_lembretes for all to authenticated
  using (public.eh_membro_crm() and exists (
    select 1 from public.leads l
     where l.id = crm_lembretes.lead_id
       and (public.eh_admin() or l.corretor_id = (select auth.uid()) or l.corretor_id is null)
  ));

drop policy if exists "lead_tags_crud" on public.lead_tags;
create policy "lead_tags_crud" on public.lead_tags for all to authenticated
  using (public.eh_membro_crm() and exists (
    select 1 from public.leads l
     where l.id = lead_tags.lead_id
       and (public.eh_admin() or l.corretor_id = (select auth.uid()) or l.corretor_id is null)
  ));

-- A 030 só pedia "o lead é visível"; a visibilidade vem da RLS de leads.
drop policy if exists "crm_simulacoes_select" on public.crm_simulacoes;
create policy "crm_simulacoes_select" on public.crm_simulacoes for select to authenticated
  using (public.eh_membro_crm() and exists (select 1 from public.leads l where l.id = lead_id));

-- 4. Tabelas de domínio: leitura só para membro ------------------------
drop policy if exists "crm_etapas_read" on public.crm_etapas;
create policy "crm_etapas_read" on public.crm_etapas for select to authenticated
  using (public.eh_membro_crm());

drop policy if exists "crm_interacao_tipos_read" on public.crm_interacao_tipos;
create policy "crm_interacao_tipos_read" on public.crm_interacao_tipos for select to authenticated
  using (public.eh_membro_crm());

drop policy if exists "crm_motivos_perda_read" on public.crm_motivos_perda;
create policy "crm_motivos_perda_read" on public.crm_motivos_perda for select to authenticated
  using (public.eh_membro_crm());

drop policy if exists "crm_tags_read" on public.crm_tags;
create policy "crm_tags_read" on public.crm_tags for select to authenticated
  using (public.eh_membro_crm());

-- 5. profiles ----------------------------------------------------------
-- Os grants de coluna (020) não são tocados: UPDATE segue só em
-- full_name, phone, avatar_url, creci.
drop policy if exists "profiles_read_authenticated" on public.profiles;
create policy "profiles_read_authenticated" on public.profiles for select to authenticated
  using (public.eh_membro_crm());

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id);

-- Conferência (deve voltar vazio: nenhuma policy do CRM/profiles com auth.role()):
--   select tablename, policyname from pg_policies
--    where schemaname = 'public' and qual like '%auth.role()%'
--      and tablename in ('profiles','crm_etapas','crm_interacao_tipos','crm_motivos_perda','crm_tags');
