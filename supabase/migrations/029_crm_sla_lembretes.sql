-- =====================================================================
-- 029_crm_sla_lembretes.sql
-- SLA em dias úteis, lembrete automático por etapa e usuário de QA oculto.
--
-- 1. SLA EM DIAS ÚTEIS
--    `crm_etapas.sla_dias` passa a significar DIAS ÚTEIS (segunda a sexta,
--    SEM calendário de feriados) e ganha os valores abaixo, para todos os
--    pipelines que usam cada slug. Prazos: criado 1, simulacao 2,
--    qualificacao 2, apresentacao 2, pre-aprovacao 5, vistoria 5, visita 5,
--    proposta 5, contrato 10. ganho/perdido/nao-qualificado seguem nulos.
--    lib/crm/etapas.ts espelha os valores (tests/unidade/crm-etapas.test.ts
--    lê ESTE arquivo e compara) e lib/crm/dias-uteis.ts usa a mesma régua de
--    `somar_dias_uteis` na barra de tempo do card.
--
-- 2. LEMBRETE AUTOMÁTICO
--    Ao entrar numa etapa com SLA (lead novo ou troca de etapa), um trigger
--    cria um lembrete `automatico = true` para o fim do prazo (18:00 de São
--    Paulo, `somar_dias_uteis`). Na troca de etapa, os lembretes automáticos
--    ainda pendentes do lead são APAGADOS antes (substituição: o prazo da
--    etapa antiga deixou de valer); lembretes manuais nunca são tocados. O
--    movimento continua passando só por `mover_lead_crm`, sem alteração.
--
--    SECURITY DEFINER: leads do site entram por RPC anônima e a RLS de
--    `crm_lembretes` bloquearia o insert do trigger. `criado_por` é
--    `auth.uid()`, nulo em lead do site — a timeline (vw_crm_timeline, 024)
--    junta `profiles` com LEFT JOIN e a interface omite o autor quando vazio.
--
--    A falha do trigger NUNCA pode impedir a captação do lead nem o
--    movimento de etapa: o corpo está num bloco `exception when others` que
--    só emite WARNING.
--
--    SEM carga retroativa: só há 1 lead ativo e ele já tem lembrete; criar
--    lembrete para leads existentes seria barulho sem ganho.
--
-- 3. USUÁRIO OCULTO NO CRM
--    `profiles.oculto_no_crm` tira o usuário de QA ("QA Automação") das
--    listas de responsável. Coluna nova SEM grant de UPDATE (a 020 deixou o
--    UPDATE de `profiles` só nas colunas editáveis pelo dono): ninguém se
--    desoculta nem se oculta pela API. Segue legível pelo SELECT existente.
--    A aplicação lê com select("*") e filtra em JS (getDominios) para o
--    deploy desta branch não quebrar antes de a migration rodar.
--
-- Aplicada pelo workflow migrations-supabase (supabase db push), que já roda
-- cada arquivo numa transação: por isso não há begin/commit aqui.
-- =====================================================================

-- 1. SLA em dias úteis -------------------------------------------------
update public.crm_etapas set sla_dias = 1  where slug = 'criado';
update public.crm_etapas set sla_dias = 2  where slug = 'simulacao';
update public.crm_etapas set sla_dias = 2  where slug = 'qualificacao';
update public.crm_etapas set sla_dias = 2  where slug = 'apresentacao';
update public.crm_etapas set sla_dias = 5  where slug = 'pre-aprovacao';
update public.crm_etapas set sla_dias = 5  where slug = 'vistoria';
update public.crm_etapas set sla_dias = 5  where slug = 'visita';
update public.crm_etapas set sla_dias = 5  where slug = 'proposta';
update public.crm_etapas set sla_dias = 10 where slug = 'contrato';

comment on column public.crm_etapas.sla_dias is
  'Prazo da etapa em DIAS ÚTEIS (seg-sex, sem feriados); alimenta a barra de tempo e o lembrete automático (029).';

-- 2. Lembrete automático ----------------------------------------------
alter table public.crm_lembretes
  add column automatico boolean not null default false;

-- Parte da DATA de São Paulo de p_inicio, avança p_dias dias úteis
-- (seg-sex) estritamente depois dela e devolve 18:00 de SP nesse dia.
-- Sexta 10:00 + 1 = segunda 18:00; sábado + 1 = segunda 18:00;
-- segunda 10:00 + 1 = terça 18:00.
create or replace function public.somar_dias_uteis(p_inicio timestamptz, p_dias int)
returns timestamptz
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_dia       date := (p_inicio at time zone 'America/Sao_Paulo')::date;
  v_restantes int  := greatest(coalesce(p_dias, 0), 0);
begin
  while v_restantes > 0 loop
    v_dia := v_dia + 1;
    if extract(isodow from v_dia) < 6 then
      v_restantes := v_restantes - 1;
    end if;
  end loop;
  return (v_dia + time '18:00') at time zone 'America/Sao_Paulo';
end;
$$;

create or replace function public.agendar_lembrete_sla()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_etapa public.crm_etapas%rowtype;
begin
  begin
    if tg_op = 'UPDATE' then
      if new.status is not distinct from old.status then
        return new;
      end if;
      -- Substituição: o prazo da etapa anterior deixou de valer. Só os
      -- automáticos pendentes; lembrete manual fica intacto.
      delete from public.crm_lembretes
       where lead_id = new.id and automatico and not concluido;
    end if;

    select * into v_etapa
      from public.crm_etapas
     where tipo = new.tipo and slug = new.status;

    if found and v_etapa.sla_dias is not null then
      insert into public.crm_lembretes (lead_id, agendado_para, descricao, criado_por, automatico)
      values (
        new.id,
        public.somar_dias_uteis(now(), v_etapa.sla_dias),
        'Prazo da etapa ' || v_etapa.label || ' (' || v_etapa.sla_dias
          || case when v_etapa.sla_dias = 1 then ' dia útil' else ' dias úteis' end
          || '): dar andamento ao lead.',
        auth.uid(),
        true
      );
    end if;
  exception when others then
    -- Jamais derrubar a captação do lead nem o movimento de etapa por causa
    -- de um lembrete: registra e segue.
    raise warning 'agendar_lembrete_sla falhou para o lead %: % (%)', new.id, sqlerrm, sqlstate;
  end;
  return new;
end;
$$;

-- Funções fora da API REST (mesmo padrão da 018/0181). somar_dias_uteis é só
-- de uso interno, e exposta deixaria um anônimo prender o banco no laço com um
-- p_dias enorme. O trigger segue funcionando: a função dele é security definer.
revoke execute on function public.agendar_lembrete_sla() from public, anon, authenticated;
revoke execute on function public.somar_dias_uteis(timestamptz, int) from public, anon, authenticated;

create trigger trg_leads_lembrete_sla
  after insert or update of status on public.leads
  for each row execute function public.agendar_lembrete_sla();

-- 3. Usuário oculto no CRM --------------------------------------------
alter table public.profiles
  add column oculto_no_crm boolean not null default false;

update public.profiles
   set oculto_no_crm = true
 where id = 'ed59a2fd-31c7-4184-8a73-0ad5630948e3'; -- "QA Automação"

-- Verificação (somente leitura):
--   select public.somar_dias_uteis('2026-07-17 10:00-03', 1);  -- seg 20/07 18:00-03
--   select public.somar_dias_uteis('2026-07-18 10:00-03', 1);  -- seg 20/07 18:00-03
--   select public.somar_dias_uteis('2026-07-13 10:00-03', 1);  -- ter 14/07 18:00-03
--   select has_column_privilege('authenticated', 'public.profiles', 'oculto_no_crm', 'UPDATE'); -- false
