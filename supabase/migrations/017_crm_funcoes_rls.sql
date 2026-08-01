-- =====================================================================
-- 017_crm_funcoes_rls.sql
-- Quarta e última migration da Fase 2 do CRM (docs/crm-spec.md, §2.4).
-- Funções de negócio (mover_lead_crm, registrar_interacao_crm, eh_admin)
-- e a troca completa da RLS de leads/CRM: de "qualquer autenticado vê
-- tudo" (as sete policies de 002_leads_crm.sql) para "admin vê tudo,
-- corretor vê os seus e os não atribuídos".
--
-- Tudo dentro de uma transação: as policies antigas são dropadas e as
-- novas criadas na mesma migration. Rodar as duas coisas separadas
-- deixaria uma janela em que nenhuma policy cobre leads (RLS ligada,
-- zero policy = zero acesso) ou, pior, em que as duas convivem e a
-- antiga ("qualquer autenticado") anula a nova silenciosamente (policies
-- do mesmo comando se combinam por OR).
--
-- Rodar no SQL Editor do Supabase, depois de 016_crm_campos_e_tags.sql.
-- =====================================================================

begin;

-- =====================================================================
-- 1. EH_ADMIN
-- search_path fixo: sem isso, uma função SECURITY DEFINER pode ser
-- levada a resolver "profiles" numa schema plantada pelo chamador.
-- =====================================================================
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

-- =====================================================================
-- 2. MOVER_LEAD_CRM
-- SECURITY INVOKER de propósito: a RLS continua valendo dentro da
-- função. Ela não é um jeito de escapar da política, é o lugar onde a
-- regra de motivo obrigatório é imposta uma vez só — vale tanto para o
-- arrastar quanto para o `select` de etapa do formulário, sem duplicar
-- regra em dois lugares.
-- =====================================================================
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

-- =====================================================================
-- 3. LOG_LEAD_STATUS_CHANGE — trigger existente, ajustada
-- O trigger já cuidava de gravar o histórico e atualizar
-- status_alterado_em (002_leads_crm.sql). Passa a copiar
-- new.motivo_perda / new.motivo_obs (colunas acrescentadas em
-- 014_crm_pipelines.sql) para a linha do histórico, para que o motivo
-- fique preso ao momento da transição e não só ao estado atual do lead
-- — quem olha o histórico de uma transição antiga não deveria ver o
-- motivo mais recente, se o lead tiver sido movido de novo depois.
-- `create or replace` é seguro aqui: a assinatura (função de trigger,
-- sem parâmetros) não muda, então não há o risco de overload que
-- 012_lead_consentimento.sql documentou para os RPCs criar_lead_*.
-- =====================================================================
create or replace function public.log_lead_status_change()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.lead_status_historico
      (lead_id, status_anterior, status_novo, alterado_por, motivo_perda, motivo_obs)
    values (new.id, null, new.status, new.corretor_id, new.motivo_perda, new.motivo_obs);
    return new;
  end if;

  if (new.status is distinct from old.status) then
    insert into public.lead_status_historico
      (lead_id, status_anterior, status_novo, alterado_por, motivo_perda, motivo_obs)
    values (new.id, old.status, new.status, auth.uid(), new.motivo_perda, new.motivo_obs);
    new.status_alterado_em = now();
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- =====================================================================
-- 4. REGISTRAR_INTERACAO_CRM
-- Grava a interação e o lembrete (quando informado) numa transação só —
-- sem isso é possível salvar a nota e perder o follow-up (ex.: a
-- primeira INSERT vai, a segunda falha por RLS ou erro de rede, e a
-- interface já deu a ação como concluída). SECURITY INVOKER pelo mesmo
-- motivo de mover_lead_crm: a RLS de lead_interacoes/crm_lembretes
-- continua valendo, a função só evita duas idas ao servidor.
-- =====================================================================
create or replace function public.registrar_interacao_crm(
  p_lead_id uuid,
  p_tipo text,
  p_conteudo text,
  p_lembrete_em timestamptz default null,
  p_lembrete_desc text default null
) returns public.lead_interacoes
language plpgsql security invoker
set search_path = public, pg_temp
as $$
declare
  v_interacao public.lead_interacoes;
begin
  insert into public.lead_interacoes (lead_id, tipo, conteudo, autor_id)
  values (p_lead_id, p_tipo, p_conteudo, auth.uid())
  returning * into v_interacao;

  if p_lembrete_em is not null then
    -- Mesmo espírito da validação de motivo em mover_lead_crm: a regra
    -- de negócio vive no banco, não só no Zod de lib/validations/crm.ts,
    -- porque este RPC também pode ser chamado fora do formulário.
    if p_lembrete_desc is null or length(trim(p_lembrete_desc)) = 0 then
      raise exception 'LEMBRETE_DESCRICAO_OBRIGATORIA';
    end if;

    insert into public.crm_lembretes (lead_id, interacao_id, agendado_para, descricao, criado_por)
    values (p_lead_id, v_interacao.id, p_lembrete_em, p_lembrete_desc, auth.uid());
  end if;

  return v_interacao;
end;
$$;

-- =====================================================================
-- 5. RLS — habilitar nas tabelas novas (014, 015 e 016)
-- =====================================================================
alter table public.crm_etapas          enable row level security;
alter table public.crm_motivos_perda   enable row level security;
alter table public.crm_interacao_tipos enable row level security;
alter table public.crm_lembretes       enable row level security;
alter table public.crm_tags            enable row level security;
alter table public.lead_tags           enable row level security;
alter table public.crm_exclusoes       enable row level security;

-- =====================================================================
-- 6. RLS — remover as sete policies antigas de 002_leads_crm.sql
-- Policies do mesmo comando se combinam por OR. Deixar "leads_admin_all"
-- (auth.role() = 'authenticated') no lugar anularia toda a regra por
-- papel abaixo, silenciosamente: qualquer corretor autenticado
-- continuaria vendo e editando leads de qualquer outro.
-- =====================================================================
drop policy "leads_admin_all"       on public.leads;
drop policy "lead_fin_admin_all"    on public.lead_financiamento;
drop policy "lead_he_admin_all"     on public.lead_home_equity;
drop policy "lead_imovel_admin_all" on public.lead_imovel;
drop policy "lead_cons_admin_all"   on public.lead_consorcio;
drop policy "lead_hist_admin_read"  on public.lead_status_historico;
drop policy "lead_inter_admin_all"  on public.lead_interacoes;

-- =====================================================================
-- 7. RLS — leads
-- Lead sem responsável fica visível para todos: todo lead vindo do site
-- nasce com corretor_id nulo, e sem esta cláusula o corretor não
-- enxergaria justamente os leads novos que precisa atender.
--
-- Uma única policy `for all` cobre select/insert/update/delete. Sem
-- `with check` explícito o Postgres reusa a expressão de `using`, o que
-- já barra um corretor de empurrar um lead para um terceiro: a linha
-- resultante não satisfaria a condição e o update falha.
--
-- O que a policy NÃO consegue fazer é distinguir "peguei um lead livre"
-- de "larguei o meu lead": `with check` só enxerga a linha nova, nunca a
-- antiga, e nos dois casos a linha nova é válida. Quem faz essa distinção
-- é o trigger trg_leads_atribuicao, logo abaixo.
-- =====================================================================
create policy "leads_visiveis" on public.leads for all
  using (public.eh_admin() or corretor_id = auth.uid() or corretor_id is null);

-- ---------------------------------------------------------------------
-- Regra de reatribuição — precisa comparar old com new, então é trigger,
-- não policy.
--
-- Corretor pode:
--   * trabalhar num lead sem dono sem ser obrigado a assumi-lo
--     (mover etapa, anotar) — por isso não há auto-claim aqui;
--   * assumir um lead sem dono (null -> ele mesmo).
-- Corretor NÃO pode:
--   * devolver o próprio lead ao bolo comum (ele -> null), que seria um
--     jeito silencioso de largar trabalho já atribuído;
--   * passar lead para um terceiro (ele -> outro).
-- Admin faz qualquer uma das quatro.
-- ---------------------------------------------------------------------
create or replace function public.validar_atribuicao_lead()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.corretor_id is distinct from old.corretor_id
     and not public.eh_admin()
     and not (old.corretor_id is null and new.corretor_id = auth.uid())
  then
    raise exception 'ATRIBUICAO_NAO_PERMITIDA';
  end if;
  return new;
end;
$$;

create trigger trg_leads_atribuicao
  before update of corretor_id on public.leads
  for each row execute function public.validar_atribuicao_lead();

-- =====================================================================
-- 8. RLS — tabelas filhas (1:1 com leads) e de histórico/relacionamento
-- Todas herdam a visibilidade de leads pelo mesmo predicado, via
-- `exists`. Nenhuma tem policy própria de papel: quem pode ver/mexer no
-- lead pode ver/mexer no detalhe dele.
-- =====================================================================
create policy "lead_financiamento_crud" on public.lead_financiamento for all
  using (exists (
    select 1 from public.leads l
     where l.id = lead_financiamento.lead_id
       and (public.eh_admin() or l.corretor_id = auth.uid() or l.corretor_id is null)
  ));

create policy "lead_home_equity_crud" on public.lead_home_equity for all
  using (exists (
    select 1 from public.leads l
     where l.id = lead_home_equity.lead_id
       and (public.eh_admin() or l.corretor_id = auth.uid() or l.corretor_id is null)
  ));

create policy "lead_imovel_crud" on public.lead_imovel for all
  using (exists (
    select 1 from public.leads l
     where l.id = lead_imovel.lead_id
       and (public.eh_admin() or l.corretor_id = auth.uid() or l.corretor_id is null)
  ));

create policy "lead_consorcio_crud" on public.lead_consorcio for all
  using (exists (
    select 1 from public.leads l
     where l.id = lead_consorcio.lead_id
       and (public.eh_admin() or l.corretor_id = auth.uid() or l.corretor_id is null)
  ));

-- Só leitura: a gravação acontece pelo trigger log_lead_status_change,
-- que é SECURITY DEFINER e portanto já ignora RLS — não precisa (nem
-- deve) de policy de insert para o usuário autenticado.
create policy "lead_status_historico_select" on public.lead_status_historico for select
  using (exists (
    select 1 from public.leads l
     where l.id = lead_status_historico.lead_id
       and (public.eh_admin() or l.corretor_id = auth.uid() or l.corretor_id is null)
  ));

create policy "lead_interacoes_crud" on public.lead_interacoes for all
  using (exists (
    select 1 from public.leads l
     where l.id = lead_interacoes.lead_id
       and (public.eh_admin() or l.corretor_id = auth.uid() or l.corretor_id is null)
  ));

create policy "crm_lembretes_crud" on public.crm_lembretes for all
  using (exists (
    select 1 from public.leads l
     where l.id = crm_lembretes.lead_id
       and (public.eh_admin() or l.corretor_id = auth.uid() or l.corretor_id is null)
  ));

create policy "lead_tags_crud" on public.lead_tags for all
  using (exists (
    select 1 from public.leads l
     where l.id = lead_tags.lead_id
       and (public.eh_admin() or l.corretor_id = auth.uid() or l.corretor_id is null)
  ));

-- =====================================================================
-- 9. RLS — tabelas de domínio: leitura autenticada, escrita só admin
-- Duas policies por tabela: a de select (qualquer autenticado) e a
-- `for all` de eh_admin() cobrem juntas select/insert/update/delete —
-- para insert/update/delete só a segunda se aplica, então na prática só
-- admin grava. Mesmo padrão de imovel_tipos/imovel_fases
-- (011_imovel_tipos_fases.sql), com o "admin" agora checado por
-- eh_admin() em vez de "qualquer autenticado".
-- =====================================================================
create policy "crm_etapas_read" on public.crm_etapas for select
  using (auth.role() = 'authenticated');
create policy "crm_etapas_admin_write" on public.crm_etapas for all
  using (public.eh_admin()) with check (public.eh_admin());

create policy "crm_motivos_perda_read" on public.crm_motivos_perda for select
  using (auth.role() = 'authenticated');
create policy "crm_motivos_perda_admin_write" on public.crm_motivos_perda for all
  using (public.eh_admin()) with check (public.eh_admin());

create policy "crm_interacao_tipos_read" on public.crm_interacao_tipos for select
  using (auth.role() = 'authenticated');
create policy "crm_interacao_tipos_admin_write" on public.crm_interacao_tipos for all
  using (public.eh_admin()) with check (public.eh_admin());

create policy "crm_tags_read" on public.crm_tags for select
  using (auth.role() = 'authenticated');
create policy "crm_tags_admin_write" on public.crm_tags for all
  using (public.eh_admin()) with check (public.eh_admin());

-- =====================================================================
-- 10. RLS — crm_exclusoes
-- Só admin (é quem executa excluirLead — docs/crm-spec.md §3.5). Sem
-- policy de select para corretor: o registro de exclusão não precisa
-- ser visível fora da tela de administração.
-- =====================================================================
create policy "crm_exclusoes_admin_all" on public.crm_exclusoes for all
  using (public.eh_admin()) with check (public.eh_admin());

commit;

-- =====================================================================
-- FIM — 017_crm_funcoes_rls.sql
-- Confira com:
--   select public.eh_admin();  -- true só logado como profiles.role = 'admin'
--   select * from pg_policies where schemaname = 'public'
--     and tablename in ('leads','lead_financiamento','lead_home_equity',
--       'lead_imovel','lead_consorcio','lead_status_historico',
--       'lead_interacoes','crm_lembretes','lead_tags');
-- =====================================================================
