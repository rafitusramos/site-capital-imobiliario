# Estrutura de Leads e CRM — RT Capital Imobiliário

> Plano de implementação para migrar a captação de leads do Google Sheets para o
> Supabase, com estrutura preparada para o CRM da área administrativa.
> Documento de entrega ao Claude Code. Seguir as etapas na ordem.

---

## 1. Decisões de arquitetura (e por quê)

### 1.1 Modelo: tabela comum + tabelas de detalhe por tipo

Três caminhos eram possíveis:

| Abordagem | Veredito |
|---|---|
| Uma tabela larga com colunas nulas por tipo | Descartado — vira dezenas de colunas vazias, sem validação possível |
| Tabela comum + tudo em JSONB | Descartado como padrão — flexível, mas impossível de filtrar e relatar com confiança no CRM |
| **Tabela comum + tabela de detalhe por tipo** | **Escolhido** |

O motivo: os formulários têm formato **conhecido e estável**. Quando o formato é conhecido, coluna tipada ganha de JSONB — dá validação, índice, e relatório confiável ("ticket médio de financiamento por faixa de entrada" é uma query, não um parser).

JSONB continua entrando, mas só onde o dado é genuinamente imprevisível: UTM e metadados de tracking.

### 1.2 Status como tabela, não como CHECK

O funil da planilha tem cor, ordem e semântica (ganho/perda). Nada disso cabe num `CHECK`. Com tabela de apoio:

- o admin renderiza as cores direto do banco, igual à planilha;
- você adiciona uma etapa nova sem migração de schema;
- `is_final` e `is_ganho` permitem calcular taxa de conversão sem hardcodar strings no frontend.

### 1.3 Histórico de status obrigatório

Toda mudança de status é registrada por trigger. Isso habilita, sem trabalho extra depois:

- taxa de conversão entre etapas do funil;
- tempo médio parado em cada etapa;
- auditoria de quem moveu o quê (relevante quando houver mais de um corretor).

### 1.4 Escrita pública sai do cliente

O schema atual permite `insert` anônimo direto na tabela `leads`. Isso é convite a spam e a lixo no CRM. A captação passa a acontecer via **Server Action** com validação, e a policy de insert anônimo é removida.

---

## 2. Etapa 0 — Situação da tabela atual

Antes de qualquer coisa, verifique se a tabela `leads` já tem dados:

```sql
select count(*) from public.leads;
```

- **Retornou 0:** pode dropar e recriar (caminho limpo, adotado abaixo).
- **Retornou > 0:** exporte antes (`select * from public.leads;` → CSV) e me avise — o caminho passa a ser `ALTER TABLE`, não `DROP`.

---

## 3. Schema SQL

Rodar no SQL Editor do Supabase, na ordem.

### 3.1 Tabelas de apoio

```sql
-- =====================================================================
-- TIPOS DE LEAD
-- =====================================================================
create table public.lead_tipos (
  slug text primary key,
  label text not null,
  ordem int not null default 0,
  ativo boolean not null default true
);

insert into public.lead_tipos (slug, label, ordem, ativo) values
  ('financiamento', 'Financiamento',  1, true),
  ('home-equity',   'Home Equity',    2, true),
  ('imoveis',       'Imóveis',        3, true),
  ('consorcio',     'Consórcio',      4, false);  -- ativado quando o produto entrar

-- =====================================================================
-- STATUS DO FUNIL  (espelha o pipeline da planilha atual)
-- Cores em hex para o admin renderizar os chips coloridos.
-- Ajustar os hex à paleta da marca depois, se necessário.
-- =====================================================================
create table public.lead_status (
  slug text primary key,
  label text not null,
  cor_bg text not null,
  cor_texto text not null,
  ordem int not null,
  is_final boolean not null default false,  -- encerra o funil
  is_ganho boolean not null default false,  -- encerra com sucesso
  ativo boolean not null default true
);

insert into public.lead_status (slug, label, cor_bg, cor_texto, ordem, is_final, is_ganho) values
  ('criado',            'Criado',             '#E8E8E8', '#3A3A3A', 1, false, false),
  ('simulacao',         'Simulação',          '#FBE79B', '#5A4A10', 2, false, false),
  ('analise-credito',   'Análise de Crédito', '#B7D5EA', '#123A52', 3, false, false),
  ('credito-aprovado',  'Crédito Aprovado',   '#D6EDBD', '#31501C', 4, false, false),
  ('vistoria',          'Vistoria',           '#1F6F63', '#FFFFFF', 5, false, false),
  ('contrato-assinado', 'Contrato Assinado',  '#186B36', '#FFFFFF', 6, true,  true),
  ('perdido',           'Perdido',            '#C62828', '#FFFFFF', 7, true,  false);
```

### 3.2 Tabela comum de leads

```sql
-- Remover a tabela antiga (só se o count() da Etapa 0 deu zero)
drop table if exists public.leads cascade;

-- Sequência para o protocolo legível no CRM (ex.: RT-2026-0001)
create sequence if not exists public.lead_protocolo_seq;

create table public.leads (
  id uuid primary key default uuid_generate_v4(),
  protocolo text not null unique
    default 'RT-' || to_char(now(), 'YYYY') || '-' ||
            lpad(nextval('public.lead_protocolo_seq')::text, 4, '0'),

  -- classificação
  tipo   text not null references public.lead_tipos(slug),
  status text not null default 'criado' references public.lead_status(slug),

  -- dados comuns (o núcleo pedido)
  nome     text not null,
  email    text not null,
  telefone text not null,
  cpf      text,                      -- nulo na captação, preenchido na análise

  -- contexto de origem
  origem      text,                   -- 'simulador_financiamento', 'lp_imovel', 'blog'
  pagina_url  text,                   -- URL exata onde o formulário foi enviado
  imovel_id   uuid references public.imoveis(id) on delete set null,
  utm         jsonb default '{}'::jsonb,

  -- atribuição e operação
  corretor_id        uuid references public.profiles(id) on delete set null,
  enviado_whatsapp   boolean not null default false,
  enviado_crm        boolean not null default false,

  -- LGPD
  consentimento_lgpd boolean not null default false,
  consentimento_em   timestamptz,

  -- controle
  status_alterado_em timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_leads_status      on public.leads (status);
create index idx_leads_tipo        on public.leads (tipo);
create index idx_leads_created_at  on public.leads (created_at desc);
create index idx_leads_corretor    on public.leads (corretor_id);
create index idx_leads_email       on public.leads (lower(email));
create index idx_leads_cpf         on public.leads (cpf) where cpf is not null;

create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();
```

### 3.3 Tabelas de detalhe por tipo

Relação 1:1 com `leads`. A PK é a própria FK — garante um detalhe por lead.

```sql
-- ---------------------------------------------------------------------
-- FINANCIAMENTO — simulador da LP e da página de imóvel
-- ---------------------------------------------------------------------
create table public.lead_financiamento (
  lead_id uuid primary key references public.leads(id) on delete cascade,
  valor_imovel        numeric(14,2),
  percentual_entrada  numeric(5,2),      -- 20 a 80, do slider
  valor_entrada       numeric(14,2),
  valor_credito       numeric(14,2),
  prazo_meses         int,
  parcela_estimada    numeric(12,2),
  banco_simulado      text,              -- Caixa | Itau | Bradesco | Santander
  renda_mensal        numeric(12,2),
  usa_fgts            boolean,
  tipo_imovel         text,              -- residencial | comercial
  primeiro_imovel     boolean,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- HOME EQUITY — simulador de crédito com garantia
-- ---------------------------------------------------------------------
create table public.lead_home_equity (
  lead_id uuid primary key references public.leads(id) on delete cascade,
  valor_imovel_garantia numeric(14,2),
  imovel_quitado        boolean,
  saldo_devedor         numeric(14,2),   -- se não quitado
  valor_credito_desejado numeric(14,2),
  valor_credito_estimado numeric(14,2),  -- calculado pelo simulador
  prazo_meses           int,
  parcela_estimada      numeric(12,2),
  finalidade            text,            -- capital_giro | quitar_dividas | reforma | investimento | outro
  tipo_imovel           text,            -- residencial | comercial | terreno
  pessoa                text,            -- pf | pj
  renda_mensal          numeric(12,2),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- IMÓVEIS — pré-qualificação da landing page do imóvel (3 perguntas)
-- ---------------------------------------------------------------------
create table public.lead_imovel (
  lead_id uuid primary key references public.leads(id) on delete cascade,
  forma_pagamento   text,   -- financiamento | a_vista | fgts_financiamento | permuta
  prazo_compra      text,   -- imediato | ate_3_meses | ate_6_meses | pesquisando
  possui_entrada    text,   -- faixa de entrada disponível
  valor_entrada     numeric(14,2),
  ja_tem_aprovacao  boolean,
  observacoes       text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CONSÓRCIO — estrutura pronta, produto ainda inativo
-- ---------------------------------------------------------------------
create table public.lead_consorcio (
  lead_id uuid primary key references public.leads(id) on delete cascade,
  valor_carta        numeric(14,2),
  prazo_meses        int,
  parcela_estimada   numeric(12,2),
  objetivo           text,    -- imovel | reforma | investimento
  ja_possui_consorcio boolean,
  created_at timestamptz not null default now()
);
```

### 3.4 Histórico e interações

```sql
-- ---------------------------------------------------------------------
-- HISTÓRICO DE STATUS — alimentado automaticamente por trigger
-- ---------------------------------------------------------------------
create table public.lead_status_historico (
  id uuid primary key default uuid_generate_v4(),
  lead_id         uuid not null references public.leads(id) on delete cascade,
  status_anterior text references public.lead_status(slug),
  status_novo     text not null references public.lead_status(slug),
  alterado_por    uuid references public.profiles(id) on delete set null,
  observacao      text,
  created_at      timestamptz not null default now()
);

create index idx_lead_hist_lead on public.lead_status_historico (lead_id, created_at desc);

create or replace function public.log_lead_status_change()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.lead_status_historico (lead_id, status_anterior, status_novo, alterado_por)
    values (new.id, null, new.status, new.corretor_id);
    return new;
  end if;

  if (new.status is distinct from old.status) then
    insert into public.lead_status_historico (lead_id, status_anterior, status_novo, alterado_por)
    values (new.id, old.status, new.status, auth.uid());
    new.status_alterado_em = now();
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_lead_status_insert
  after insert on public.leads
  for each row execute function public.log_lead_status_change();

create trigger trg_lead_status_update
  before update on public.leads
  for each row execute function public.log_lead_status_change();

-- ---------------------------------------------------------------------
-- INTERAÇÕES — notas e registro de contato (base do CRM)
-- ---------------------------------------------------------------------
create table public.lead_interacoes (
  id uuid primary key default uuid_generate_v4(),
  lead_id    uuid not null references public.leads(id) on delete cascade,
  tipo       text not null check (tipo in ('nota','ligacao','whatsapp','email','reuniao','proposta')),
  conteudo   text not null,
  autor_id   uuid references public.profiles(id) on delete set null,
  agendado_para timestamptz,          -- follow-up
  concluido  boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_lead_interacoes_lead on public.lead_interacoes (lead_id, created_at desc);
create index idx_lead_interacoes_followup
  on public.lead_interacoes (agendado_para)
  where concluido = false;
```

### 3.5 View consolidada para o CRM

```sql
create or replace view public.vw_leads_crm as
select
  l.id, l.protocolo, l.nome, l.email, l.telefone, l.cpf,
  l.tipo,   t.label as tipo_label,
  l.status, s.label as status_label, s.cor_bg, s.cor_texto, s.ordem as status_ordem,
  s.is_final, s.is_ganho,
  l.origem, l.pagina_url, l.imovel_id, i.titulo as imovel_titulo,
  l.corretor_id, p.full_name as corretor_nome,
  l.created_at, l.status_alterado_em,
  extract(day from now() - l.status_alterado_em)::int as dias_no_status,
  (select count(*) from public.lead_interacoes li where li.lead_id = l.id) as total_interacoes
from public.leads l
join public.lead_tipos  t on t.slug = l.tipo
join public.lead_status s on s.slug = l.status
left join public.imoveis  i on i.id = l.imovel_id
left join public.profiles p on p.id = l.corretor_id;
```

### 3.6 RLS

```sql
alter table public.lead_tipos             enable row level security;
alter table public.lead_status            enable row level security;
alter table public.leads                  enable row level security;
alter table public.lead_financiamento     enable row level security;
alter table public.lead_home_equity       enable row level security;
alter table public.lead_imovel            enable row level security;
alter table public.lead_consorcio         enable row level security;
alter table public.lead_status_historico  enable row level security;
alter table public.lead_interacoes        enable row level security;

-- Tabelas de apoio: leitura pública (o front usa para montar selects e cores)
create policy "lead_tipos_read"  on public.lead_tipos  for select using (true);
create policy "lead_status_read" on public.lead_status for select using (true);

-- Leads e detalhes: NENHUM acesso anônimo.
-- A captação entra por Server Action com service_role.
create policy "leads_admin_all"        on public.leads               for all using (auth.role() = 'authenticated');
create policy "lead_fin_admin_all"     on public.lead_financiamento  for all using (auth.role() = 'authenticated');
create policy "lead_he_admin_all"      on public.lead_home_equity    for all using (auth.role() = 'authenticated');
create policy "lead_imovel_admin_all"  on public.lead_imovel         for all using (auth.role() = 'authenticated');
create policy "lead_cons_admin_all"    on public.lead_consorcio      for all using (auth.role() = 'authenticated');
create policy "lead_hist_admin_read"   on public.lead_status_historico for select using (auth.role() = 'authenticated');
create policy "lead_inter_admin_all"   on public.lead_interacoes     for all using (auth.role() = 'authenticated');
```

---

## 4. Migração dos dados do Google Sheets

### 4.1 Exportar

Na planilha: **Arquivo → Fazer download → CSV**. Salve como `leads_google_sheets.csv` na pasta `/scripts` do repositório.

### 4.2 Mapa de status

A planilha guarda o rótulo em texto. O banco guarda o slug. O script precisa deste de-para:

| Planilha | Banco |
|---|---|
| Criado | `criado` |
| Simulação | `simulacao` |
| Analise de Crédito | `analise-credito` |
| Crédito Aprovado | `credito-aprovado` |
| Vistoria | `vistoria` |
| Contrato Assinado | `contrato-assinado` |
| Perdido | `perdido` |
| *(vazio)* | `criado` |

### 4.3 Regras da importação

- **Preservar a data original** da planilha em `created_at` (não usar `now()`).
- **Normalizar telefone** para dígitos apenas, com DDD.
- **Normalizar CPF** para dígitos apenas; se inválido ou vazio, gravar `null`.
- **Inferir `tipo`** pela coluna de origem da planilha; se não der para inferir, usar `financiamento` e marcar em `observacoes` para revisão manual.
- **Desativar temporariamente o trigger de histórico** durante a carga, senão cada linha importada gera um evento falso de "Criado hoje".
- Rodar em **transação**: ou entra tudo, ou não entra nada.

---

## 5. Prompts para o Claude Code

Um por etapa. Não juntar.

### Prompt 1 — Schema

```
Crie o arquivo supabase/migrations/002_leads_crm.sql com o schema completo de
leads e CRM. O conteúdo exato do SQL está no documento plano_leads_crm_supabase.md,
seções 3.1 a 3.6 — copie de lá sem alterar nomes de tabela, coluna ou policy.

Depois atualize types/database.ts com os tipos TypeScript de todas as novas
tabelas e da view vw_leads_crm.

Não rode nada contra o banco. Apenas gere os arquivos.
```

> Você roda o SQL manualmente no SQL Editor e confere antes de seguir.

### Prompt 2 — Captação (substituir o Google Sheets)

```
Substitua o envio de leads para o Google Sheets por gravação no Supabase.

1. Crie lib/validations/lead.ts com schemas Zod para cada tipo de lead:
   financiamento, home-equity, imoveis. Validar: nome (mín. 3 palavras não,
   apenas mín. 3 caracteres), email válido, telefone brasileiro com DDD,
   CPF opcional mas validado por dígito verificador quando presente.

2. Crie app/actions/leads.ts com uma Server Action criarLead(tipo, dados) que:
   - valida a entrada com o schema Zod correspondente
   - usa o cliente admin do Supabase (service_role)
   - insere em public.leads e na tabela de detalhe correspondente
     dentro de uma única transação (use uma função RPC no Postgres se necessário
     para garantir atomicidade)
   - captura pagina_url e utm a partir dos parâmetros recebidos
   - retorna o protocolo gerado
   - NUNCA retorna dados de outros leads

3. Adicione rate limiting por IP: máximo 5 envios por hora.

4. Adicione honeypot anti-bot nos formulários (campo oculto que, se preenchido,
   descarta o envio silenciosamente).

5. Após inserção bem-sucedida, dispare a notificação de WhatsApp já existente.

6. Remova todo o código de integração com Google Sheets, mas mantenha os
   formulários visualmente idênticos — não altere layout nem campos visíveis.
```

### Prompt 3 — Importação do histórico

```
Crie scripts/import-leads-sheets.mjs que importa scripts/leads_google_sheets.csv
para o Supabase seguindo a seção 4 do documento plano_leads_crm_supabase.md.

Requisitos:
- usa service_role key lida de .env.local
- aplica o de-para de status da seção 4.2
- preserva created_at original
- normaliza telefone e CPF para dígitos apenas
- desativa o trigger de histórico durante a carga e reativa ao final
- roda em transação
- aceita a flag --dry-run que apenas imprime o que faria, sem gravar

Rode primeiro com --dry-run e me mostre o resultado antes de executar de verdade.
```

### Prompt 4 — CRM no admin

```
Implemente a área de CRM em /admin/leads.

1. app/admin/leads/page.tsx — visão de lista:
   - tabela alimentada por vw_leads_crm
   - colunas: protocolo, nome, telefone, tipo, status (chip colorido usando
     cor_bg e cor_texto vindos do banco), corretor, dias no status, data
   - filtros por tipo, status, corretor e período
   - busca por nome, email, telefone ou protocolo
   - paginação server-side

2. app/admin/leads/kanban/page.tsx — visão de funil:
   - uma coluna por status ativo, ordenada por lead_status.ordem
   - cards arrastáveis entre colunas (drag and drop atualiza o status)
   - contador e soma de valores por coluna

3. app/admin/leads/[id]/page.tsx — ficha do lead:
   - dados comuns editáveis
   - bloco com os dados específicos do tipo (financiamento, home equity ou imóvel)
   - seletor de status
   - timeline unindo lead_status_historico e lead_interacoes em ordem cronológica
   - campo para adicionar nota ou registrar contato
   - agendamento de follow-up

Todas as escritas via Server Actions. Nenhuma chamada direta ao Supabase
a partir de componente cliente.
```

---

## 6. Checkpoints

| Etapa | Como validar |
|---|---|
| Schema | `select * from public.vw_leads_crm;` roda sem erro (0 linhas é esperado) |
| Captação | Envie um lead de teste em cada formulário. Confira que gerou protocolo e que o detalhe foi gravado na tabela certa |
| Trigger | Mude o status de um lead de teste. `select * from lead_status_historico` deve mostrar a transição |
| Importação | `select status, count(*) from leads group by status` — os totais batem com a planilha? |
| Segurança | Tente inserir em `leads` usando a anon key pelo console do navegador. **Deve falhar** |

---

## 7. Decisões que ficaram em aberto

1. **CPF na captação ou na análise?** O plano assume nulo na captação. Se quiser pedir já no formulário, é mudar `cpf` para `not null` — mas espere queda de conversão.

2. **Um lead por envio ou um lead por pessoa?** Hoje, se a mesma pessoa simular financiamento e home equity, viram dois leads. É o mais simples e o mais comum em CRM de crédito. A alternativa (uma pessoa com vários interesses) exige uma tabela `pessoas` acima de `leads` — mais correto, mais trabalhoso. Recomendo começar simples e revisitar se virar problema real.

3. **CRM externo ainda entra?** Se a área de admin vai virar o CRM, o campo `enviado_crm` e a integração com plataforma externa podem deixar de fazer sentido. Vale decidir antes de investir na Etapa 4.

4. **Cores da paleta.** Os hex da seção 3.1 replicam a planilha. Se quiser alinhar ao preto quente + bronze da marca, é só atualizar a tabela `lead_status` — nenhuma linha de código muda.
