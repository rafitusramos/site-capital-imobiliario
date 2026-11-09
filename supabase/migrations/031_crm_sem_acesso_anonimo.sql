-- =====================================================================
-- 031_crm_sem_acesso_anonimo.sql
-- HOT-FIX de segurança: o papel `anon` (a chave pública do site, que vai no
-- navegador de todo visitante) lia, alterava e apagava leads sem responsável.
--
-- Causa: as policies do CRM foram criadas sem `to <papel>`, então valem para
-- `public` — inclusive `anon`. `leads_visiveis` libera `corretor_id is null`
-- (o lead novo do site), e para o anônimo `eh_admin()` é falso e `auth.uid()`
-- é nulo, mas `corretor_id is null` continua verdadeiro. As tabelas filhas
-- herdam o mesmo predicado. Somado ao grant padrão do Supabase para `anon`
-- nas tabelas do schema public, a chave pública dava acesso a nome, e-mail,
-- telefone, CPF e dados financeiros desses leads.
--
-- O site nunca precisa disso: o formulário grava pelo servidor, com a service
-- role (app/actions/leads.ts). Então a correção é dupla, por defesa em
-- profundidade:
--   1. revoga do `anon` todo privilégio nas tabelas e views do CRM;
--   2. restringe cada policy do CRM a `authenticated`.
-- Nenhuma regra de quem-vê-o-quê entre usuários logados muda.
--
-- Tabela nova de CRM: criar a policy com `to authenticated` e revogar do anon.
-- Sem BEGIN/COMMIT: a CLI já abre uma transação por arquivo.
-- =====================================================================

-- 1. Sem privilégio nenhum para o anônimo ------------------------------
revoke all on table
  public.leads,
  public.lead_financiamento,
  public.lead_home_equity,
  public.lead_imovel,
  public.lead_consorcio,
  public.lead_status_historico,
  public.lead_interacoes,
  public.lead_tags,
  public.crm_lembretes,
  public.crm_simulacoes,
  public.crm_emails,
  public.crm_exclusoes,
  public.crm_etapas,
  public.crm_interacao_tipos,
  public.crm_motivos_perda,
  public.crm_tags,
  public.vw_leads_crm,
  public.vw_crm_timeline
from anon;

-- Funções do CRM: security invoker, já barradas pelo item 1, mas sem motivo
-- para ficarem chamáveis pela chave pública.
revoke execute on function public.mover_lead_crm(uuid, text, text, text, timestamptz) from anon;
revoke execute on function public.registrar_interacao_crm(uuid, text, text, timestamptz, text) from anon;
revoke execute on function public.definir_tags_lead(uuid, text[]) from anon;

-- 2. Policies do CRM só para usuários logados ---------------------------
alter policy "leads_visiveis"                        on public.leads                 to authenticated;
alter policy "lead_financiamento_crud"               on public.lead_financiamento    to authenticated;
alter policy "lead_home_equity_crud"                 on public.lead_home_equity      to authenticated;
alter policy "lead_imovel_crud"                      on public.lead_imovel           to authenticated;
alter policy "lead_consorcio_crud"                   on public.lead_consorcio        to authenticated;
alter policy "lead_status_historico_select"          on public.lead_status_historico to authenticated;
alter policy "lead_interacoes_select"                on public.lead_interacoes       to authenticated;
alter policy "lead_interacoes_insert"                on public.lead_interacoes       to authenticated;
alter policy "lead_interacoes_update_autor_ou_admin" on public.lead_interacoes       to authenticated;
alter policy "lead_interacoes_delete_autor_ou_admin" on public.lead_interacoes       to authenticated;
alter policy "lead_tags_crud"                        on public.lead_tags             to authenticated;
alter policy "crm_lembretes_crud"                    on public.crm_lembretes         to authenticated;
alter policy "crm_simulacoes_select"                 on public.crm_simulacoes        to authenticated;
alter policy "crm_emails_admin_read"                 on public.crm_emails            to authenticated;
alter policy "crm_exclusoes_admin_all"               on public.crm_exclusoes         to authenticated;
alter policy "crm_etapas_read"                       on public.crm_etapas            to authenticated;
alter policy "crm_etapas_admin_write"                on public.crm_etapas            to authenticated;
alter policy "crm_interacao_tipos_read"              on public.crm_interacao_tipos   to authenticated;
alter policy "crm_interacao_tipos_admin_write"       on public.crm_interacao_tipos   to authenticated;
alter policy "crm_motivos_perda_read"                on public.crm_motivos_perda     to authenticated;
alter policy "crm_motivos_perda_admin_write"         on public.crm_motivos_perda     to authenticated;
alter policy "crm_tags_read"                         on public.crm_tags              to authenticated;
alter policy "crm_tags_admin_write"                  on public.crm_tags              to authenticated;

-- Verificação (somente leitura, depois de aplicada):
--   begin; set local role anon; select count(*) from public.leads; rollback;
--     -> erro "permission denied for table leads"
--   select tablename, policyname, roles from pg_policies
--    where schemaname = 'public' and roles::text = '{public}';
--     -> nenhuma tabela do CRM na lista
