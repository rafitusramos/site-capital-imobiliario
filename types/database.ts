export type ProfileRole = "admin" | "corretor";
export type PostStatus = "draft" | "published" | "archived";
export type ImovelStatus = "ativo" | "reservado" | "vendido" | "inativo";
export type ImovelImagemGrupo = "empreendimento" | "decorado" | "planta" | "implantacao";
export type ImovelDiferencialGrupo = "lazer" | "diferencial";
export type LeadTipoSlug = "financiamento" | "home-equity" | "imoveis" | "consorcio";
// Substitui LeadStatusSlug (funil único) a partir de 014_crm_pipelines.sql:
// agora cada LeadTipoSlug tem seu próprio pipeline em crm_etapas, e os 12
// slugs abaixo são a união de todas as etapas de todos os pipelines — não
// significa que um dado `tipo` aceite os 12 (a FK composta (tipo, status)
// que restringe isso é responsabilidade do banco, não do tipo TS).
export type LeadEtapaSlug =
  | "criado"
  | "simulacao"
  | "pre-aprovacao"
  | "vistoria"
  | "contrato"
  | "ganho"
  | "perdido"
  | "apresentacao"
  | "proposta"
  | "qualificacao"
  | "visita"
  | "nao-qualificado";
export type LeadInteracaoTipo =
  | "nota"
  | "ligacao"
  | "whatsapp"
  | "email"
  | "reuniao"
  | "proposta"
  | "visita"
  | "contrato"
  | "sistema";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: ProfileRole;
          avatar_url: string | null;
          phone: string | null;
          creci: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: ProfileRole;
          avatar_url?: string | null;
          phone?: string | null;
          creci?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          slug: string;
          title: string;
          excerpt: string | null;
          content: string;
          cover_image: string | null;
          category_id: string | null;
          author_id: string | null;
          status: PostStatus;
          published_at: string | null;
          seo_title: string | null;
          seo_description: string | null;
          canonical_url: string | null;
          rotulo: string | null;
          cta_pagina: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          excerpt?: string | null;
          content: string;
          cover_image?: string | null;
          category_id?: string | null;
          author_id?: string | null;
          status?: PostStatus;
          published_at?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          canonical_url?: string | null;
          rotulo?: string | null;
          cta_pagina?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]>;
        Relationships: [];
      };
      // Domínio de tipos de imóvel (011_imovel_tipos_fases.sql). Normaliza a
      // antiga coluna texto `imoveis.tipo` (com CHECK), no mesmo padrão de
      // `categories`.
      imovel_tipos: {
        Row: {
          id: string;
          slug: string;
          nome: string;
          ordem: number;
          ativo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          nome: string;
          ordem?: number;
          ativo?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["imovel_tipos"]["Insert"]>;
        Relationships: [];
      };
      // Domínio de fases comerciais do imóvel (011_imovel_tipos_fases.sql).
      // Os slugs são chave no código: mapa de ícones da timeline
      // (app/(site)/imoveis/[slug]/page.tsx) e seletores CSS
      // [data-fase="..."] (styles/imoveis.css). Não mudar sem atualizar os dois.
      imovel_fases: {
        Row: {
          id: string;
          slug: string;
          nome: string;
          ordem: number;
          ativo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          nome: string;
          ordem?: number;
          ativo?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["imovel_fases"]["Insert"]>;
        Relationships: [];
      };
      // Empreendimento em lançamento (007_imoveis_empreendimentos.sql).
      // As colunas de unidade avulsa de revenda (valor_venda, metragem,
      // dormitorios…) foram substituídas por faixas *_min/*_max. tipo_id e
      // fase_id (011_imovel_tipos_fases.sql) substituem as antigas colunas
      // texto `tipo`/`fase`.
      imoveis: {
        Row: {
          id: string;
          slug: string;
          titulo: string;
          tipo_id: string;
          fase_id: string;
          bairro: string | null;
          cidade: string | null;
          estado: string | null;
          endereco: string | null;
          cep: string | null;
          area_min: number | null;
          area_max: number | null;
          dormitorios_min: number | null;
          dormitorios_max: number | null;
          banheiros_min: number | null;
          banheiros_max: number | null;
          vagas_min: number | null;
          vagas_max: number | null;
          valor_a_partir_de: number | null;
          valor_sob_consulta: boolean;
          previsao_entrega: string | null;
          construtora: string | null;
          construtora_logo_url: string | null;
          descricao_breve: string | null;
          descricao_completa: string | null;
          descricao_unidades: string | null;
          seo_title: string | null;
          seo_description: string | null;
          ordem: number;
          latitude: number | null;
          longitude: number | null;
          video_youtube_url: string | null;
          status: ImovelStatus;
          corretor_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          titulo: string;
          tipo_id: string;
          fase_id: string;
          bairro?: string | null;
          cidade?: string | null;
          estado?: string | null;
          endereco?: string | null;
          cep?: string | null;
          area_min?: number | null;
          area_max?: number | null;
          dormitorios_min?: number | null;
          dormitorios_max?: number | null;
          banheiros_min?: number | null;
          banheiros_max?: number | null;
          vagas_min?: number | null;
          vagas_max?: number | null;
          valor_a_partir_de?: number | null;
          valor_sob_consulta?: boolean;
          previsao_entrega?: string | null;
          construtora?: string | null;
          construtora_logo_url?: string | null;
          descricao_breve?: string | null;
          descricao_completa?: string | null;
          descricao_unidades?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          ordem?: number;
          latitude?: number | null;
          longitude?: number | null;
          video_youtube_url?: string | null;
          status?: ImovelStatus;
          corretor_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["imoveis"]["Insert"]>;
        Relationships: [];
      };
      imovel_imagens: {
        Row: {
          id: string;
          imovel_id: string;
          url: string;
          ambiente: string | null;
          grupo: ImovelImagemGrupo;
          ordem: number;
          destaque: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          imovel_id: string;
          url: string;
          ambiente?: string | null;
          grupo?: ImovelImagemGrupo;
          ordem?: number;
          destaque?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["imovel_imagens"]["Insert"]>;
        Relationships: [];
      };
      imovel_tipologias: {
        Row: {
          id: string;
          imovel_id: string;
          nome: string;
          area: number | null;
          dormitorios: number | null;
          suites: number | null;
          banheiros: number | null;
          vagas: number | null;
          valor_a_partir_de: number | null;
          planta_url: string | null;
          ordem: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          imovel_id: string;
          nome: string;
          area?: number | null;
          dormitorios?: number | null;
          suites?: number | null;
          banheiros?: number | null;
          vagas?: number | null;
          valor_a_partir_de?: number | null;
          planta_url?: string | null;
          ordem?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["imovel_tipologias"]["Insert"]>;
        Relationships: [];
      };
      imovel_diferenciais: {
        Row: {
          id: string;
          imovel_id: string;
          grupo: ImovelDiferencialGrupo;
          nome: string;
          /** slug do catálogo em components/imoveis/icones.tsx */
          icone: string | null;
          ordem: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          imovel_id: string;
          grupo?: ImovelDiferencialGrupo;
          nome: string;
          icone?: string | null;
          ordem?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["imovel_diferenciais"]["Insert"]>;
        Relationships: [];
      };
      imovel_faqs: {
        Row: {
          id: string;
          imovel_id: string;
          pergunta: string;
          resposta: string;
          ordem: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          imovel_id: string;
          pergunta: string;
          resposta: string;
          ordem?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["imovel_faqs"]["Insert"]>;
        Relationships: [];
      };
      lead_tipos: {
        Row: {
          slug: LeadTipoSlug;
          label: string;
          ordem: number;
          ativo: boolean;
        };
        Insert: {
          slug: LeadTipoSlug;
          label: string;
          ordem?: number;
          ativo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["lead_tipos"]["Insert"]>;
        Relationships: [];
      };
      // Etapas por pipeline (014_crm_pipelines.sql). Substitui lead_status:
      // agora há um conjunto de etapas por LeadTipoSlug, não um funil único.
      // PK composta (tipo, slug) — a FK leads_etapa_fkey usa as duas colunas.
      crm_etapas: {
        Row: {
          tipo: LeadTipoSlug;
          slug: LeadEtapaSlug;
          label: string;
          ordem: number;
          cor_bg: string;
          cor_texto: string;
          is_inicial: boolean;
          is_final: boolean;
          is_ganho: boolean;
          exige_motivo: boolean;
          sla_dias: number | null;
          ativo: boolean;
        };
        Insert: {
          tipo: LeadTipoSlug;
          slug: LeadEtapaSlug;
          label: string;
          ordem: number;
          cor_bg: string;
          cor_texto: string;
          is_inicial?: boolean;
          is_final?: boolean;
          is_ganho?: boolean;
          exige_motivo?: boolean;
          sla_dias?: number | null;
          ativo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["crm_etapas"]["Insert"]>;
        Relationships: [];
      };
      // Motivos de perda/não qualificação (014_crm_pipelines.sql). Tabela
      // configurável por SQL (fora de escopo ter editor na interface por
      // ora) — por isso `slug` é `string`, não um union fixo: a lista pode
      // crescer sem exigir deploy de código. O slug 'outro' é o único
      // tratado de forma especial (mover_lead_crm exige motivo_obs).
      crm_motivos_perda: {
        Row: {
          slug: string;
          label: string;
          ordem: number;
          ativo: boolean;
        };
        Insert: {
          slug: string;
          label: string;
          ordem?: number;
          ativo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["crm_motivos_perda"]["Insert"]>;
        Relationships: [];
      };
      // Domínio de tipos de interação (015_crm_interacoes_lembretes.sql).
      // Normaliza o antigo CHECK de lead_interacoes.tipo — mesmo padrão de
      // imovel_tipos (011_imovel_tipos_fases.sql). `slug` reaproveita o
      // union LeadInteracaoTipo: os 9 valores seedados são exatamente os 9
      // que o union enumera.
      crm_interacao_tipos: {
        Row: {
          slug: LeadInteracaoTipo;
          label: string;
          /** slug do catálogo em components/admin/crm/icones.tsx */
          icone: string;
          ordem: number;
          ativo: boolean;
        };
        Insert: {
          slug: LeadInteracaoTipo;
          label: string;
          icone: string;
          ordem?: number;
          ativo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["crm_interacao_tipos"]["Insert"]>;
        Relationships: [];
      };
      // Lembrete de follow-up (015_crm_interacoes_lembretes.sql). Tabela
      // própria, não coluna em lead_interacoes: um lead pode ter mais de um
      // lembrete aberto, e "o contato aconteceu" (interação) não é o mesmo
      // que "o follow-up foi cumprido" (lembrete).
      crm_lembretes: {
        Row: {
          id: string;
          lead_id: string;
          interacao_id: string | null;
          agendado_para: string;
          descricao: string;
          concluido: boolean;
          concluido_em: string | null;
          concluido_por: string | null;
          criado_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          interacao_id?: string | null;
          agendado_para: string;
          descricao: string;
          concluido?: boolean;
          concluido_em?: string | null;
          concluido_por?: string | null;
          criado_por?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["crm_lembretes"]["Insert"]>;
        Relationships: [];
      };
      // Tags livres do CRM (016_crm_campos_e_tags.sql). `slug` fica `string`
      // pelo mesmo motivo de crm_motivos_perda: sem editor na interface
      // ainda, a lista cresce só por SQL Editor.
      crm_tags: {
        Row: {
          slug: string;
          label: string;
          cor: string;
          ordem: number;
          ativo: boolean;
        };
        Insert: {
          slug: string;
          label: string;
          cor?: string;
          ordem?: number;
          ativo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["crm_tags"]["Insert"]>;
        Relationships: [];
      };
      // Associação lead <-> tag, N:N (016_crm_campos_e_tags.sql). PK
      // composta — não há id próprio, a linha inteira é a chave.
      lead_tags: {
        Row: {
          lead_id: string;
          tag_slug: string;
        };
        Insert: {
          lead_id: string;
          tag_slug: string;
        };
        Update: Partial<Database["public"]["Tables"]["lead_tags"]["Insert"]>;
        Relationships: [];
      };
      // Registro de exclusão definitiva (016_crm_campos_e_tags.sql), para
      // que apagar dado a pedido do titular (LGPD) fique comprovável sem
      // guardar dado pessoal nenhum — só protocolo, tipo e quem excluiu.
      crm_exclusoes: {
        Row: {
          id: string;
          protocolo: string;
          tipo: string;
          excluido_por: string | null;
          motivo: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          protocolo: string;
          tipo: string;
          excluido_por?: string | null;
          motivo?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["crm_exclusoes"]["Insert"]>;
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          protocolo: string;
          tipo: LeadTipoSlug;
          // Etapa dentro do pipeline do tipo (crm_etapas), não mais um
          // funil global único — ver comment on column no banco
          // (014_crm_pipelines.sql) e LeadEtapaSlug acima.
          status: LeadEtapaSlug;
          nome: string;
          email: string;
          telefone: string;
          cpf: string | null;
          origem: string | null;
          pagina_url: string | null;
          imovel_id: string | null;
          utm: Record<string, unknown> | null;
          corretor_id: string | null;
          enviado_whatsapp: boolean;
          enviado_crm: boolean;
          consentimento_lgpd: boolean;
          consentimento_em: string | null;
          // Motivo obrigatório ao entrar em 'perdido'/'nao-qualificado'
          // (mover_lead_crm, 017_crm_funcoes_rls.sql). Nulo fora dessas etapas.
          motivo_perda: string | null;
          motivo_obs: string | null;
          favorito: boolean;
          // Arquivar preserva o dado (a lixeira do CRM); exclusão definitiva
          // é ação separada, registrada em crm_exclusoes.
          arquivado_em: string | null;
          arquivado_por: string | null;
          // Extensibilidade sem migration: campos com `fonte: "extra"` em
          // lib/crm/campos.ts gravam aqui (docs/crm-spec.md §3.4).
          campos_extras: Record<string, unknown>;
          status_alterado_em: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          protocolo?: string;
          tipo: LeadTipoSlug;
          status?: LeadEtapaSlug;
          nome: string;
          email: string;
          telefone: string;
          cpf?: string | null;
          origem?: string | null;
          pagina_url?: string | null;
          imovel_id?: string | null;
          utm?: Record<string, unknown> | null;
          corretor_id?: string | null;
          enviado_whatsapp?: boolean;
          enviado_crm?: boolean;
          consentimento_lgpd?: boolean;
          consentimento_em?: string | null;
          motivo_perda?: string | null;
          motivo_obs?: string | null;
          favorito?: boolean;
          arquivado_em?: string | null;
          arquivado_por?: string | null;
          campos_extras?: Record<string, unknown>;
          status_alterado_em?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
        Relationships: [];
      };
      lead_financiamento: {
        Row: {
          lead_id: string;
          valor_imovel: number | null;
          percentual_entrada: number | null;
          valor_entrada: number | null;
          valor_credito: number | null;
          prazo_meses: number | null;
          parcela_estimada: number | null;
          banco_simulado: string | null;
          renda_mensal: number | null;
          usa_fgts: boolean | null;
          tipo_imovel: string | null;
          primeiro_imovel: boolean | null;
          tipo_remuneracao: string | null;
          momento_compra: string | null;
          cidade: string | null;
          estado: string | null;
          created_at: string;
        };
        Insert: {
          lead_id: string;
          valor_imovel?: number | null;
          percentual_entrada?: number | null;
          valor_entrada?: number | null;
          valor_credito?: number | null;
          prazo_meses?: number | null;
          parcela_estimada?: number | null;
          banco_simulado?: string | null;
          renda_mensal?: number | null;
          usa_fgts?: boolean | null;
          tipo_imovel?: string | null;
          primeiro_imovel?: boolean | null;
          tipo_remuneracao?: string | null;
          momento_compra?: string | null;
          cidade?: string | null;
          estado?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["lead_financiamento"]["Insert"]>;
        Relationships: [];
      };
      lead_home_equity: {
        Row: {
          lead_id: string;
          valor_imovel_garantia: number | null;
          imovel_quitado: boolean | null;
          saldo_devedor: number | null;
          valor_credito_desejado: number | null;
          valor_credito_estimado: number | null;
          prazo_meses: number | null;
          parcela_estimada: number | null;
          finalidade: string | null;
          tipo_imovel: string | null;
          pessoa: string | null;
          renda_mensal: number | null;
          tipo_remuneracao: string | null;
          cep: string | null;
          numero: string | null;
          area_m2: number | null;
          // quitado | financiado | alienado | inventario (016_crm_campos_e_tags.sql)
          situacao_imovel: string | null;
          created_at: string;
        };
        Insert: {
          lead_id: string;
          valor_imovel_garantia?: number | null;
          imovel_quitado?: boolean | null;
          saldo_devedor?: number | null;
          valor_credito_desejado?: number | null;
          valor_credito_estimado?: number | null;
          prazo_meses?: number | null;
          parcela_estimada?: number | null;
          finalidade?: string | null;
          tipo_imovel?: string | null;
          pessoa?: string | null;
          renda_mensal?: number | null;
          tipo_remuneracao?: string | null;
          cep?: string | null;
          numero?: string | null;
          area_m2?: number | null;
          situacao_imovel?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["lead_home_equity"]["Insert"]>;
        Relationships: [];
      };
      lead_imovel: {
        Row: {
          lead_id: string;
          forma_pagamento: string | null;
          prazo_compra: string | null;
          possui_entrada: string | null;
          valor_entrada: number | null;
          ja_tem_aprovacao: boolean | null;
          observacoes: string | null;
          // texto livre p/ imóvel fora do catálogo (016_crm_campos_e_tags.sql)
          imovel_desejado: string | null;
          orcamento_max: number | null;
          cidade_preferida: string | null;
          dormitorios_min: number | null;
          tipo_imovel: string | null;
          created_at: string;
        };
        Insert: {
          lead_id: string;
          forma_pagamento?: string | null;
          prazo_compra?: string | null;
          possui_entrada?: string | null;
          valor_entrada?: number | null;
          ja_tem_aprovacao?: boolean | null;
          observacoes?: string | null;
          imovel_desejado?: string | null;
          orcamento_max?: number | null;
          cidade_preferida?: string | null;
          dormitorios_min?: number | null;
          tipo_imovel?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["lead_imovel"]["Insert"]>;
        Relationships: [];
      };
      lead_consorcio: {
        Row: {
          lead_id: string;
          valor_carta: number | null;
          prazo_meses: number | null;
          parcela_estimada: number | null;
          objetivo: string | null;
          ja_possui_consorcio: boolean | null;
          // imovel | veiculo | servicos (016_crm_campos_e_tags.sql)
          segmento: string | null;
          grupo: string | null;
          // nao-contemplado | em-lance | contemplado
          contemplacao: string | null;
          created_at: string;
        };
        Insert: {
          lead_id: string;
          valor_carta?: number | null;
          prazo_meses?: number | null;
          parcela_estimada?: number | null;
          objetivo?: string | null;
          ja_possui_consorcio?: boolean | null;
          segmento?: string | null;
          grupo?: string | null;
          contemplacao?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["lead_consorcio"]["Insert"]>;
        Relationships: [];
      };
      lead_status_historico: {
        Row: {
          id: string;
          lead_id: string;
          status_anterior: LeadEtapaSlug | null;
          status_novo: LeadEtapaSlug;
          alterado_por: string | null;
          observacao: string | null;
          // Motivo da transição, copiado de leads.motivo_perda/motivo_obs
          // pelo trigger log_lead_status_change no momento da mudança
          // (017_crm_funcoes_rls.sql) — fica preso à transição, não só ao
          // estado atual do lead.
          motivo_perda: string | null;
          motivo_obs: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          status_anterior?: LeadEtapaSlug | null;
          status_novo: LeadEtapaSlug;
          alterado_por?: string | null;
          observacao?: string | null;
          motivo_perda?: string | null;
          motivo_obs?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["lead_status_historico"]["Insert"]>;
        Relationships: [];
      };
      // Taxas dos simuladores públicos (013_parametros_simulador.sql).
      // Tabela singleton (uma linha só, id = 1) editável em /admin/parametros.
      // As taxas são gravadas em decimal (0.115), não percentual (11.5) —
      // ver lib/parametros/taxa.ts para a conversão usada pelo formulário.
      parametros_simulador: {
        Row: {
          id: number;
          financiamento_taxa_anual: number;
          home_equity_taxa_mensal: number;
          updated_at: string;
          atualizado_por: string | null;
        };
        Insert: {
          id?: number;
          financiamento_taxa_anual: number;
          home_equity_taxa_mensal: number;
          updated_at?: string;
          atualizado_por?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["parametros_simulador"]["Insert"]>;
        Relationships: [];
      };
      lead_interacoes: {
        Row: {
          id: string;
          lead_id: string;
          tipo: LeadInteracaoTipo;
          conteudo: string;
          autor_id: string | null;
          // O follow-up virou tabela própria (crm_lembretes,
          // 015_crm_interacoes_lembretes.sql); agendado_para/concluido
          // saíram daqui.
          automatica: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          tipo: LeadInteracaoTipo;
          conteudo: string;
          autor_id?: string | null;
          automatica?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["lead_interacoes"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      // Consulta consolidada do quadro do CRM (recriada em
      // 016_crm_campos_e_tags.sql — a versão anterior, de
      // 002_leads_crm.sql, usava lead_status em vez de crm_etapas e não
      // tinha etapa/negócio/tags/lembrete). Filtra arquivados
      // (arquivado_em is null) — nunca use `leads` direto para o quadro.
      vw_leads_crm: {
        Row: {
          id: string;
          protocolo: string;
          nome: string;
          email: string;
          telefone: string;
          cpf: string | null;
          tipo: LeadTipoSlug;
          tipo_label: string;
          status: LeadEtapaSlug;
          etapa_label: string;
          cor_bg: string;
          cor_texto: string;
          etapa_ordem: number;
          is_final: boolean;
          is_ganho: boolean;
          exige_motivo: boolean;
          sla_dias: number | null;
          origem: string | null;
          pagina_url: string | null;
          imovel_id: string | null;
          imovel_titulo: string | null;
          corretor_id: string | null;
          corretor_nome: string | null;
          favorito: boolean;
          motivo_perda: string | null;
          utm: Record<string, unknown> | null;
          created_at: string;
          status_alterado_em: string;
          updated_at: string;
          dias_na_etapa: number | null;
          ultima_interacao_em: string | null;
          proximo_lembrete_em: string | null;
          proximo_lembrete_desc: string | null;
          tags: string[];
          total_interacoes: number;
          valor_negocio: number | null;
        };
        Relationships: [];
      };
      // Linha do tempo unificada (interações + transições de etapa),
      // carregada sob demanda ao abrir o modal do lead — nunca junto do
      // quadro (015_crm_interacoes_lembretes.sql).
      vw_crm_timeline: {
        Row: {
          lead_id: string;
          ocorrido_em: string;
          natureza: "interacao" | "etapa";
          tipo: string;
          tipo_label: string | null;
          corpo: string | null;
          automatica: boolean;
          autor_id: string | null;
          autor_nome: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      criar_lead_financiamento: {
        Args: {
          p_nome: string;
          p_email: string;
          p_telefone: string;
          p_cpf: string | null;
          p_origem: string | null;
          p_pagina_url: string | null;
          p_utm: Record<string, unknown>;
          p_valor_imovel: number;
          p_percentual_entrada: number;
          p_valor_entrada: number;
          p_valor_credito: number;
          p_prazo_meses: number;
          p_parcela_estimada: number;
          p_renda_mensal: number;
          p_usa_fgts: boolean;
          p_tipo_imovel: string;
          p_tipo_remuneracao: string;
          p_momento_compra: string;
          p_cidade: string;
          p_estado: string;
        };
        Returns: Database["public"]["Tables"]["leads"]["Row"];
      };
      criar_lead_home_equity: {
        Args: {
          p_nome: string;
          p_email: string;
          p_telefone: string;
          p_cpf: string | null;
          p_origem: string | null;
          p_pagina_url: string | null;
          p_utm: Record<string, unknown>;
          p_valor_imovel_garantia: number;
          p_imovel_quitado: boolean;
          p_saldo_devedor: number | null;
          p_valor_credito_estimado: number;
          p_prazo_meses: number;
          p_parcela_estimada: number;
          p_finalidade: string;
          p_tipo_imovel: string;
          p_renda_mensal: number;
          p_tipo_remuneracao: string;
          p_cep: string;
          p_numero: string;
          p_area_m2: number;
        };
        Returns: Database["public"]["Tables"]["leads"]["Row"];
      };
      criar_lead_imovel: {
        Args: {
          p_nome: string;
          p_email: string;
          p_telefone: string;
          p_cpf: string | null;
          p_origem: string | null;
          p_pagina_url: string | null;
          p_utm: Record<string, unknown>;
          p_imovel_id: string | null;
          p_forma_pagamento: string | null;
          p_prazo_compra: string | null;
          p_possui_entrada: string | null;
          p_valor_entrada: number | null;
          p_ja_tem_aprovacao: boolean | null;
          p_observacoes: string | null;
        };
        Returns: Database["public"]["Tables"]["leads"]["Row"];
      };
      registrar_tentativa_lead: {
        Args: { p_ip: string };
        Returns: boolean;
      };
      // Move um lead de etapa impondo a regra de motivo obrigatório
      // (017_crm_funcoes_rls.sql). SECURITY INVOKER: a RLS de `leads`
      // continua valendo, então o retorno pode ser `null`-equivalente em
      // erro — na prática a chamada lança exceção Postgres
      // (LEAD_NAO_ENCONTRADO | LEAD_DESATUALIZADO | ETAPA_INVALIDA |
      // MOTIVO_OBRIGATORIO | MOTIVO_OBS_OBRIGATORIA), traduzida em
      // app/actions/admin-crm.ts.
      mover_lead_crm: {
        Args: {
          p_lead_id: string;
          p_etapa: string;
          p_motivo?: string | null;
          p_motivo_obs?: string | null;
          p_updated_at?: string | null;
        };
        Returns: Database["public"]["Tables"]["leads"]["Row"];
      };
      // Grava interação e lembrete (quando informado) numa transação só
      // (017_crm_funcoes_rls.sql) — evita salvar a nota e perder o
      // follow-up por falha entre as duas gravações.
      registrar_interacao_crm: {
        Args: {
          p_lead_id: string;
          p_tipo: string;
          p_conteudo: string;
          p_lembrete_em?: string | null;
          p_lembrete_desc?: string | null;
        };
        Returns: Database["public"]["Tables"]["lead_interacoes"]["Row"];
      };
      // true só quando o usuário autenticado tem profiles.role = 'admin'.
      // SECURITY DEFINER com search_path fixo (017_crm_funcoes_rls.sql) —
      // usada dentro das policies de RLS, não chamada diretamente pela
      // aplicação.
      eh_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
  };
}
