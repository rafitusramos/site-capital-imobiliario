export type ProfileRole = "admin" | "corretor";
export type PostStatus = "draft" | "published" | "archived";
export type ImovelStatus = "ativo" | "reservado" | "vendido" | "inativo";
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
          destaque: boolean;
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
          destaque?: boolean;
          cta_pagina?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Insert"]>;
        Relationships: [];
      };
      imoveis: {
        Row: {
          id: string;
          slug: string;
          titulo: string;
          bairro: string | null;
          condominio: string | null;
          cidade: string | null;
          estado: string | null;
          valor_venda: number | null;
          valor_condominio: number | null;
          valor_iptu: number | null;
          descricao_breve: string | null;
          descricao_completa: string | null;
          metragem: number | null;
          dormitorios: number | null;
          banheiros: number | null;
          vagas: number | null;
          diferenciais: string[];
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
          bairro?: string | null;
          condominio?: string | null;
          cidade?: string | null;
          estado?: string | null;
          valor_venda?: number | null;
          valor_condominio?: number | null;
          valor_iptu?: number | null;
          descricao_breve?: string | null;
          descricao_completa?: string | null;
          metragem?: number | null;
          dormitorios?: number | null;
          banheiros?: number | null;
          vagas?: number | null;
          diferenciais?: string[];
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
          ordem: number;
          destaque: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          imovel_id: string;
          url: string;
          ambiente?: string | null;
          ordem?: number;
          destaque?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["imovel_imagens"]["Insert"]>;
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
