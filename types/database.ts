export type ProfileRole = "admin" | "corretor";
export type PostStatus = "draft" | "published" | "archived";
export type ImovelStatus = "ativo" | "reservado" | "vendido" | "inativo";
export type ImovelImagemGrupo = "empreendimento" | "decorado" | "planta" | "implantacao";
export type ImovelDiferencialGrupo = "lazer" | "diferencial";
export type LeadTipoSlug = "financiamento" | "home-equity" | "imoveis" | "consorcio";
export type LeadStatusSlug =
  | "criado"
  | "simulacao"
  | "analise-credito"
  | "credito-aprovado"
  | "vistoria"
  | "contrato-assinado"
  | "perdido";
export type LeadInteracaoTipo =
  | "nota"
  | "ligacao"
  | "whatsapp"
  | "email"
  | "reuniao"
  | "proposta";

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
      lead_status: {
        Row: {
          slug: LeadStatusSlug;
          label: string;
          cor_bg: string;
          cor_texto: string;
          ordem: number;
          is_final: boolean;
          is_ganho: boolean;
          ativo: boolean;
        };
        Insert: {
          slug: LeadStatusSlug;
          label: string;
          cor_bg: string;
          cor_texto: string;
          ordem: number;
          is_final?: boolean;
          is_ganho?: boolean;
          ativo?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["lead_status"]["Insert"]>;
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          protocolo: string;
          tipo: LeadTipoSlug;
          status: LeadStatusSlug;
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
          status_alterado_em: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          protocolo?: string;
          tipo: LeadTipoSlug;
          status?: LeadStatusSlug;
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
          created_at: string;
        };
        Insert: {
          lead_id: string;
          valor_carta?: number | null;
          prazo_meses?: number | null;
          parcela_estimada?: number | null;
          objetivo?: string | null;
          ja_possui_consorcio?: boolean | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["lead_consorcio"]["Insert"]>;
        Relationships: [];
      };
      lead_status_historico: {
        Row: {
          id: string;
          lead_id: string;
          status_anterior: LeadStatusSlug | null;
          status_novo: LeadStatusSlug;
          alterado_por: string | null;
          observacao: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          status_anterior?: LeadStatusSlug | null;
          status_novo: LeadStatusSlug;
          alterado_por?: string | null;
          observacao?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["lead_status_historico"]["Insert"]>;
        Relationships: [];
      };
      lead_interacoes: {
        Row: {
          id: string;
          lead_id: string;
          tipo: LeadInteracaoTipo;
          conteudo: string;
          autor_id: string | null;
          agendado_para: string | null;
          concluido: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          tipo: LeadInteracaoTipo;
          conteudo: string;
          autor_id?: string | null;
          agendado_para?: string | null;
          concluido?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["lead_interacoes"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
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
          status: LeadStatusSlug;
          status_label: string;
          cor_bg: string;
          cor_texto: string;
          status_ordem: number;
          is_final: boolean;
          is_ganho: boolean;
          origem: string | null;
          pagina_url: string | null;
          imovel_id: string | null;
          imovel_titulo: string | null;
          corretor_id: string | null;
          corretor_nome: string | null;
          created_at: string;
          status_alterado_em: string;
          dias_no_status: number | null;
          total_interacoes: number;
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
    };
  };
}
