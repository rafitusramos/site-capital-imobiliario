export type ProfileRole = "admin" | "corretor";
export type PostStatus = "draft" | "published" | "archived";
export type ImovelStatus = "ativo" | "reservado" | "vendido" | "inativo";
export type LeadStatus = "novo" | "contatado" | "qualificado" | "descartado";

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
      };
      leads: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string;
          source: string;
          imovel_id: string | null;
          dados_simulacao: Record<string, unknown> | null;
          status: LeadStatus;
          enviado_whatsapp: boolean;
          enviado_crm: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone: string;
          source: string;
          imovel_id?: string | null;
          dados_simulacao?: Record<string, unknown> | null;
          status?: LeadStatus;
          enviado_whatsapp?: boolean;
          enviado_crm?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
      };
    };
  };
}
