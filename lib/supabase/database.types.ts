export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      atividades: {
        Row: {
          concluida_em: string | null
          created_at: string
          descricao: string | null
          id: string
          lead_id: string
          negocio_id: string | null
          owner_id: string
          quando_em: string | null
          status: Database["public"]["Enums"]["status_atividade"]
          tipo: Database["public"]["Enums"]["tipo_atividade"]
          titulo: string
          updated_at: string
        }
        Insert: {
          concluida_em?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          lead_id: string
          negocio_id?: string | null
          owner_id: string
          quando_em?: string | null
          status?: Database["public"]["Enums"]["status_atividade"]
          tipo: Database["public"]["Enums"]["tipo_atividade"]
          titulo: string
          updated_at?: string
        }
        Update: {
          concluida_em?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          lead_id?: string
          negocio_id?: string | null
          owner_id?: string
          quando_em?: string | null
          status?: Database["public"]["Enums"]["status_atividade"]
          tipo?: Database["public"]["Enums"]["tipo_atividade"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      empreendimentos: {
        Row: {
          address_json: Json | null
          administradora: string | null
          ano_construcao: number | null
          bairro: string
          caracteristicas: string[] | null
          cep: string | null
          cidade: string
          construtora: string | null
          created_at: string
          descricao: string | null
          estado: Database["public"]["Enums"]["uf"]
          estagio_obra: Database["public"]["Enums"]["estagio_obra"] | null
          fase: Database["public"]["Enums"]["fase_empreendimento"]
          geolocacao_id: string
          id: string
          imobiliaria_id: string | null
          incorporadora: string | null
          lat: number | null
          lng: number | null
          logradouro: string
          n_andares: number | null
          n_torres: number | null
          n_unidades: number | null
          nome: string
          numero: string
          owner_id: string
          previsao_entrega_em: string | null
          publicado_em: string | null
          slug_publico: string
          status: Database["public"]["Enums"]["status_empreendimento"]
          updated_at: string
        }
        Insert: {
          address_json?: Json | null
          administradora?: string | null
          ano_construcao?: number | null
          bairro: string
          caracteristicas?: string[] | null
          cep?: string | null
          cidade: string
          construtora?: string | null
          created_at?: string
          descricao?: string | null
          estado: Database["public"]["Enums"]["uf"]
          estagio_obra?: Database["public"]["Enums"]["estagio_obra"] | null
          fase?: Database["public"]["Enums"]["fase_empreendimento"]
          geolocacao_id: string
          id?: string
          imobiliaria_id?: string | null
          incorporadora?: string | null
          lat?: number | null
          lng?: number | null
          logradouro: string
          n_andares?: number | null
          n_torres?: number | null
          n_unidades?: number | null
          nome: string
          numero: string
          owner_id: string
          previsao_entrega_em?: string | null
          publicado_em?: string | null
          slug_publico: string
          status?: Database["public"]["Enums"]["status_empreendimento"]
          updated_at?: string
        }
        Update: {
          address_json?: Json | null
          administradora?: string | null
          ano_construcao?: number | null
          bairro?: string
          caracteristicas?: string[] | null
          cep?: string | null
          cidade?: string
          construtora?: string | null
          created_at?: string
          descricao?: string | null
          estado?: Database["public"]["Enums"]["uf"]
          estagio_obra?: Database["public"]["Enums"]["estagio_obra"] | null
          fase?: Database["public"]["Enums"]["fase_empreendimento"]
          geolocacao_id?: string
          id?: string
          imobiliaria_id?: string | null
          incorporadora?: string | null
          lat?: number | null
          lng?: number | null
          logradouro?: string
          n_andares?: number | null
          n_torres?: number | null
          n_unidades?: number | null
          nome?: string
          numero?: string
          owner_id?: string
          previsao_entrega_em?: string | null
          publicado_em?: string | null
          slug_publico?: string
          status?: Database["public"]["Enums"]["status_empreendimento"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empreendimentos_geolocacao_id_fkey"
            columns: ["geolocacao_id"]
            isOneToOne: false
            referencedRelation: "geolocacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empreendimentos_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      geolocacoes: {
        Row: {
          address_json: Json
          bairro: string | null
          cep: string | null
          cidade: string | null
          created_at: string
          endereco_formatado: string | null
          id: string
          lat: number | null
          lng: number | null
          logradouro: string | null
          numero: string | null
          place_id: string | null
          uf: Database["public"]["Enums"]["uf"] | null
          updated_at: string
        }
        Insert: {
          address_json: Json
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          created_at?: string
          endereco_formatado?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          logradouro?: string | null
          numero?: string | null
          place_id?: string | null
          uf?: Database["public"]["Enums"]["uf"] | null
          updated_at?: string
        }
        Update: {
          address_json?: Json
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          created_at?: string
          endereco_formatado?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          logradouro?: string | null
          numero?: string | null
          place_id?: string | null
          uf?: Database["public"]["Enums"]["uf"] | null
          updated_at?: string
        }
        Relationships: []
      }
      imoveis: {
        Row: {
          aceita_permuta: boolean
          address_json: Json
          andar: number | null
          ano_construcao: number | null
          area_terreno: number | null
          area_total: number | null
          area_util: number | null
          bairro: string
          bairro_comercial: boolean
          banheiros: number | null
          caracteristicas: string[] | null
          cep: string | null
          chaves_na_mao: boolean
          cidade: string
          codigo: string
          condominio: number | null
          created_at: string
          descricao: string
          descricao_curta: string | null
          destaque: boolean
          dormitorios: number | null
          empreendimento_id: string | null
          endereco_complemento: string | null
          estado: Database["public"]["Enums"]["uf"]
          estado_conservacao:
            | Database["public"]["Enums"]["estado_conservacao"]
            | null
          exclusividade: boolean
          favoritos_count: number
          finalidade: Database["public"]["Enums"]["finalidade"]
          financiavel: boolean
          frente_metros: number | null
          fundos_metros: number | null
          geolocacao_id: string
          id: string
          imobiliaria_id: string | null
          indexar_google: boolean
          integracao_externa_id: string | null
          iptu: number | null
          iptu_periodicidade:
            | Database["public"]["Enums"]["periodicidade"]
            | null
          lat: number | null
          lavabos: number | null
          lng: number | null
          logradouro: string
          meta_description: string | null
          meta_title: string | null
          numero: string
          ocultar_numero_publico: boolean
          origem_cadastro: Database["public"]["Enums"]["origem_imovel"]
          owner_id: string
          permite_visita_imediata: boolean
          placa_no_local: boolean
          preco_locacao: number | null
          preco_venda: number | null
          publicado_em: string | null
          slug_publico: string
          status: Database["public"]["Enums"]["status_imovel"]
          subtipo: Database["public"]["Enums"]["subtipo_imovel"] | null
          suites: number | null
          tipo: Database["public"]["Enums"]["tipo_imovel"]
          titulo: string
          ultimo_andar: boolean
          unidade_numero: string | null
          updated_at: string
          usar_caracteristicas_empreendimento: boolean
          usar_midias_empreendimento: boolean
          vaga_coberturas:
            | Database["public"]["Enums"]["vaga_cobertura"][]
            | null
          vaga_tamanhos: Database["public"]["Enums"]["vaga_tamanho"][] | null
          vaga_tipos: Database["public"]["Enums"]["vaga_tipo"][] | null
          vagas: number | null
          valor_m2: number | null
          views_count: number
          vista: Database["public"]["Enums"]["tipo_vista"] | null
        }
        Insert: {
          aceita_permuta?: boolean
          address_json: Json
          andar?: number | null
          ano_construcao?: number | null
          area_terreno?: number | null
          area_total?: number | null
          area_util?: number | null
          bairro: string
          bairro_comercial?: boolean
          banheiros?: number | null
          caracteristicas?: string[] | null
          cep?: string | null
          chaves_na_mao?: boolean
          cidade: string
          codigo: string
          condominio?: number | null
          created_at?: string
          descricao: string
          descricao_curta?: string | null
          destaque?: boolean
          dormitorios?: number | null
          empreendimento_id?: string | null
          endereco_complemento?: string | null
          estado: Database["public"]["Enums"]["uf"]
          estado_conservacao?:
            | Database["public"]["Enums"]["estado_conservacao"]
            | null
          exclusividade?: boolean
          favoritos_count?: number
          finalidade: Database["public"]["Enums"]["finalidade"]
          financiavel?: boolean
          frente_metros?: number | null
          fundos_metros?: number | null
          geolocacao_id: string
          id?: string
          imobiliaria_id?: string | null
          indexar_google?: boolean
          integracao_externa_id?: string | null
          iptu?: number | null
          iptu_periodicidade?:
            | Database["public"]["Enums"]["periodicidade"]
            | null
          lat?: number | null
          lavabos?: number | null
          lng?: number | null
          logradouro: string
          meta_description?: string | null
          meta_title?: string | null
          numero: string
          ocultar_numero_publico?: boolean
          origem_cadastro?: Database["public"]["Enums"]["origem_imovel"]
          owner_id: string
          permite_visita_imediata?: boolean
          placa_no_local?: boolean
          preco_locacao?: number | null
          preco_venda?: number | null
          publicado_em?: string | null
          slug_publico: string
          status?: Database["public"]["Enums"]["status_imovel"]
          subtipo?: Database["public"]["Enums"]["subtipo_imovel"] | null
          suites?: number | null
          tipo: Database["public"]["Enums"]["tipo_imovel"]
          titulo: string
          ultimo_andar?: boolean
          unidade_numero?: string | null
          updated_at?: string
          usar_caracteristicas_empreendimento?: boolean
          usar_midias_empreendimento?: boolean
          vaga_coberturas?:
            | Database["public"]["Enums"]["vaga_cobertura"][]
            | null
          vaga_tamanhos?: Database["public"]["Enums"]["vaga_tamanho"][] | null
          vaga_tipos?: Database["public"]["Enums"]["vaga_tipo"][] | null
          vagas?: number | null
          valor_m2?: number | null
          views_count?: number
          vista?: Database["public"]["Enums"]["tipo_vista"] | null
        }
        Update: {
          aceita_permuta?: boolean
          address_json?: Json
          andar?: number | null
          ano_construcao?: number | null
          area_terreno?: number | null
          area_total?: number | null
          area_util?: number | null
          bairro?: string
          bairro_comercial?: boolean
          banheiros?: number | null
          caracteristicas?: string[] | null
          cep?: string | null
          chaves_na_mao?: boolean
          cidade?: string
          codigo?: string
          condominio?: number | null
          created_at?: string
          descricao?: string
          descricao_curta?: string | null
          destaque?: boolean
          dormitorios?: number | null
          empreendimento_id?: string | null
          endereco_complemento?: string | null
          estado?: Database["public"]["Enums"]["uf"]
          estado_conservacao?:
            | Database["public"]["Enums"]["estado_conservacao"]
            | null
          exclusividade?: boolean
          favoritos_count?: number
          finalidade?: Database["public"]["Enums"]["finalidade"]
          financiavel?: boolean
          frente_metros?: number | null
          fundos_metros?: number | null
          geolocacao_id?: string
          id?: string
          imobiliaria_id?: string | null
          indexar_google?: boolean
          integracao_externa_id?: string | null
          iptu?: number | null
          iptu_periodicidade?:
            | Database["public"]["Enums"]["periodicidade"]
            | null
          lat?: number | null
          lavabos?: number | null
          lng?: number | null
          logradouro?: string
          meta_description?: string | null
          meta_title?: string | null
          numero?: string
          ocultar_numero_publico?: boolean
          origem_cadastro?: Database["public"]["Enums"]["origem_imovel"]
          owner_id?: string
          permite_visita_imediata?: boolean
          placa_no_local?: boolean
          preco_locacao?: number | null
          preco_venda?: number | null
          publicado_em?: string | null
          slug_publico?: string
          status?: Database["public"]["Enums"]["status_imovel"]
          subtipo?: Database["public"]["Enums"]["subtipo_imovel"] | null
          suites?: number | null
          tipo?: Database["public"]["Enums"]["tipo_imovel"]
          titulo?: string
          ultimo_andar?: boolean
          unidade_numero?: string | null
          updated_at?: string
          usar_caracteristicas_empreendimento?: boolean
          usar_midias_empreendimento?: boolean
          vaga_coberturas?:
            | Database["public"]["Enums"]["vaga_cobertura"][]
            | null
          vaga_tamanhos?: Database["public"]["Enums"]["vaga_tamanho"][] | null
          vaga_tipos?: Database["public"]["Enums"]["vaga_tipo"][] | null
          vagas?: number | null
          valor_m2?: number | null
          views_count?: number
          vista?: Database["public"]["Enums"]["tipo_vista"] | null
        }
        Relationships: [
          {
            foreignKeyName: "imoveis_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imoveis_geolocacao_id_fkey"
            columns: ["geolocacao_id"]
            isOneToOne: false
            referencedRelation: "geolocacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imoveis_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_imoveis: {
        Row: {
          created_at: string
          id: string
          imovel_id: string
          lead_id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          imovel_id: string
          lead_id: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          imovel_id?: string
          lead_id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_imoveis_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_imoveis_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_localizacoes_interesse: {
        Row: {
          created_at: string
          geolocacao_id: string | null
          id: string
          lat: number | null
          lead_id: string
          lng: number | null
          localizacao_texto: string | null
          owner_id: string
          raio_km: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          geolocacao_id?: string | null
          id?: string
          lat?: number | null
          lead_id: string
          lng?: number | null
          localizacao_texto?: string | null
          owner_id: string
          raio_km?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          geolocacao_id?: string | null
          id?: string
          lat?: number | null
          lead_id?: string
          lng?: number | null
          localizacao_texto?: string | null
          owner_id?: string
          raio_km?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_localizacoes_interesse_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_localizacoes_interesse_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          email_lower: string | null
          id: string
          imovel_id: string | null
          mensagem: string | null
          motivo_desqualificacao:
            | Database["public"]["Enums"]["motivo_desqualificacao"]
            | null
          nome: string
          origem: Database["public"]["Enums"]["origem_lead"]
          owner_id: string
          status: Database["public"]["Enums"]["status_lead"]
          telefone: string | null
          telefone_e164: string | null
          updated_at: string
          utm: Json | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          email_lower?: string | null
          id?: string
          imovel_id?: string | null
          mensagem?: string | null
          motivo_desqualificacao?:
            | Database["public"]["Enums"]["motivo_desqualificacao"]
            | null
          nome: string
          origem: Database["public"]["Enums"]["origem_lead"]
          owner_id: string
          status?: Database["public"]["Enums"]["status_lead"]
          telefone?: string | null
          telefone_e164?: string | null
          updated_at?: string
          utm?: Json | null
        }
        Update: {
          created_at?: string
          email?: string | null
          email_lower?: string | null
          id?: string
          imovel_id?: string | null
          mensagem?: string | null
          motivo_desqualificacao?:
            | Database["public"]["Enums"]["motivo_desqualificacao"]
            | null
          nome?: string
          origem?: Database["public"]["Enums"]["origem_lead"]
          owner_id?: string
          status?: Database["public"]["Enums"]["status_lead"]
          telefone?: string | null
          telefone_e164?: string | null
          updated_at?: string
          utm?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      midia: {
        Row: {
          alt: string | null
          alt_gerado_em: string | null
          alt_origem: Database["public"]["Enums"]["alt_origem"]
          altura: number | null
          caracteristica: string | null
          created_at: string
          hash: string | null
          id: string
          largura: number | null
          legenda: string | null
          owner_id: string
          storage_bucket: string
          storage_path: string
          storage_provider: Database["public"]["Enums"]["storage_provider"]
          tamanho_bytes: number | null
          tipo: Database["public"]["Enums"]["tipo_midia"]
          titulo: string | null
          url: string
        }
        Insert: {
          alt?: string | null
          alt_gerado_em?: string | null
          alt_origem?: Database["public"]["Enums"]["alt_origem"]
          altura?: number | null
          caracteristica?: string | null
          created_at?: string
          hash?: string | null
          id?: string
          largura?: number | null
          legenda?: string | null
          owner_id: string
          storage_bucket: string
          storage_path: string
          storage_provider?: Database["public"]["Enums"]["storage_provider"]
          tamanho_bytes?: number | null
          tipo: Database["public"]["Enums"]["tipo_midia"]
          titulo?: string | null
          url: string
        }
        Update: {
          alt?: string | null
          alt_gerado_em?: string | null
          alt_origem?: Database["public"]["Enums"]["alt_origem"]
          altura?: number | null
          caracteristica?: string | null
          created_at?: string
          hash?: string | null
          id?: string
          largura?: number | null
          legenda?: string | null
          owner_id?: string
          storage_bucket?: string
          storage_path?: string
          storage_provider?: Database["public"]["Enums"]["storage_provider"]
          tamanho_bytes?: number | null
          tipo?: Database["public"]["Enums"]["tipo_midia"]
          titulo?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "midia_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      midia_relacoes: {
        Row: {
          created_at: string
          grupo: string | null
          id: string
          midia_id: string
          ordem: number
          owner_id: string
          ref_id: string
          ref_tipo: Database["public"]["Enums"]["ref_tipo"]
        }
        Insert: {
          created_at?: string
          grupo?: string | null
          id?: string
          midia_id: string
          ordem?: number
          owner_id: string
          ref_id: string
          ref_tipo: Database["public"]["Enums"]["ref_tipo"]
        }
        Update: {
          created_at?: string
          grupo?: string | null
          id?: string
          midia_id?: string
          ordem?: number
          owner_id?: string
          ref_id?: string
          ref_tipo?: Database["public"]["Enums"]["ref_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "midia_relacoes_midia_id_fkey"
            columns: ["midia_id"]
            isOneToOne: false
            referencedRelation: "midia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "midia_relacoes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      midia_variantes: {
        Row: {
          altura: number
          created_at: string
          id: string
          largura: number
          midia_id: string
          storage_path: string
          tamanho_bytes: number | null
          tipo: Database["public"]["Enums"]["variante_tipo"]
        }
        Insert: {
          altura: number
          created_at?: string
          id?: string
          largura: number
          midia_id: string
          storage_path: string
          tamanho_bytes?: number | null
          tipo: Database["public"]["Enums"]["variante_tipo"]
        }
        Update: {
          altura?: number
          created_at?: string
          id?: string
          largura?: number
          midia_id?: string
          storage_path?: string
          tamanho_bytes?: number | null
          tipo?: Database["public"]["Enums"]["variante_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "midia_variantes_midia_id_fkey"
            columns: ["midia_id"]
            isOneToOne: false
            referencedRelation: "midia"
            referencedColumns: ["id"]
          },
        ]
      }
      negocios: {
        Row: {
          created_at: string
          empreendimento_id: string | null
          etapa: Database["public"]["Enums"]["etapa_negocio"]
          fechado_em: string | null
          finalidade: Database["public"]["Enums"]["finalidade"] | null
          id: string
          imovel_id: string | null
          lead_id: string
          lista_id: string | null
          notas: string | null
          owner_id: string
          proxima_acao_em: string | null
          titulo: string | null
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          created_at?: string
          empreendimento_id?: string | null
          etapa?: Database["public"]["Enums"]["etapa_negocio"]
          fechado_em?: string | null
          finalidade?: Database["public"]["Enums"]["finalidade"] | null
          id?: string
          imovel_id?: string | null
          lead_id: string
          lista_id?: string | null
          notas?: string | null
          owner_id: string
          proxima_acao_em?: string | null
          titulo?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          created_at?: string
          empreendimento_id?: string | null
          etapa?: Database["public"]["Enums"]["etapa_negocio"]
          fechado_em?: string | null
          finalidade?: Database["public"]["Enums"]["finalidade"] | null
          id?: string
          imovel_id?: string | null
          lead_id?: string
          lista_id?: string | null
          notas?: string | null
          owner_id?: string
          proxima_acao_em?: string | null
          titulo?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "negocios_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocios_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_users: {
        Row: {
          aceite_marketing_em: string | null
          canais: Database["public"]["Enums"]["canal_contato"][] | null
          created_at: string
          email: string
          email_verificado_em: string | null
          foto_url: string | null
          id: string
          nome: string
          sobrenome: string
          status: Database["public"]["Enums"]["status_portal_user"]
          telefone: string | null
          telefone_e164: string | null
          updated_at: string
          whatsapp_verificado_em: string | null
        }
        Insert: {
          aceite_marketing_em?: string | null
          canais?: Database["public"]["Enums"]["canal_contato"][] | null
          created_at?: string
          email: string
          email_verificado_em?: string | null
          foto_url?: string | null
          id: string
          nome: string
          sobrenome: string
          status?: Database["public"]["Enums"]["status_portal_user"]
          telefone?: string | null
          telefone_e164?: string | null
          updated_at?: string
          whatsapp_verificado_em?: string | null
        }
        Update: {
          aceite_marketing_em?: string | null
          canais?: Database["public"]["Enums"]["canal_contato"][] | null
          created_at?: string
          email?: string
          email_verificado_em?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          sobrenome?: string
          status?: Database["public"]["Enums"]["status_portal_user"]
          telefone?: string | null
          telefone_e164?: string | null
          updated_at?: string
          whatsapp_verificado_em?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cidades_foco: string[] | null
          created_at: string
          creci_aprovacao: boolean
          creci_documento_midia_id: string | null
          creci_numero: string | null
          creci_sufixo: string | null
          creci_uf: Database["public"]["Enums"]["uf"] | null
          dominio_custom: string | null
          dominio_status: Database["public"]["Enums"]["status_dominio"]
          email: string
          email_verificado_em: string | null
          genero: Database["public"]["Enums"]["genero"] | null
          id: string
          imagem_capa_url: string | null
          imobiliaria_id: string | null
          imoveis_alto_padrao: boolean
          imoveis_baixa_renda: boolean
          imoveis_comerciais: boolean
          imoveis_industriais: boolean
          imoveis_luxo: boolean
          imoveis_medio_padrao: boolean
          imoveis_residenciais: boolean
          instagram: string | null
          linkedin: string | null
          nickname: string | null
          papel_imobiliaria:
            | Database["public"]["Enums"]["papel_imobiliaria"]
            | null
          pinterest: string | null
          plano_id: string | null
          primeiro_nome: string | null
          sobrenome: string | null
          status: Database["public"]["Enums"]["status_usuario"]
          telefone: string | null
          tiktok: string | null
          twitter: string | null
          uf: Database["public"]["Enums"]["uf"] | null
          updated_at: string
          whatsapp: string | null
          whatsapp_verificado_em: string | null
          youtube: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cidades_foco?: string[] | null
          created_at?: string
          creci_aprovacao?: boolean
          creci_documento_midia_id?: string | null
          creci_numero?: string | null
          creci_sufixo?: string | null
          creci_uf?: Database["public"]["Enums"]["uf"] | null
          dominio_custom?: string | null
          dominio_status?: Database["public"]["Enums"]["status_dominio"]
          email: string
          email_verificado_em?: string | null
          genero?: Database["public"]["Enums"]["genero"] | null
          id: string
          imagem_capa_url?: string | null
          imobiliaria_id?: string | null
          imoveis_alto_padrao?: boolean
          imoveis_baixa_renda?: boolean
          imoveis_comerciais?: boolean
          imoveis_industriais?: boolean
          imoveis_luxo?: boolean
          imoveis_medio_padrao?: boolean
          imoveis_residenciais?: boolean
          instagram?: string | null
          linkedin?: string | null
          nickname?: string | null
          papel_imobiliaria?:
            | Database["public"]["Enums"]["papel_imobiliaria"]
            | null
          pinterest?: string | null
          plano_id?: string | null
          primeiro_nome?: string | null
          sobrenome?: string | null
          status?: Database["public"]["Enums"]["status_usuario"]
          telefone?: string | null
          tiktok?: string | null
          twitter?: string | null
          uf?: Database["public"]["Enums"]["uf"] | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_verificado_em?: string | null
          youtube?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cidades_foco?: string[] | null
          created_at?: string
          creci_aprovacao?: boolean
          creci_documento_midia_id?: string | null
          creci_numero?: string | null
          creci_sufixo?: string | null
          creci_uf?: Database["public"]["Enums"]["uf"] | null
          dominio_custom?: string | null
          dominio_status?: Database["public"]["Enums"]["status_dominio"]
          email?: string
          email_verificado_em?: string | null
          genero?: Database["public"]["Enums"]["genero"] | null
          id?: string
          imagem_capa_url?: string | null
          imobiliaria_id?: string | null
          imoveis_alto_padrao?: boolean
          imoveis_baixa_renda?: boolean
          imoveis_comerciais?: boolean
          imoveis_industriais?: boolean
          imoveis_luxo?: boolean
          imoveis_medio_padrao?: boolean
          imoveis_residenciais?: boolean
          instagram?: string | null
          linkedin?: string | null
          nickname?: string | null
          papel_imobiliaria?:
            | Database["public"]["Enums"]["papel_imobiliaria"]
            | null
          pinterest?: string | null
          plano_id?: string | null
          primeiro_nome?: string | null
          sobrenome?: string | null
          status?: Database["public"]["Enums"]["status_usuario"]
          telefone?: string | null
          tiktok?: string | null
          twitter?: string | null
          uf?: Database["public"]["Enums"]["uf"] | null
          updated_at?: string
          whatsapp?: string | null
          whatsapp_verificado_em?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      propostas: {
        Row: {
          arquivo_midia_id: string | null
          conteudo: Json | null
          created_at: string
          enviada_em: string | null
          id: string
          lead_id: string
          negocio_id: string | null
          owner_id: string
          status: Database["public"]["Enums"]["status_proposta"]
          tipo: Database["public"]["Enums"]["tipo_proposta"]
          titulo: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          arquivo_midia_id?: string | null
          conteudo?: Json | null
          created_at?: string
          enviada_em?: string | null
          id?: string
          lead_id: string
          negocio_id?: string | null
          owner_id: string
          status?: Database["public"]["Enums"]["status_proposta"]
          tipo: Database["public"]["Enums"]["tipo_proposta"]
          titulo: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          arquivo_midia_id?: string | null
          conteudo?: Json | null
          created_at?: string
          enviada_em?: string | null
          id?: string
          lead_id?: string
          negocio_id?: string | null
          owner_id?: string
          status?: Database["public"]["Enums"]["status_proposta"]
          tipo?: Database["public"]["Enums"]["tipo_proposta"]
          titulo?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timeline_eventos: {
        Row: {
          created_at: string
          detalhes: Json | null
          id: string
          lead_id: string
          negocio_id: string | null
          owner_id: string
          tipo: Database["public"]["Enums"]["tipo_timeline"]
          titulo: string
        }
        Insert: {
          created_at?: string
          detalhes?: Json | null
          id?: string
          lead_id: string
          negocio_id?: string | null
          owner_id: string
          tipo: Database["public"]["Enums"]["tipo_timeline"]
          titulo: string
        }
        Update: {
          created_at?: string
          detalhes?: Json | null
          id?: string
          lead_id?: string
          negocio_id?: string | null
          owner_id?: string
          tipo?: Database["public"]["Enums"]["tipo_timeline"]
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "timeline_eventos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_eventos_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timeline_eventos_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_briefings: {
        Row: {
          area_util_max: number | null
          area_util_max_comercial: number | null
          area_util_min: number | null
          area_util_min_comercial: number | null
          ativo: boolean
          canais: Database["public"]["Enums"]["canal_contato"][] | null
          caracteristicas_comerciais:
            | Database["public"]["Enums"]["caracteristica_comercial"][]
            | null
          caracteristicas_residenciais:
            | Database["public"]["Enums"]["caracteristica_imovel"][]
            | null
          categoriaimovel: string[] | null
          construcao: Database["public"]["Enums"]["tipo_construcao"][] | null
          conteudos: Database["public"]["Enums"]["tipo_conteudo"][] | null
          corretor_id: string | null
          created_at: string
          escopo: Database["public"]["Enums"]["escopo_briefing"]
          geolocacao_id: string | null
          id: string
          intencao_compra: Database["public"]["Enums"]["intencao_compra"] | null
          lat: number | null
          lng: number | null
          localizacao_texto: string | null
          quartos_min: number | null
          raio_km: number | null
          suites_min: number | null
          texto_livre: string | null
          tipoimovel: Database["public"]["Enums"]["tipo_imovel"][] | null
          tiponegociacao:
            | Database["public"]["Enums"]["tipo_negociacao"][]
            | null
          tipouso: Database["public"]["Enums"]["tipo_uso"] | null
          updated_at: string
          user_id: string
          vagas_min: number | null
          vagas_min_comercial: number | null
          valor_max: number | null
          valor_min: number | null
        }
        Insert: {
          area_util_max?: number | null
          area_util_max_comercial?: number | null
          area_util_min?: number | null
          area_util_min_comercial?: number | null
          ativo?: boolean
          canais?: Database["public"]["Enums"]["canal_contato"][] | null
          caracteristicas_comerciais?:
            | Database["public"]["Enums"]["caracteristica_comercial"][]
            | null
          caracteristicas_residenciais?:
            | Database["public"]["Enums"]["caracteristica_imovel"][]
            | null
          categoriaimovel?: string[] | null
          construcao?: Database["public"]["Enums"]["tipo_construcao"][] | null
          conteudos?: Database["public"]["Enums"]["tipo_conteudo"][] | null
          corretor_id?: string | null
          created_at?: string
          escopo: Database["public"]["Enums"]["escopo_briefing"]
          geolocacao_id?: string | null
          id?: string
          intencao_compra?:
            | Database["public"]["Enums"]["intencao_compra"]
            | null
          lat?: number | null
          lng?: number | null
          localizacao_texto?: string | null
          quartos_min?: number | null
          raio_km?: number | null
          suites_min?: number | null
          texto_livre?: string | null
          tipoimovel?: Database["public"]["Enums"]["tipo_imovel"][] | null
          tiponegociacao?:
            | Database["public"]["Enums"]["tipo_negociacao"][]
            | null
          tipouso?: Database["public"]["Enums"]["tipo_uso"] | null
          updated_at?: string
          user_id: string
          vagas_min?: number | null
          vagas_min_comercial?: number | null
          valor_max?: number | null
          valor_min?: number | null
        }
        Update: {
          area_util_max?: number | null
          area_util_max_comercial?: number | null
          area_util_min?: number | null
          area_util_min_comercial?: number | null
          ativo?: boolean
          canais?: Database["public"]["Enums"]["canal_contato"][] | null
          caracteristicas_comerciais?:
            | Database["public"]["Enums"]["caracteristica_comercial"][]
            | null
          caracteristicas_residenciais?:
            | Database["public"]["Enums"]["caracteristica_imovel"][]
            | null
          categoriaimovel?: string[] | null
          construcao?: Database["public"]["Enums"]["tipo_construcao"][] | null
          conteudos?: Database["public"]["Enums"]["tipo_conteudo"][] | null
          corretor_id?: string | null
          created_at?: string
          escopo?: Database["public"]["Enums"]["escopo_briefing"]
          geolocacao_id?: string | null
          id?: string
          intencao_compra?:
            | Database["public"]["Enums"]["intencao_compra"]
            | null
          lat?: number | null
          lng?: number | null
          localizacao_texto?: string | null
          quartos_min?: number | null
          raio_km?: number | null
          suites_min?: number | null
          texto_livre?: string | null
          tipoimovel?: Database["public"]["Enums"]["tipo_imovel"][] | null
          tiponegociacao?:
            | Database["public"]["Enums"]["tipo_negociacao"][]
            | null
          tipouso?: Database["public"]["Enums"]["tipo_uso"] | null
          updated_at?: string
          user_id?: string
          vagas_min?: number | null
          vagas_min_comercial?: number | null
          valor_max?: number | null
          valor_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_briefings_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_briefings_geolocacao_id_fkey"
            columns: ["geolocacao_id"]
            isOneToOne: false
            referencedRelation: "geolocacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_briefings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favoritos: {
        Row: {
          created_at: string
          id: string
          imovel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          imovel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          imovel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favoritos_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favoritos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          corretor_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          corretor_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          corretor_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      alt_origem: "MANUAL" | "AYKA"
      canal_contato: "EMAIL" | "WHATSAPP"
      caracteristica_comercial:
        | "PROX_METRO"
        | "ALTA_CIRCULACAO"
        | "FRENTE_RUA"
        | "ESTACIONAMENTO"
        | "PISO_ELEVADO"
        | "AR_CONDICIONADO"
      caracteristica_imovel:
        | "CONEXAO_A_INTERNET"
        | "AMBIENTES_INTEGRADOS"
        | "ANDAR_INTEIRO"
        | "AQUARIO"
        | "AREA_DE_SERVICO"
        | "ARMARIO_EMBUTIDO_NO_QUARTO"
        | "ARMARIO_NA_COZINHA"
        | "ARMARIO_NO_BANHEIRO"
        | "BANHEIRA"
        | "BANHEIRO_DE_SERVICO"
        | "BAR"
        | "BOX_BLINDEX"
        | "CARPETE"
        | "CASA_DE_CASEIRO"
        | "CASA_DE_FUNDO"
        | "CASA_SEDE"
        | "CHURRASQUEIRA_NA_VARANDA"
        | "CHUVEIRO_A_GAS"
        | "CIMENTO_QUEIMADO"
        | "COPA"
        | "COZINHA_GOURMET"
        | "COZINHA_GRANDE"
        | "DEPENDENCIA_DE_EMPREGADOS"
        | "DEPOSITO"
        | "DESPENSA"
        | "DRYWALL"
        | "EDICULA"
        | "ESCADA"
        | "ESCRITORIO"
        | "FOGAO"
        | "FORNO_DE_PIZZA"
        | "FREEZER"
        | "GEMINADA"
        | "GESSO_SANCA_TETO_REBAIXADO"
        | "HIDROMASSAGEM"
        | "IMOVEL_DE_ESQUINA"
        | "INTERFONE"
        | "ISOLAMENTO_ACUSTICO"
        | "ISOLAMENTO_TERMICO"
        | "JANELA_DE_ALUMINIO"
        | "JANELA_GRANDE"
        | "LAJE"
        | "MEIO_ANDAR"
        | "MEZANINO"
        | "MOVEL_PLANEJADO"
        | "MURO_DE_VIDRO"
        | "MURO_E_GRADE"
        | "OFURO"
        | "PE_DIREITO_ALTO"
        | "PISCINA_PRIVATIVA"
        | "PISO_DE_MADEIRA"
        | "PISO_ELEVADO"
        | "PISO_FRIO"
        | "PISO_LAMINADO"
        | "PISO_VINILICO"
        | "PLATIBANDA"
        | "PORCELANATO"
        | "POSSUI_DIVISORIA"
        | "QUARTO_DE_SERVICO"
        | "QUARTO_EXTRA_REVERSIVEL"
        | "QUINTAL"
        | "SALA_DE_ALMOCO"
        | "SALA_DE_JANTAR"
        | "SALA_GRANDE"
        | "SALA_PEQUENA"
        | "TV_A_CABO"
        | "VARANDA"
        | "VARANDA_FECHADA_COM_VIDRO"
        | "VENTILACAO_NATURAL"
        | "VISTA_PARA_O_MAR"
        | "VISTA_PANORAMICA"
        | "VISTA_PARA_A_MONTANHA"
        | "VISTA_PARA_LAGO"
        | "ACEITA_ANIMAIS"
        | "AR_CONDICIONADO"
        | "CLOSET"
        | "COZINHA_AMERICANA"
        | "LAREIRA"
        | "MOBILIADO"
        | "VARANDA_GOURMET"
      escopo_briefing: "GERAL" | "CORRETOR"
      estado_conservacao: "NOVO" | "REFORMADO" | "BOM" | "A_REFORMAR"
      estagio_obra:
        | "FUNDACAO"
        | "ESTRUTURA"
        | "ALVENARIA"
        | "INSTALACOES"
        | "ACABAMENTO"
        | "FINALIZACAO"
      etapa_negocio:
        | "NOVO"
        | "ABERTO"
        | "EM_ATENDIMENTO"
        | "QUALIFICADO"
        | "OPORTUNIDADE"
        | "CLIENTE"
        | "DESQUALIFICADO"
      fase_empreendimento: "NA_PLANTA" | "EM_CONSTRUCAO" | "ENTREGUE"
      finalidade: "COMPRAR" | "ALUGAR"
      genero: "MASCULINO" | "FEMININO" | "NAO_INFORMAR"
      intencao_compra: "MORADIA" | "INVESTIMENTO"
      motivo_desqualificacao:
        | "NAO_RESPONDEU_TENTATIVAS_DE_CONTATO"
        | "CONTATO_INVALIDO"
        | "SOLICITOU_NAO_SER_CONTATADO"
        | "ORCAMENTO_INCOMPATIVEL"
        | "SEM_PERFIL_DE_COMPRA"
        | "APENAS_PESQUISA_OU_CURIOSIDADE"
        | "SEM_URGENCIA_NO_MOMENTO"
        | "NAO_ENCONTROU_IMOVEIS_COMPATIVEIS"
        | "LOCALIZACAO_NAO_ATENDE"
        | "CARACTERISTICAS_NAO_ATENDEM"
        | "JA_FECHOU_COM_OUTRO_CORRETOR_OU_IMOBILIARIA"
        | "ADIOU_DECISAO"
        | "MUDANCA_DE_PLANOS_PESSOAIS_OU_FINANCEIROS"
        | "LEAD_DUPLICADO_OU_INVALIDO"
        | "SPAM_OU_TESTE"
        | "PERDA_POR_FALHA_NO_ATENDIMENTO"
        | "OUTRO"
      origem_imovel: "MANUAL" | "IMPORTACAO" | "INTEGRACAO"
      origem_lead:
        | "CORRETOR_ONE"
        | "GRUPO_OLX"
        | "GOOGLE_ADS"
        | "META_ADS"
        | "INDICACAO"
        | "EVENTO"
        | "FEIRA"
        | "PLANTAO"
        | "IMOVELWEB"
        | "CHAVES_NA_MAO"
        | "CASA_MINEIRA"
        | "LUGAR_CERTO"
        | "MERCADO_LIVRE"
        | "MEU_IMOVEL"
        | "DREAMCASA"
        | "QUINTO_ANDAR"
        | "LOFT"
        | "I123"
        | "AGENTE_IMOVEL"
        | "TROVIT"
        | "IMOVEIS_CURITIBA"
        | "WHATSAPP_BUSINESS"
        | "OUTRO"
      papel_imobiliaria: "DONO" | "ADMIN" | "CORRETOR"
      periodicidade: "MENSAL" | "ANUAL"
      ref_tipo:
        | "IMOVEL"
        | "EMPREENDIMENTO"
        | "ARTIGO"
        | "CAMPANHA"
        | "TEMPLATE"
        | "OUTRO"
      status_atividade: "PENDENTE" | "CONCLUIDA" | "CANCELADA"
      status_dominio:
        | "NAO_CONFIGURADO"
        | "PENDENTE_VALIDACAO"
        | "ATIVO"
        | "SUSPENSO"
      status_empreendimento: "RASCUNHO" | "PUBLICADO" | "PAUSADO" | "INATIVO"
      status_imovel:
        | "RASCUNHO"
        | "PUBLICADO"
        | "PAUSADO"
        | "VENDIDO"
        | "ALUGADO"
        | "INATIVO"
      status_lead:
        | "NOVO"
        | "ABERTO"
        | "EM_ATENDIMENTO"
        | "QUALIFICADO"
        | "OPORTUNIDADE"
        | "CLIENTE"
        | "DESQUALIFICADO"
      status_portal_user: "ATIVO" | "SUSPENSO"
      status_proposta:
        | "RASCUNHO"
        | "ENVIADA"
        | "ACEITA"
        | "RECUSADA"
        | "EXPIRADA"
      status_usuario: "ATIVO" | "PENDENTE" | "BLOQUEADO"
      storage_provider: "SUPABASE" | "S3"
      subtipo_imovel:
        | "COBERTURA"
        | "DUPLEX"
        | "TRIPLEX"
        | "GARDEN"
        | "LOFT"
        | "CONJUNTO_COMERCIAL"
      tipo_atividade:
        | "LIGACAO"
        | "WHATSAPP"
        | "EMAIL"
        | "VISITA"
        | "REUNIAO"
        | "TAREFA"
      tipo_construcao: "PRONTO_USO" | "NA_PLANTA" | "EM_CONSTRUCAO"
      tipo_conteudo: "IMOVEL" | "EMPREENDIMENTO" | "ARTIGO" | "NEWSLETTER"
      tipo_imovel:
        | "APARTAMENTO"
        | "CASA"
        | "CASA_DE_CONDOMINIO"
        | "CASA_DE_VILA"
        | "COBERTURA"
        | "CASA_COMERCIAL"
        | "ESCRITORIO"
        | "FAZENDA_SITIO_CHACARA"
        | "FLAT"
        | "GALPAO_DEPOSITO_ARMAZEM"
        | "GARAGEM"
        | "KITNET_CONJUGADO"
        | "HOTEL_MOTEL_POUSADA"
        | "LOFT"
        | "LOTE_TERRENO"
        | "PONTO_COMERCIAL_LOJA_BOX"
        | "PREDIO_EDIFICIO_INTEIRO"
        | "STUDIO"
      tipo_midia: "IMAGEM" | "VIDEO" | "PDF"
      tipo_negociacao: "VENDA" | "ALUGUEL" | "VENDA_E_ALUGUEL"
      tipo_proposta: "SELECAO" | "IMOVEL" | "EMPREENDIMENTO" | "COMERCIAL"
      tipo_timeline: "STATUS" | "PROPOSTA" | "ATIVIDADE" | "NOTA" | "SISTEMA"
      tipo_uso: "RESIDENCIAL" | "COMERCIAL"
      tipo_vista: "LIVRE" | "PARQUE" | "CIDADE" | "MAR" | "VERDE"
      uf:
        | "AC"
        | "AL"
        | "AP"
        | "AM"
        | "BA"
        | "CE"
        | "DF"
        | "ES"
        | "GO"
        | "MA"
        | "MT"
        | "MS"
        | "MG"
        | "PA"
        | "PB"
        | "PR"
        | "PE"
        | "PI"
        | "RJ"
        | "RN"
        | "RS"
        | "RO"
        | "RR"
        | "SC"
        | "SP"
        | "SE"
        | "TO"
      vaga_cobertura: "COBERTA" | "DESCOBERTA"
      vaga_tamanho: "PEQUENA" | "MEDIA" | "GRANDE"
      vaga_tipo: "PRIVATIVA" | "LIVRE"
      variante_tipo:
        | "THUMB_150"
        | "W240"
        | "W360"
        | "W480"
        | "W768"
        | "W1024"
        | "FULL_1920"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alt_origem: ["MANUAL", "AYKA"],
      canal_contato: ["EMAIL", "WHATSAPP"],
      caracteristica_comercial: [
        "PROX_METRO",
        "ALTA_CIRCULACAO",
        "FRENTE_RUA",
        "ESTACIONAMENTO",
        "PISO_ELEVADO",
        "AR_CONDICIONADO",
      ],
      caracteristica_imovel: [
        "CONEXAO_A_INTERNET",
        "AMBIENTES_INTEGRADOS",
        "ANDAR_INTEIRO",
        "AQUARIO",
        "AREA_DE_SERVICO",
        "ARMARIO_EMBUTIDO_NO_QUARTO",
        "ARMARIO_NA_COZINHA",
        "ARMARIO_NO_BANHEIRO",
        "BANHEIRA",
        "BANHEIRO_DE_SERVICO",
        "BAR",
        "BOX_BLINDEX",
        "CARPETE",
        "CASA_DE_CASEIRO",
        "CASA_DE_FUNDO",
        "CASA_SEDE",
        "CHURRASQUEIRA_NA_VARANDA",
        "CHUVEIRO_A_GAS",
        "CIMENTO_QUEIMADO",
        "COPA",
        "COZINHA_GOURMET",
        "COZINHA_GRANDE",
        "DEPENDENCIA_DE_EMPREGADOS",
        "DEPOSITO",
        "DESPENSA",
        "DRYWALL",
        "EDICULA",
        "ESCADA",
        "ESCRITORIO",
        "FOGAO",
        "FORNO_DE_PIZZA",
        "FREEZER",
        "GEMINADA",
        "GESSO_SANCA_TETO_REBAIXADO",
        "HIDROMASSAGEM",
        "IMOVEL_DE_ESQUINA",
        "INTERFONE",
        "ISOLAMENTO_ACUSTICO",
        "ISOLAMENTO_TERMICO",
        "JANELA_DE_ALUMINIO",
        "JANELA_GRANDE",
        "LAJE",
        "MEIO_ANDAR",
        "MEZANINO",
        "MOVEL_PLANEJADO",
        "MURO_DE_VIDRO",
        "MURO_E_GRADE",
        "OFURO",
        "PE_DIREITO_ALTO",
        "PISCINA_PRIVATIVA",
        "PISO_DE_MADEIRA",
        "PISO_ELEVADO",
        "PISO_FRIO",
        "PISO_LAMINADO",
        "PISO_VINILICO",
        "PLATIBANDA",
        "PORCELANATO",
        "POSSUI_DIVISORIA",
        "QUARTO_DE_SERVICO",
        "QUARTO_EXTRA_REVERSIVEL",
        "QUINTAL",
        "SALA_DE_ALMOCO",
        "SALA_DE_JANTAR",
        "SALA_GRANDE",
        "SALA_PEQUENA",
        "TV_A_CABO",
        "VARANDA",
        "VARANDA_FECHADA_COM_VIDRO",
        "VENTILACAO_NATURAL",
        "VISTA_PARA_O_MAR",
        "VISTA_PANORAMICA",
        "VISTA_PARA_A_MONTANHA",
        "VISTA_PARA_LAGO",
        "ACEITA_ANIMAIS",
        "AR_CONDICIONADO",
        "CLOSET",
        "COZINHA_AMERICANA",
        "LAREIRA",
        "MOBILIADO",
        "VARANDA_GOURMET",
      ],
      escopo_briefing: ["GERAL", "CORRETOR"],
      estado_conservacao: ["NOVO", "REFORMADO", "BOM", "A_REFORMAR"],
      estagio_obra: [
        "FUNDACAO",
        "ESTRUTURA",
        "ALVENARIA",
        "INSTALACOES",
        "ACABAMENTO",
        "FINALIZACAO",
      ],
      etapa_negocio: [
        "NOVO",
        "ABERTO",
        "EM_ATENDIMENTO",
        "QUALIFICADO",
        "OPORTUNIDADE",
        "CLIENTE",
        "DESQUALIFICADO",
      ],
      fase_empreendimento: ["NA_PLANTA", "EM_CONSTRUCAO", "ENTREGUE"],
      finalidade: ["COMPRAR", "ALUGAR"],
      genero: ["MASCULINO", "FEMININO", "NAO_INFORMAR"],
      intencao_compra: ["MORADIA", "INVESTIMENTO"],
      motivo_desqualificacao: [
        "NAO_RESPONDEU_TENTATIVAS_DE_CONTATO",
        "CONTATO_INVALIDO",
        "SOLICITOU_NAO_SER_CONTATADO",
        "ORCAMENTO_INCOMPATIVEL",
        "SEM_PERFIL_DE_COMPRA",
        "APENAS_PESQUISA_OU_CURIOSIDADE",
        "SEM_URGENCIA_NO_MOMENTO",
        "NAO_ENCONTROU_IMOVEIS_COMPATIVEIS",
        "LOCALIZACAO_NAO_ATENDE",
        "CARACTERISTICAS_NAO_ATENDEM",
        "JA_FECHOU_COM_OUTRO_CORRETOR_OU_IMOBILIARIA",
        "ADIOU_DECISAO",
        "MUDANCA_DE_PLANOS_PESSOAIS_OU_FINANCEIROS",
        "LEAD_DUPLICADO_OU_INVALIDO",
        "SPAM_OU_TESTE",
        "PERDA_POR_FALHA_NO_ATENDIMENTO",
        "OUTRO",
      ],
      origem_imovel: ["MANUAL", "IMPORTACAO", "INTEGRACAO"],
      origem_lead: [
        "CORRETOR_ONE",
        "GRUPO_OLX",
        "GOOGLE_ADS",
        "META_ADS",
        "INDICACAO",
        "EVENTO",
        "FEIRA",
        "PLANTAO",
        "IMOVELWEB",
        "CHAVES_NA_MAO",
        "CASA_MINEIRA",
        "LUGAR_CERTO",
        "MERCADO_LIVRE",
        "MEU_IMOVEL",
        "DREAMCASA",
        "QUINTO_ANDAR",
        "LOFT",
        "I123",
        "AGENTE_IMOVEL",
        "TROVIT",
        "IMOVEIS_CURITIBA",
        "WHATSAPP_BUSINESS",
        "OUTRO",
      ],
      papel_imobiliaria: ["DONO", "ADMIN", "CORRETOR"],
      periodicidade: ["MENSAL", "ANUAL"],
      ref_tipo: [
        "IMOVEL",
        "EMPREENDIMENTO",
        "ARTIGO",
        "CAMPANHA",
        "TEMPLATE",
        "OUTRO",
      ],
      status_atividade: ["PENDENTE", "CONCLUIDA", "CANCELADA"],
      status_dominio: [
        "NAO_CONFIGURADO",
        "PENDENTE_VALIDACAO",
        "ATIVO",
        "SUSPENSO",
      ],
      status_empreendimento: ["RASCUNHO", "PUBLICADO", "PAUSADO", "INATIVO"],
      status_imovel: [
        "RASCUNHO",
        "PUBLICADO",
        "PAUSADO",
        "VENDIDO",
        "ALUGADO",
        "INATIVO",
      ],
      status_lead: [
        "NOVO",
        "ABERTO",
        "EM_ATENDIMENTO",
        "QUALIFICADO",
        "OPORTUNIDADE",
        "CLIENTE",
        "DESQUALIFICADO",
      ],
      status_portal_user: ["ATIVO", "SUSPENSO"],
      status_proposta: [
        "RASCUNHO",
        "ENVIADA",
        "ACEITA",
        "RECUSADA",
        "EXPIRADA",
      ],
      status_usuario: ["ATIVO", "PENDENTE", "BLOQUEADO"],
      storage_provider: ["SUPABASE", "S3"],
      subtipo_imovel: [
        "COBERTURA",
        "DUPLEX",
        "TRIPLEX",
        "GARDEN",
        "LOFT",
        "CONJUNTO_COMERCIAL",
      ],
      tipo_atividade: [
        "LIGACAO",
        "WHATSAPP",
        "EMAIL",
        "VISITA",
        "REUNIAO",
        "TAREFA",
      ],
      tipo_construcao: ["PRONTO_USO", "NA_PLANTA", "EM_CONSTRUCAO"],
      tipo_conteudo: ["IMOVEL", "EMPREENDIMENTO", "ARTIGO", "NEWSLETTER"],
      tipo_imovel: [
        "APARTAMENTO",
        "CASA",
        "CASA_DE_CONDOMINIO",
        "CASA_DE_VILA",
        "COBERTURA",
        "CASA_COMERCIAL",
        "ESCRITORIO",
        "FAZENDA_SITIO_CHACARA",
        "FLAT",
        "GALPAO_DEPOSITO_ARMAZEM",
        "GARAGEM",
        "KITNET_CONJUGADO",
        "HOTEL_MOTEL_POUSADA",
        "LOFT",
        "LOTE_TERRENO",
        "PONTO_COMERCIAL_LOJA_BOX",
        "PREDIO_EDIFICIO_INTEIRO",
        "STUDIO",
      ],
      tipo_midia: ["IMAGEM", "VIDEO", "PDF"],
      tipo_negociacao: ["VENDA", "ALUGUEL", "VENDA_E_ALUGUEL"],
      tipo_proposta: ["SELECAO", "IMOVEL", "EMPREENDIMENTO", "COMERCIAL"],
      tipo_timeline: ["STATUS", "PROPOSTA", "ATIVIDADE", "NOTA", "SISTEMA"],
      tipo_uso: ["RESIDENCIAL", "COMERCIAL"],
      tipo_vista: ["LIVRE", "PARQUE", "CIDADE", "MAR", "VERDE"],
      uf: [
        "AC",
        "AL",
        "AP",
        "AM",
        "BA",
        "CE",
        "DF",
        "ES",
        "GO",
        "MA",
        "MT",
        "MS",
        "MG",
        "PA",
        "PB",
        "PR",
        "PE",
        "PI",
        "RJ",
        "RN",
        "RS",
        "RO",
        "RR",
        "SC",
        "SP",
        "SE",
        "TO",
      ],
      vaga_cobertura: ["COBERTA", "DESCOBERTA"],
      vaga_tamanho: ["PEQUENA", "MEDIA", "GRANDE"],
      vaga_tipo: ["PRIVATIVA", "LIVRE"],
      variante_tipo: [
        "THUMB_150",
        "W240",
        "W360",
        "W480",
        "W768",
        "W1024",
        "FULL_1920",
      ],
    },
  },
} as const
