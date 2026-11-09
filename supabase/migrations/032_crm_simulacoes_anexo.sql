-- =====================================================================
-- 031_crm_simulacoes_anexo.sql
-- Simulação passa a ser ANEXADA ao lead e só é enviada no movimento
-- (docs/crm-spec.md §3.7).
--
-- 1. email_status aceita 'anexado': o PDF está gravado, nenhum e-mail saiu.
--    O check inline da 030 foi nomeado pelo Postgres como
--    crm_simulacoes_email_status_check (padrão <tabela>_<coluna>_check).
--    As linhas existentes ('enviado') continuam válidas: nada a migrar.
--
-- 2. enviado_em: quando o e-mail foi de fato enviado. Também serve de trava
--    contra duplo envio (o servidor a preenche antes de chamar o Resend).
--    Nulo = ainda não enviada. Sem backfill: a linha 'enviado' da 030 fica
--    com nulo e a tela cai para created_at.
--
-- Sem BEGIN/COMMIT: o CLI já envolve cada arquivo numa transação.
-- =====================================================================

alter table public.crm_simulacoes drop constraint if exists crm_simulacoes_email_status_check;
alter table public.crm_simulacoes
  add constraint crm_simulacoes_email_status_check
  check (email_status in ('anexado', 'enviado', 'falhou', 'sem-chave'));

alter table public.crm_simulacoes add column if not exists enviado_em timestamptz;
