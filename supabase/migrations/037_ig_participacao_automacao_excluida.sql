-- 037: excluir uma automação mantém o histórico.
--
-- Antes, ig_participacoes.automacao_id era `not null ... on delete cascade`: apagar a
-- automação apagava as participações (e, em cascata, envios e cliques), mas
-- ig_mensagens.participacao_id é `on delete set null`, então as mensagens e o contato
-- ficavam órfãos. A caixa de entrada (que lista participações) esvaziava enquanto
-- ig_resumo_do_dia ainda contava o comentário.
--
-- Decisão do dono: a exclusão da automação preserva participações, mensagens e cliques.
-- A participação passa a ter automacao_id nulo e a caixa mostra "Automação excluída".
-- Apagar de verdade continua sendo só por "Excluir dados deste contato".
--
-- O unique (contato_id, automacao_id, midia_id) segue valendo: nulos são distintos.

alter table public.ig_participacoes
  alter column automacao_id drop not null;

alter table public.ig_participacoes
  drop constraint ig_participacoes_automacao_id_fkey;

alter table public.ig_participacoes
  add constraint ig_participacoes_automacao_id_fkey
  foreign key (automacao_id) references public.ig_automacoes(id) on delete set null;
