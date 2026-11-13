-- Data em que o conteúdo do artigo foi revisado de verdade (YMYL: o leitor e o
-- Google veem "Revisado em" e dateModified). Não usa updated_at, que muda a cada
-- salvamento no admin e sinalizaria revisão que não houve.
alter table public.posts add column if not exists revisado_em date;

comment on column public.posts.revisado_em is
  'Data em que o conteúdo foi revisado de verdade, preenchida à mão no admin. Diferente de updated_at, que muda a cada salvamento. Alimenta "Revisado em", dateModified do JSON-LD e lastmod do sitemap.';

-- Não pode ser anterior ao dia de publicação (São Paulo). published_at é nulo em rascunho.
alter table public.posts drop constraint if exists posts_revisado_em_apos_publicacao;
alter table public.posts add constraint posts_revisado_em_apos_publicacao
  check (
    revisado_em is null
    or published_at is null
    or revisado_em >= (published_at at time zone 'America/Sao_Paulo')::date
  );
