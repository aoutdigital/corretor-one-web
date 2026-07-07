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
      assinaturas: {
        Row: {
          cancelado_em: string | null
          created_at: string
          fim_em: string | null
          id: string
          inicio_em: string
          owner_id: string
          plano_id: string
          status: Database["public"]["Enums"]["status_assinatura"]
        }
        Insert: {
          cancelado_em?: string | null
          created_at?: string
          fim_em?: string | null
          id?: string
          inicio_em?: string
          owner_id: string
          plano_id: string
          status?: Database["public"]["Enums"]["status_assinatura"]
        }
        Update: {
          cancelado_em?: string | null
          created_at?: string
          fim_em?: string | null
          id?: string
          inicio_em?: string
          owner_id?: string
          plano_id?: string
          status?: Database["public"]["Enums"]["status_assinatura"]
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinaturas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_atividade"]
          concluida_em: string | null
          created_at: string
          descricao: string | null
          id: string
          lead_id: string
          modelo: Database["public"]["Enums"]["modelo_atividade"]
          negocio_id: string | null
          owner_id: string
          quando_em: string | null
          status: Database["public"]["Enums"]["status_atividade"]
          tipo: Database["public"]["Enums"]["tipo_atividade"]
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["categoria_atividade"]
          concluida_em?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          lead_id: string
          modelo?: Database["public"]["Enums"]["modelo_atividade"]
          negocio_id?: string | null
          owner_id: string
          quando_em?: string | null
          status?: Database["public"]["Enums"]["status_atividade"]
          tipo: Database["public"]["Enums"]["tipo_atividade"]
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_atividade"]
          concluida_em?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          lead_id?: string
          modelo?: Database["public"]["Enums"]["modelo_atividade"]
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
          localizacao_contexto: Json
          lng: number | null
          logradouro: string
          keywords: string[]
          meta_description: string | null
          meta_title: string | null
          n_andares: number | null
          n_torres: number | null
          n_unidades: number | null
          qtd_elevadores: number | null
          unidades_cobertura: number | null
          unidades_por_andar: number | null
          unidades_terreo: number | null
          nome: string
          numero: string
          owner_id: string
          previsao_entrega_em: string | null
          publicado_em: string | null
          resumo_curto: string | null
          slug_publico: string | null
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
          localizacao_contexto?: Json
          lng?: number | null
          logradouro: string
          meta_description?: string | null
          meta_title?: string | null
          n_andares?: number | null
          n_torres?: number | null
          n_unidades?: number | null
          keywords?: string[]
          resumo_curto?: string | null
          qtd_elevadores?: number | null
          unidades_cobertura?: number | null
          unidades_por_andar?: number | null
          unidades_terreo?: number | null
          nome: string
          numero: string
          owner_id: string
          previsao_entrega_em?: string | null
          publicado_em?: string | null
          slug_publico?: string | null
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
          localizacao_contexto?: Json
          lng?: number | null
          logradouro?: string
          meta_description?: string | null
          meta_title?: string | null
          n_andares?: number | null
          n_torres?: number | null
          n_unidades?: number | null
          keywords?: string[]
          resumo_curto?: string | null
          qtd_elevadores?: number | null
          unidades_cobertura?: number | null
          unidades_por_andar?: number | null
          unidades_terreo?: number | null
          nome?: string
          numero?: string
          owner_id?: string
          previsao_entrega_em?: string | null
          publicado_em?: string | null
          slug_publico?: string | null
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
      empreendimento_midia_publica: {
        Row: {
          created_at: string
          empreendimento_id: string
          id: string
          indice_publico: number
          midia_id: string
          midia_relacao_id: string
          ordem: number
          owner_id: string
          slug_publico: string
          storage_bucket: string
          storage_path: string
          storage_provider: Database["public"]["Enums"]["storage_provider"]
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          empreendimento_id: string
          id?: string
          indice_publico: number
          midia_id: string
          midia_relacao_id: string
          ordem?: number
          owner_id: string
          slug_publico: string
          storage_bucket: string
          storage_path: string
          storage_provider?: Database["public"]["Enums"]["storage_provider"]
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          empreendimento_id?: string
          id?: string
          indice_publico?: number
          midia_id?: string
          midia_relacao_id?: string
          ordem?: number
          owner_id?: string
          slug_publico?: string
          storage_bucket?: string
          storage_path?: string
          storage_provider?: Database["public"]["Enums"]["storage_provider"]
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "empreendimento_midia_publica_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empreendimento_midia_publica_midia_id_fkey"
            columns: ["midia_id"]
            isOneToOne: false
            referencedRelation: "midia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empreendimento_midia_publica_midia_relacao_id_fkey"
            columns: ["midia_relacao_id"]
            isOneToOne: false
            referencedRelation: "midia_relacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empreendimento_midia_publica_owner_id_fkey"
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
          aceita_parceria_status:
            | Database["public"]["Enums"]["aceita_parceria_status"]
            | null
          aceita_permuta: boolean
          aceite_corretor_exclusivo: boolean
          address_json: Json
          andar: number | null
          ano_construcao: number | null
          area_terreno: number | null
          area_total: number | null
          area_util: number | null
          bairro: string
          bairro_comercial: string | null
          banheiros: number | null
          caracteristicas: string[] | null
          cep: string | null
          chaves_na_mao: boolean
          cidade: string
          codigo: string | null
          captacao_corretor_parceiro: boolean
          comissao_captador_percentual: number | null
          comissao_locacao: string | null
          comissao_venda_percentual: number | null
          comissao_vendedor_percentual: number | null
          condominio: number | null
          cozinhas: number | null
          created_at: string
          corretor_parceiro_email: string | null
          corretor_parceiro_nome: string | null
          corretor_parceiro_telefone: string | null
          descricao: string
          descricao_permuta: string | null
          descricao_curta: string | null
          destaque: boolean
          disponibilizar_no_bolsao_parceria: boolean
          bolsao_permitir_download_midia_kit: boolean
          bolsao_permitir_mudanca_preco: boolean
          bolsao_somente_visitas_agendadas: boolean
          bolsao_somente_visitas_com_minha_presenca: boolean
          divisao_comissao_parceria: string | null
          dormitorios: number | null
          enderecovisualizacao: Database["public"]["Enums"]["endereco_visualizacao_imovel"]
          empreendimento_id: string | null
          empreendimento_tipo_id: string | null
          empreendimento_tipologia_label: string | null
          endereco_complemento: string | null
          estado: Database["public"]["Enums"]["uf"]
          estado_conservacao:
            | Database["public"]["Enums"]["estado_conservacao"]
            | null
          exclusividade: boolean
          exclusividade_comissao_minha_percentual: number | null
          exclusividade_comissao_parceiro_percentual: number | null
          exclusividade_outras_comissoes_percentual: number | null
          exclusividade_data_vencimento: string | null
          exclusividade_observacoes: string | null
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
          lateral_1_metros: number | null
          lateral_2_metros: number | null
          lat: number | null
          lavabos: number | null
          localizacao_contexto: Json
          lng: number | null
          logradouro: string
          meta_description: string | null
          meta_title: string | null
          mostrar_andar_no_anuncio: boolean
          mostrar_complemento_no_anuncio: boolean
          numero: string
          ocultar_numero_publico: boolean
          origem_cadastro: Database["public"]["Enums"]["origem_imovel"]
          owner_id: string
          ocupacao_imovel: Database["public"]["Enums"]["ocupacao_imovel"] | null
          observacoes_gerais: string | null
          outras_comissoes_percentual: number | null
          permite_visita_imediata: boolean
          placa_no_local: boolean
          preco_locacao: number | null
          preco_venda: number | null
          publicado_em: string | null
          regra_geral_exclusividade: string | null
          salas: number | null
          slug_publico: string | null
          status: Database["public"]["Enums"]["status_imovel"]
          step_rascunho: number
          subtipo: Database["public"]["Enums"]["subtipo_imovel"] | null
          suites: number | null
          tipo: Database["public"]["Enums"]["tipo_imovel"]
          tipo_negociacao: Database["public"]["Enums"]["tipo_negociacao"] | null
          titulo: string
          ultimo_andar: boolean
          unidade_numero: string | null
          updated_at: string
          usar_caracteristicas_empreendimento: boolean
          usar_midias_empreendimento: boolean
          veio_do_bolsao: boolean
          vaga_coberturas:
            | Database["public"]["Enums"]["vaga_cobertura"][]
            | null
          vaga_tamanhos: Database["public"]["Enums"]["vaga_tamanho"][] | null
          vaga_tipos: Database["public"]["Enums"]["vaga_tipo"][] | null
          vagas: number | null
          valor_m2: number | null
          minimo_aceito_em_maos: number | null
          views_count: number
          vista: Database["public"]["Enums"]["tipo_vista"] | null
        }
        Insert: {
          aceita_parceria_status?:
            | Database["public"]["Enums"]["aceita_parceria_status"]
            | null
          aceita_permuta?: boolean
          aceite_corretor_exclusivo?: boolean
          address_json: Json
          andar?: number | null
          ano_construcao?: number | null
          area_terreno?: number | null
          area_total?: number | null
          area_util?: number | null
          bairro: string
          bairro_comercial?: string | null
          banheiros?: number | null
          caracteristicas?: string[] | null
          cep?: string | null
          chaves_na_mao?: boolean
          cidade: string
          codigo?: string | null
          captacao_corretor_parceiro?: boolean
          comissao_captador_percentual?: number | null
          comissao_locacao?: string | null
          comissao_venda_percentual?: number | null
          comissao_vendedor_percentual?: number | null
          condominio?: number | null
          cozinhas?: number | null
          created_at?: string
          corretor_parceiro_email?: string | null
          corretor_parceiro_nome?: string | null
          corretor_parceiro_telefone?: string | null
          descricao: string
          descricao_permuta?: string | null
          descricao_curta?: string | null
          destaque?: boolean
          disponibilizar_no_bolsao_parceria?: boolean
          bolsao_permitir_download_midia_kit?: boolean
          bolsao_permitir_mudanca_preco?: boolean
          bolsao_somente_visitas_agendadas?: boolean
          bolsao_somente_visitas_com_minha_presenca?: boolean
          divisao_comissao_parceria?: string | null
          dormitorios?: number | null
          enderecovisualizacao?: Database["public"]["Enums"]["endereco_visualizacao_imovel"]
          empreendimento_id?: string | null
          empreendimento_tipo_id?: string | null
          empreendimento_tipologia_label?: string | null
          endereco_complemento?: string | null
          estado: Database["public"]["Enums"]["uf"]
          estado_conservacao?:
            | Database["public"]["Enums"]["estado_conservacao"]
            | null
          exclusividade?: boolean
          exclusividade_comissao_minha_percentual?: number | null
          exclusividade_comissao_parceiro_percentual?: number | null
          exclusividade_outras_comissoes_percentual?: number | null
          exclusividade_data_vencimento?: string | null
          exclusividade_observacoes?: string | null
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
          lateral_1_metros?: number | null
          lateral_2_metros?: number | null
          lat?: number | null
          lavabos?: number | null
          localizacao_contexto?: Json
          lng?: number | null
          logradouro: string
          meta_description?: string | null
          meta_title?: string | null
          mostrar_andar_no_anuncio?: boolean
          mostrar_complemento_no_anuncio?: boolean
          numero: string
          ocultar_numero_publico?: boolean
          origem_cadastro?: Database["public"]["Enums"]["origem_imovel"]
          owner_id: string
          ocupacao_imovel?: Database["public"]["Enums"]["ocupacao_imovel"] | null
          observacoes_gerais?: string | null
          outras_comissoes_percentual?: number | null
          permite_visita_imediata?: boolean
          placa_no_local?: boolean
          preco_locacao?: number | null
          preco_venda?: number | null
          publicado_em?: string | null
          regra_geral_exclusividade?: string | null
          salas?: number | null
          slug_publico?: string | null
          status?: Database["public"]["Enums"]["status_imovel"]
          step_rascunho?: number
          subtipo?: Database["public"]["Enums"]["subtipo_imovel"] | null
          suites?: number | null
          tipo: Database["public"]["Enums"]["tipo_imovel"]
          tipo_negociacao?: Database["public"]["Enums"]["tipo_negociacao"] | null
          titulo: string
          ultimo_andar?: boolean
          unidade_numero?: string | null
          updated_at?: string
          usar_caracteristicas_empreendimento?: boolean
          usar_midias_empreendimento?: boolean
          veio_do_bolsao?: boolean
          vaga_coberturas?:
            | Database["public"]["Enums"]["vaga_cobertura"][]
            | null
          vaga_tamanhos?: Database["public"]["Enums"]["vaga_tamanho"][] | null
          vaga_tipos?: Database["public"]["Enums"]["vaga_tipo"][] | null
          vagas?: number | null
          valor_m2?: number | null
          minimo_aceito_em_maos?: number | null
          views_count?: number
          vista?: Database["public"]["Enums"]["tipo_vista"] | null
        }
        Update: {
          aceita_parceria_status?:
            | Database["public"]["Enums"]["aceita_parceria_status"]
            | null
          aceita_permuta?: boolean
          aceite_corretor_exclusivo?: boolean
          address_json?: Json
          andar?: number | null
          ano_construcao?: number | null
          area_terreno?: number | null
          area_total?: number | null
          area_util?: number | null
          bairro?: string
          bairro_comercial?: string | null
          banheiros?: number | null
          caracteristicas?: string[] | null
          cep?: string | null
          chaves_na_mao?: boolean
          cidade?: string
          codigo?: string | null
          captacao_corretor_parceiro?: boolean
          comissao_captador_percentual?: number | null
          comissao_locacao?: string | null
          comissao_venda_percentual?: number | null
          comissao_vendedor_percentual?: number | null
          condominio?: number | null
          cozinhas?: number | null
          created_at?: string
          corretor_parceiro_email?: string | null
          corretor_parceiro_nome?: string | null
          corretor_parceiro_telefone?: string | null
          descricao?: string
          descricao_permuta?: string | null
          descricao_curta?: string | null
          destaque?: boolean
          disponibilizar_no_bolsao_parceria?: boolean
          bolsao_permitir_download_midia_kit?: boolean
          bolsao_permitir_mudanca_preco?: boolean
          bolsao_somente_visitas_agendadas?: boolean
          bolsao_somente_visitas_com_minha_presenca?: boolean
          divisao_comissao_parceria?: string | null
          dormitorios?: number | null
          enderecovisualizacao?: Database["public"]["Enums"]["endereco_visualizacao_imovel"]
          empreendimento_id?: string | null
          empreendimento_tipo_id?: string | null
          empreendimento_tipologia_label?: string | null
          endereco_complemento?: string | null
          estado?: Database["public"]["Enums"]["uf"]
          estado_conservacao?:
            | Database["public"]["Enums"]["estado_conservacao"]
            | null
          exclusividade?: boolean
          exclusividade_comissao_minha_percentual?: number | null
          exclusividade_comissao_parceiro_percentual?: number | null
          exclusividade_outras_comissoes_percentual?: number | null
          exclusividade_data_vencimento?: string | null
          exclusividade_observacoes?: string | null
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
          lateral_1_metros?: number | null
          lateral_2_metros?: number | null
          lat?: number | null
          lavabos?: number | null
          localizacao_contexto?: Json
          lng?: number | null
          logradouro?: string
          meta_description?: string | null
          meta_title?: string | null
          mostrar_andar_no_anuncio?: boolean
          mostrar_complemento_no_anuncio?: boolean
          numero?: string
          ocultar_numero_publico?: boolean
          origem_cadastro?: Database["public"]["Enums"]["origem_imovel"]
          owner_id?: string
          ocupacao_imovel?: Database["public"]["Enums"]["ocupacao_imovel"] | null
          observacoes_gerais?: string | null
          outras_comissoes_percentual?: number | null
          permite_visita_imediata?: boolean
          placa_no_local?: boolean
          preco_locacao?: number | null
          preco_venda?: number | null
          publicado_em?: string | null
          regra_geral_exclusividade?: string | null
          salas?: number | null
          slug_publico?: string | null
          status?: Database["public"]["Enums"]["status_imovel"]
          step_rascunho?: number
          subtipo?: Database["public"]["Enums"]["subtipo_imovel"] | null
          suites?: number | null
          tipo?: Database["public"]["Enums"]["tipo_imovel"]
          tipo_negociacao?: Database["public"]["Enums"]["tipo_negociacao"] | null
          titulo?: string
          ultimo_andar?: boolean
          unidade_numero?: string | null
          updated_at?: string
          usar_caracteristicas_empreendimento?: boolean
          usar_midias_empreendimento?: boolean
          veio_do_bolsao?: boolean
          vaga_coberturas?:
            | Database["public"]["Enums"]["vaga_cobertura"][]
            | null
          vaga_tamanhos?: Database["public"]["Enums"]["vaga_tamanho"][] | null
          vaga_tipos?: Database["public"]["Enums"]["vaga_tipo"][] | null
          vagas?: number | null
          valor_m2?: number | null
          minimo_aceito_em_maos?: number | null
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
            foreignKeyName: "imoveis_empreendimento_tipo_id_fkey"
            columns: ["empreendimento_tipo_id"]
            isOneToOne: false
            referencedRelation: "empreendimento_tipos"
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
      imovel_ambientes: {
        Row: {
          area_m2: number | null
          created_at: string
          dados: Json
          id: string
          imovel_id: string
          ordem: number
          owner_id: string
          principal: boolean
          tipo_ambiente: Database["public"]["Enums"]["tipo_ambiente_imovel"]
          updated_at: string
        }
        Insert: {
          area_m2?: number | null
          created_at?: string
          dados?: Json
          id?: string
          imovel_id: string
          ordem?: number
          owner_id: string
          principal?: boolean
          tipo_ambiente: Database["public"]["Enums"]["tipo_ambiente_imovel"]
          updated_at?: string
        }
        Update: {
          area_m2?: number | null
          created_at?: string
          dados?: Json
          id?: string
          imovel_id?: string
          ordem?: number
          owner_id?: string
          principal?: boolean
          tipo_ambiente?: Database["public"]["Enums"]["tipo_ambiente_imovel"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imovel_ambientes_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imovel_ambientes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imovel_delete_jobs: {
        Row: {
          created_at: string
          erro: string | null
          finished_at: string | null
          id: string
          imovel_id: string
          next_retry_at: string | null
          owner_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["status_imovel_delete_job"]
          tentativas: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          erro?: string | null
          finished_at?: string | null
          id?: string
          imovel_id: string
          next_retry_at?: string | null
          owner_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["status_imovel_delete_job"]
          tentativas?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          erro?: string | null
          finished_at?: string | null
          id?: string
          imovel_id?: string
          next_retry_at?: string | null
          owner_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["status_imovel_delete_job"]
          tentativas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imovel_delete_jobs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imovel_midia_publica: {
        Row: {
          created_at: string
          id: string
          imovel_id: string
          indice_publico: number
          midia_id: string
          midia_relacao_id: string
          ordem: number
          owner_id: string
          slug_publico: string
          storage_bucket: string
          storage_path: string
          storage_provider: Database["public"]["Enums"]["storage_provider"]
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          imovel_id: string
          indice_publico: number
          midia_id: string
          midia_relacao_id: string
          ordem?: number
          owner_id: string
          slug_publico: string
          storage_bucket: string
          storage_path: string
          storage_provider?: Database["public"]["Enums"]["storage_provider"]
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          imovel_id?: string
          indice_publico?: number
          midia_id?: string
          midia_relacao_id?: string
          ordem?: number
          owner_id?: string
          slug_publico?: string
          storage_bucket?: string
          storage_path?: string
          storage_provider?: Database["public"]["Enums"]["storage_provider"]
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "imovel_midia_publica_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imovel_midia_publica_midia_id_fkey"
            columns: ["midia_id"]
            isOneToOne: false
            referencedRelation: "midia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imovel_midia_publica_midia_relacao_id_fkey"
            columns: ["midia_relacao_id"]
            isOneToOne: false
            referencedRelation: "midia_relacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imovel_midia_publica_owner_id_fkey"
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
      lead_briefings: {
        Row: {
          area_util_max: number | null
          area_util_max_comercial: number | null
          area_util_min: number | null
          area_util_min_comercial: number | null
          canais: Database["public"]["Enums"]["canal_contato"][] | null
          caracteristicas_comerciais:
            | Database["public"]["Enums"]["caracteristica_comercial"][]
            | null
          caracteristicas_residenciais:
            | Database["public"]["Enums"]["caracteristica_imovel"][]
            | null
          categoriaimovel: string[] | null
          subcategoriaimovel: string[] | null
          construcao: Database["public"]["Enums"]["tipo_construcao"][] | null
          conteudos: Database["public"]["Enums"]["tipo_conteudo"][] | null
          created_at: string
          geolocacao_id: string | null
          id: string
          objetivolead: Database["public"]["Enums"]["objetivo_lead"][] | null
          intencao_compra: Database["public"]["Enums"]["intencao_compra"] | null
          lat: number | null
          lead_id: string
          lng: number | null
          localizacao_texto: string | null
          owner_id: string
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
          canais?: Database["public"]["Enums"]["canal_contato"][] | null
          caracteristicas_comerciais?:
            | Database["public"]["Enums"]["caracteristica_comercial"][]
            | null
          caracteristicas_residenciais?:
            | Database["public"]["Enums"]["caracteristica_imovel"][]
            | null
          categoriaimovel?: string[] | null
          subcategoriaimovel?: string[] | null
          construcao?: Database["public"]["Enums"]["tipo_construcao"][] | null
          conteudos?: Database["public"]["Enums"]["tipo_conteudo"][] | null
          created_at?: string
          geolocacao_id?: string | null
          id?: string
          objetivolead?: Database["public"]["Enums"]["objetivo_lead"][] | null
          intencao_compra?:
            | Database["public"]["Enums"]["intencao_compra"]
            | null
          lat?: number | null
          lead_id: string
          lng?: number | null
          localizacao_texto?: string | null
          owner_id: string
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
          canais?: Database["public"]["Enums"]["canal_contato"][] | null
          caracteristicas_comerciais?:
            | Database["public"]["Enums"]["caracteristica_comercial"][]
            | null
          caracteristicas_residenciais?:
            | Database["public"]["Enums"]["caracteristica_imovel"][]
            | null
          categoriaimovel?: string[] | null
          subcategoriaimovel?: string[] | null
          construcao?: Database["public"]["Enums"]["tipo_construcao"][] | null
          conteudos?: Database["public"]["Enums"]["tipo_conteudo"][] | null
          created_at?: string
          geolocacao_id?: string | null
          id?: string
          objetivolead?: Database["public"]["Enums"]["objetivo_lead"][] | null
          intencao_compra?:
            | Database["public"]["Enums"]["intencao_compra"]
            | null
          lat?: number | null
          lead_id?: string
          lng?: number | null
          localizacao_texto?: string | null
          owner_id?: string
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
          vagas_min?: number | null
          vagas_min_comercial?: number | null
          valor_max?: number | null
          valor_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_briefings_geolocacao_id_fkey"
            columns: ["geolocacao_id"]
            isOneToOne: false
            referencedRelation: "geolocacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_briefings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_briefings_owner_id_fkey"
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
          aguardando_produto: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string
          endereco: string | null
          email: string | null
          email_lower: string | null
          form_key: string | null
          form_payload: Json
          id: string
          imovel_id: string | null
          mensagem: string | null
          motivo_desqualificacao:
            | Database["public"]["Enums"]["motivo_desqualificacao"]
            | null
          nome: string
          numero: string | null
          origem: Database["public"]["Enums"]["origem_lead"]
          owner_id: string
          page_url: string | null
          pais: string | null
          profissao: string | null
          referrer: string | null
          status: Database["public"]["Enums"]["status_lead"]
          telefone: string | null
          telefone_e164: string | null
          uf: Database["public"]["Enums"]["uf"] | null
          updated_at: string
          utm: Json | null
        }
        Insert: {
          aguardando_produto?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          endereco?: string | null
          email?: string | null
          email_lower?: string | null
          form_key?: string | null
          form_payload?: Json
          id?: string
          imovel_id?: string | null
          mensagem?: string | null
          motivo_desqualificacao?:
            | Database["public"]["Enums"]["motivo_desqualificacao"]
            | null
          nome: string
          numero?: string | null
          origem: Database["public"]["Enums"]["origem_lead"]
          owner_id: string
          page_url?: string | null
          pais?: string | null
          profissao?: string | null
          referrer?: string | null
          status?: Database["public"]["Enums"]["status_lead"]
          telefone?: string | null
          telefone_e164?: string | null
          uf?: Database["public"]["Enums"]["uf"] | null
          updated_at?: string
          utm?: Json | null
        }
        Update: {
          aguardando_produto?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          endereco?: string | null
          email?: string | null
          email_lower?: string | null
          form_key?: string | null
          form_payload?: Json
          id?: string
          imovel_id?: string | null
          mensagem?: string | null
          motivo_desqualificacao?:
            | Database["public"]["Enums"]["motivo_desqualificacao"]
            | null
          nome?: string
          numero?: string | null
          origem?: Database["public"]["Enums"]["origem_lead"]
          owner_id?: string
          page_url?: string | null
          pais?: string | null
          profissao?: string | null
          referrer?: string | null
          status?: Database["public"]["Enums"]["status_lead"]
          telefone?: string | null
          telefone_e164?: string | null
          uf?: Database["public"]["Enums"]["uf"] | null
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
      negocio_corretores: {
        Row: {
          created_at: string
          email: string | null
          id: string
          negocio_id: string
          nome: string
          owner_id: string
          percentual_comissao: number | null
          telefone: string | null
          updated_at: string
          valor_comissao: number | null
          vinculado_corretor_parceiro: boolean
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          negocio_id: string
          nome: string
          owner_id: string
          percentual_comissao?: number | null
          telefone?: string | null
          updated_at?: string
          valor_comissao?: number | null
          vinculado_corretor_parceiro?: boolean
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          negocio_id?: string
          nome?: string
          owner_id?: string
          percentual_comissao?: number | null
          telefone?: string | null
          updated_at?: string
          valor_comissao?: number | null
          vinculado_corretor_parceiro?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "negocio_corretores_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocio_corretores_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      negocio_parte_pessoas: {
        Row: {
          bairro: string
          cep: string
          cidade: string
          complemento: string | null
          cpf: string
          created_at: string
          email: string
          endereco: string
          id: string
          negocio_parte_id: string
          nome_completo: string
          numero: string
          owner_id: string
          pais: string
          telefone: string | null
          uf: Database["public"]["Enums"]["uf"]
          updated_at: string
        }
        Insert: {
          bairro: string
          cep: string
          cidade: string
          complemento?: string | null
          cpf: string
          created_at?: string
          email: string
          endereco: string
          id?: string
          negocio_parte_id: string
          nome_completo: string
          numero: string
          owner_id: string
          pais: string
          telefone?: string | null
          uf: Database["public"]["Enums"]["uf"]
          updated_at?: string
        }
        Update: {
          bairro?: string
          cep?: string
          cidade?: string
          complemento?: string | null
          cpf?: string
          created_at?: string
          email?: string
          endereco?: string
          id?: string
          negocio_parte_id?: string
          nome_completo?: string
          numero?: string
          owner_id?: string
          pais?: string
          telefone?: string | null
          uf?: Database["public"]["Enums"]["uf"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "negocio_parte_pessoas_negocio_parte_id_fkey"
            columns: ["negocio_parte_id"]
            isOneToOne: false
            referencedRelation: "negocio_partes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocio_parte_pessoas_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      negocio_partes: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          created_at: string
          endereco: string | null
          id: string
          negocio_id: string
          numero: string | null
          owner_id: string
          pais: string | null
          papel: Database["public"]["Enums"]["papel_parte_negocio"]
          razao_social: string | null
          tipo_pessoa: Database["public"]["Enums"]["tipo_pessoa_negocio"]
          uf: Database["public"]["Enums"]["uf"] | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          negocio_id: string
          numero?: string | null
          owner_id: string
          pais?: string | null
          papel: Database["public"]["Enums"]["papel_parte_negocio"]
          razao_social?: string | null
          tipo_pessoa: Database["public"]["Enums"]["tipo_pessoa_negocio"]
          uf?: Database["public"]["Enums"]["uf"] | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          negocio_id?: string
          numero?: string | null
          owner_id?: string
          pais?: string | null
          papel?: Database["public"]["Enums"]["papel_parte_negocio"]
          razao_social?: string | null
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa_negocio"]
          uf?: Database["public"]["Enums"]["uf"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "negocio_partes_negocio_id_fkey"
            columns: ["negocio_id"]
            isOneToOne: false
            referencedRelation: "negocios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negocio_partes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      negocios: {
        Row: {
          comissaopercentual: number | null
          comissaovalor: number | null
          created_at: string
          empreendimento_id: string | null
          etapa: Database["public"]["Enums"]["etapa_negocio"]
          fase: Database["public"]["Enums"]["fase_negocio"]
          fechado_em: string | null
          finalidade: Database["public"]["Enums"]["finalidade"] | null
          fgtsvalor: number | null
          financiamentovalor: number | null
          ganho_em: string | null
          id: string
          imovel_id: string | null
          lead_id: string
          lista_id: string | null
          modalidade: Database["public"]["Enums"]["modalidade_negocio"]
          notas: string | null
          observacoes: string | null
          outrosrecursosvalor: number | null
          owner_id: string
          perdido_em: string | null
          proxima_acao_em: string | null
          recursopropriovalor: number | null
          subfase_juridica: Database["public"]["Enums"]["subfase_juridica_negocio"] | null
          titulo: string | null
          updated_at: string
          valor: number | null
          valor_estimado: number | null
        }
        Insert: {
          comissaopercentual?: number | null
          comissaovalor?: number | null
          created_at?: string
          empreendimento_id?: string | null
          etapa?: Database["public"]["Enums"]["etapa_negocio"]
          fase?: Database["public"]["Enums"]["fase_negocio"]
          fechado_em?: string | null
          finalidade?: Database["public"]["Enums"]["finalidade"] | null
          fgtsvalor?: number | null
          financiamentovalor?: number | null
          ganho_em?: string | null
          id?: string
          imovel_id?: string | null
          lead_id: string
          lista_id?: string | null
          modalidade?: Database["public"]["Enums"]["modalidade_negocio"]
          notas?: string | null
          observacoes?: string | null
          outrosrecursosvalor?: number | null
          owner_id: string
          perdido_em?: string | null
          proxima_acao_em?: string | null
          recursopropriovalor?: number | null
          subfase_juridica?: Database["public"]["Enums"]["subfase_juridica_negocio"] | null
          titulo?: string | null
          updated_at?: string
          valor?: number | null
          valor_estimado?: number | null
        }
        Update: {
          comissaopercentual?: number | null
          comissaovalor?: number | null
          created_at?: string
          empreendimento_id?: string | null
          etapa?: Database["public"]["Enums"]["etapa_negocio"]
          fase?: Database["public"]["Enums"]["fase_negocio"]
          fechado_em?: string | null
          finalidade?: Database["public"]["Enums"]["finalidade"] | null
          fgtsvalor?: number | null
          financiamentovalor?: number | null
          ganho_em?: string | null
          id?: string
          imovel_id?: string | null
          lead_id?: string
          lista_id?: string | null
          modalidade?: Database["public"]["Enums"]["modalidade_negocio"]
          notas?: string | null
          observacoes?: string | null
          outrosrecursosvalor?: number | null
          owner_id?: string
          perdido_em?: string | null
          proxima_acao_em?: string | null
          recursopropriovalor?: number | null
          subfase_juridica?: Database["public"]["Enums"]["subfase_juridica_negocio"] | null
          titulo?: string | null
          updated_at?: string
          valor?: number | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "negocios_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
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
      planos: {
        Row: {
          ativo: boolean
          ayka_franquia_mensal: number
          created_at: string
          id: string
          limite_emails_mes: number | null
          limite_imoveis: number | null
          limite_storage_mb: number | null
          limite_whatsapp_mes: number | null
          nome: string
          preco_anual: number | null
          preco_mensal: number
          recursos: Json
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          ayka_franquia_mensal?: number
          created_at?: string
          id?: string
          limite_emails_mes?: number | null
          limite_imoveis?: number | null
          limite_storage_mb?: number | null
          limite_whatsapp_mes?: number | null
          nome: string
          preco_anual?: number | null
          preco_mensal?: number
          recursos?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          ayka_franquia_mensal?: number
          created_at?: string
          id?: string
          limite_emails_mes?: number | null
          limite_imoveis?: number | null
          limite_storage_mb?: number | null
          limite_whatsapp_mes?: number | null
          nome?: string
          preco_anual?: number | null
          preco_mensal?: number
          recursos?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
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
          cidades_foco_json: Json | null
          created_at: string
          creci_aprovacao: boolean
          creci_documento_midia_id: string | null
          creci_numero: string | null
          creci_sufixo: string | null
          creci_uf: Database["public"]["Enums"]["uf"] | null
          corretor_one_registro: number
          dominio_custom: string | null
          dominio_status: Database["public"]["Enums"]["status_dominio"]
          email: string
          email_verificado_em: string | null
          frase_impacto: string | null
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
          logo_nickname_url: string | null
          logo_nickname_white_url: string | null
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
          cidades_foco_json?: Json | null
          created_at?: string
          creci_aprovacao?: boolean
          creci_documento_midia_id?: string | null
          creci_numero?: string | null
          creci_sufixo?: string | null
          creci_uf?: Database["public"]["Enums"]["uf"] | null
          corretor_one_registro?: number
          dominio_custom?: string | null
          dominio_status?: Database["public"]["Enums"]["status_dominio"]
          email: string
          email_verificado_em?: string | null
          frase_impacto?: string | null
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
          logo_nickname_url?: string | null
          logo_nickname_white_url?: string | null
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
          cidades_foco_json?: Json | null
          created_at?: string
          creci_aprovacao?: boolean
          creci_documento_midia_id?: string | null
          creci_numero?: string | null
          creci_sufixo?: string | null
          creci_uf?: Database["public"]["Enums"]["uf"] | null
          corretor_one_registro?: number
          dominio_custom?: string | null
          dominio_status?: Database["public"]["Enums"]["status_dominio"]
          email?: string
          email_verificado_em?: string | null
          frase_impacto?: string | null
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
          logo_nickname_url?: string | null
          logo_nickname_white_url?: string | null
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
      profile_authority_numbers: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          ordem: number
          owner_id: string
          rotulo: string
          tipo: Database["public"]["Enums"]["profile_authority_number_type"]
          updated_at: string
          valor: string
          visivel: boolean
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          owner_id: string
          rotulo: string
          tipo: Database["public"]["Enums"]["profile_authority_number_type"]
          updated_at?: string
          valor: string
          visivel?: boolean
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          owner_id?: string
          rotulo?: string
          tipo?: Database["public"]["Enums"]["profile_authority_number_type"]
          updated_at?: string
          valor?: string
          visivel?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profile_authority_numbers_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provas_sociais: {
        Row: {
          cliente_nome_publico: string | null
          consentimento_imagem_confirmado: boolean
          created_at: string
          data_momento: string | null
          depoimento: string | null
          descricao: string | null
          destaque: boolean
          id: string
          imagem_alt: string | null
          imagem_url: string | null
          localidade: string | null
          midia_id: string | null
          ordem: number
          owner_id: string
          publicado_em: string | null
          status: Database["public"]["Enums"]["status_prova_social"]
          tags: string[]
          tipo: Database["public"]["Enums"]["prova_social_tipo"]
          titulo: string
          updated_at: string
        }
        Insert: {
          cliente_nome_publico?: string | null
          consentimento_imagem_confirmado?: boolean
          created_at?: string
          data_momento?: string | null
          depoimento?: string | null
          descricao?: string | null
          destaque?: boolean
          id?: string
          imagem_alt?: string | null
          imagem_url?: string | null
          localidade?: string | null
          midia_id?: string | null
          ordem?: number
          owner_id: string
          publicado_em?: string | null
          status?: Database["public"]["Enums"]["status_prova_social"]
          tags?: string[]
          tipo: Database["public"]["Enums"]["prova_social_tipo"]
          titulo: string
          updated_at?: string
        }
        Update: {
          cliente_nome_publico?: string | null
          consentimento_imagem_confirmado?: boolean
          created_at?: string
          data_momento?: string | null
          depoimento?: string | null
          descricao?: string | null
          destaque?: boolean
          id?: string
          imagem_alt?: string | null
          imagem_url?: string | null
          localidade?: string | null
          midia_id?: string | null
          ordem?: number
          owner_id?: string
          publicado_em?: string | null
          status?: Database["public"]["Enums"]["status_prova_social"]
          tags?: string[]
          tipo?: Database["public"]["Enums"]["prova_social_tipo"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provas_sociais_midia_id_fkey"
            columns: ["midia_id"]
            isOneToOne: false
            referencedRelation: "midia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provas_sociais_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          arquivo_midia_id: string | null
          conteudo: Json | null
          created_at: string
          enviada_em: string | null
          vencimento_em: string | null
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
          vencimento_em?: string | null
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
          vencimento_em?: string | null
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
      referencia_localidades: {
        Row: {
          codigo_ibge: number
          id: string
          nome: string
          payload: Json
          tipo: Database["public"]["Enums"]["ref_localidade_tipo"]
          uf: Database["public"]["Enums"]["uf"] | null
          updated_at: string
        }
        Insert: {
          codigo_ibge: number
          id?: string
          nome: string
          payload?: Json
          tipo: Database["public"]["Enums"]["ref_localidade_tipo"]
          uf?: Database["public"]["Enums"]["uf"] | null
          updated_at?: string
        }
        Update: {
          codigo_ibge?: number
          id?: string
          nome?: string
          payload?: Json
          tipo?: Database["public"]["Enums"]["ref_localidade_tipo"]
          uf?: Database["public"]["Enums"]["uf"] | null
          updated_at?: string
        }
        Relationships: []
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
          subcategoriaimovel: string[] | null
          construcao: Database["public"]["Enums"]["tipo_construcao"][] | null
          conteudos: Database["public"]["Enums"]["tipo_conteudo"][] | null
          corretor_id: string | null
          created_at: string
          escopo: Database["public"]["Enums"]["escopo_briefing"]
          geolocacao_id: string | null
          id: string
          objetivolead: Database["public"]["Enums"]["objetivo_lead"][] | null
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
          subcategoriaimovel?: string[] | null
          construcao?: Database["public"]["Enums"]["tipo_construcao"][] | null
          conteudos?: Database["public"]["Enums"]["tipo_conteudo"][] | null
          corretor_id?: string | null
          created_at?: string
          escopo: Database["public"]["Enums"]["escopo_briefing"]
          geolocacao_id?: string | null
          id?: string
          objetivolead?: Database["public"]["Enums"]["objetivo_lead"][] | null
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
          subcategoriaimovel?: string[] | null
          construcao?: Database["public"]["Enums"]["tipo_construcao"][] | null
          conteudos?: Database["public"]["Enums"]["tipo_conteudo"][] | null
          corretor_id?: string | null
          created_at?: string
          escopo?: Database["public"]["Enums"]["escopo_briefing"]
          geolocacao_id?: string | null
          id?: string
          objetivolead?: Database["public"]["Enums"]["objetivo_lead"][] | null
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
      verificacoes_contato: {
        Row: {
          canal: Database["public"]["Enums"]["canal_contato"]
          codigo_hash: string
          created_at: string
          destino: string
          enviado_em: string
          expira_em: string
          id: string
          status: Database["public"]["Enums"]["status_verificacao"]
          tentativas: number
          user_id: string
          user_tipo: Database["public"]["Enums"]["user_tipo"]
          verificado_em: string | null
        }
        Insert: {
          canal: Database["public"]["Enums"]["canal_contato"]
          codigo_hash: string
          created_at?: string
          destino: string
          enviado_em?: string
          expira_em: string
          id?: string
          status?: Database["public"]["Enums"]["status_verificacao"]
          tentativas?: number
          user_id: string
          user_tipo: Database["public"]["Enums"]["user_tipo"]
          verificado_em?: string | null
        }
        Update: {
          canal?: Database["public"]["Enums"]["canal_contato"]
          codigo_hash?: string
          created_at?: string
          destino?: string
          enviado_em?: string
          expira_em?: string
          id?: string
          status?: Database["public"]["Enums"]["status_verificacao"]
          tentativas?: number
          user_id?: string
          user_tipo?: Database["public"]["Enums"]["user_tipo"]
          verificado_em?: string | null
        }
        Relationships: []
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
      profile_authority_number_type:
        | "VGV_NEGOCIADO"
        | "IMOVEIS_VENDIDOS_ALUGADOS"
        | "CLIENTES_ATENDIDOS"
        | "ANOS_CARREIRA"
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
      fase_negocio: "NEGOCIACAO" | "JURIDICO" | "PERDIDO" | "GANHO"
      fase_empreendimento: "NA_PLANTA" | "EM_CONSTRUCAO" | "ENTREGUE"
      finalidade: "COMPRAR" | "ALUGAR"
      aceita_parceria_status: "SIM" | "NAO" | "SOB_ANALISE"
      endereco_visualizacao_imovel:
        | "END_SEM_COMPLEMENTO"
        | "END_COMPLETO"
        | "END_BAIRRO"
        | "END_SEM_NUMERO"
      genero: "MASCULINO" | "FEMININO" | "NAO_INFORMAR"
      intencao_compra: "MORADIA" | "INVESTIMENTO"
      objetivo_lead: "COMPRAR" | "ALUGAR" | "VENDER"
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
      modalidade_negocio: "VENDA" | "LOCACAO" | "CAPTACAO"
      papel_imobiliaria: "DONO" | "ADMIN" | "CORRETOR"
      papel_parte_negocio: "COMPRADOR" | "VENDEDOR"
      periodicidade: "MENSAL" | "ANUAL"
      prova_social_tipo:
        | "ENTREGA_CHAVES"
        | "ASSINATURA_CONTRATO"
        | "ASSINATURA_ESCRITURA"
        | "DEPOIMENTO"
        | "COMPRA_REALIZADA"
        | "VENDA_REALIZADA"
        | "LOCACAO_REALIZADA"
        | "POS_VENDA"
      ref_localidade_tipo: "UF" | "CIDADE"
      ref_tipo:
        | "IMOVEL"
        | "EMPREENDIMENTO"
        | "PROVA_SOCIAL"
        | "ARTIGO"
        | "CAMPANHA"
        | "TEMPLATE"
        | "OUTRO"
      categoria_atividade:
        | "QUALIFICACAO"
        | "EM_ATENDIMENTO"
        | "NEGOCIACAO"
        | "FECHAMENTO"
        | "POS_VENDA"
        | "OUTROS"
      modelo_atividade:
        | "QUALIFICACAO_PRIMEIRO_CONTATO"
        | "QUALIFICACAO_RECONTATO"
        | "QUALIFICACAO_VALIDAR_PERFIL"
        | "QUALIFICACAO_CONFIRMAR_INTERESSE"
        | "QUALIFICACAO_ENTENDER_URGENCIA"
        | "QUALIFICACAO_ENVIAR_APRESENTACAO"
        | "EM_ATENDIMENTO_FOLLOW_UP"
        | "EM_ATENDIMENTO_ENVIAR_SELECAO"
        | "EM_ATENDIMENTO_AGENDAR_VISITA"
        | "EM_ATENDIMENTO_CONFIRMAR_VISITA"
        | "EM_ATENDIMENTO_VISITA_PRESENCIAL"
        | "EM_ATENDIMENTO_VISITA_VIRTUAL"
        | "EM_ATENDIMENTO_RETORNO_POS_VISITA"
        | "NEGOCIACAO_APRESENTAR_PROPOSTA"
        | "NEGOCIACAO_AVALIAR_PROPOSTA"
        | "NEGOCIACAO_TRABALHAR_CONTRAPROPOSTA"
        | "NEGOCIACAO_ALINHAR_CONDICOES"
        | "NEGOCIACAO_SOLICITAR_DOCUMENTOS"
        | "NEGOCIACAO_CONFIRMAR_SINAL"
        | "FECHAMENTO_ELABORAR_CONTRATO"
        | "FECHAMENTO_ACOMPANHAR_JURIDICO"
        | "FECHAMENTO_ASSINATURA"
        | "FECHAMENTO_APROVACAO_CADASTRAL"
        | "FECHAMENTO_VISTORIA_FINAL"
        | "FECHAMENTO_ENTREGA_CHAVES"
        | "POS_VENDA_AGRADECIMENTO"
        | "POS_VENDA_PEDIR_INDICACAO"
        | "POS_VENDA_RELACIONAMENTO"
        | "POS_VENDA_NOVA_DEMANDA"
        | "OUTROS_ACAO_PERSONALIZADA"
      status_assinatura: "ATIVA" | "PENDENTE" | "ATRASADA" | "CANCELADA"
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
      status_imovel_delete_job: "PENDENTE" | "PROCESSANDO" | "CONCLUIDO" | "ERRO"
      status_lead:
        | "NOVO"
        | "ABERTO"
        | "EM_ATENDIMENTO"
        | "QUALIFICADO"
        | "OPORTUNIDADE"
        | "CLIENTE"
        | "DESQUALIFICADO"
      status_portal_user: "ATIVO" | "SUSPENSO"
      status_prova_social: "RASCUNHO" | "PUBLICADO" | "ARQUIVADO"
      status_proposta:
        | "RASCUNHO"
        | "ENVIADA"
        | "ACEITA"
        | "RECUSADA"
        | "EXPIRADA"
      subfase_juridica_negocio:
        | "DOCUMENTOS_RECEBIDOS"
        | "ANALISE_DOCUMENTAL"
        | "PENDENCIA_DOCUMENTAL"
        | "DOCUMENTACAO_APROVADA"
        | "MINUTA_DE_CONTRATO_ENVIADA"
        | "MINUTA_DE_CONTRATO_APROVADA"
        | "ASSINATURA_AGENDADA"
        | "CONTRATO_ASSINADO"
        | "REGISTRO_EM_CARTORIO"
        | "REGISTRO_CONCLUIDO"
      status_usuario: "ATIVO" | "PENDENTE" | "BLOQUEADO"
      status_verificacao: "PENDENTE" | "VERIFICADO" | "EXPIRADO" | "BLOQUEADO"
      storage_provider: "SUPABASE" | "S3"
      subtipo_imovel:
        | "COBERTURA"
        | "DUPLEX"
        | "TRIPLEX"
        | "GARDEN"
        | "LOFT"
        | "CONJUNTO_COMERCIAL"
        | "ANDAR_INTEIRO"
        | "MEIO_ANDAR"
        | "LOJA_BOX"
        | "COBERTURA_PADRAO"
        | "COBERTURA_DUPLEX"
        | "COBERTURA_TRIPLEX"
        | "SOBRADO"
        | "GEMINADA"
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
        | "SHOPPING"
        | "PONTO_COMERCIAL_LOJA_BOX"
        | "PREDIO_EDIFICIO_INTEIRO"
        | "SELF_STORAGE"
        | "STUDIO"
      tipo_ambiente_imovel: "DORMITORIO" | "COZINHA" | "SALA" | "VARANDA"
      tipo_midia: "IMAGEM" | "VIDEO" | "PDF"
      tipo_negociacao: "VENDA" | "ALUGUEL" | "VENDA_E_ALUGUEL"
      tipo_pessoa_negocio: "FISICA" | "JURIDICA"
      ocupacao_imovel:
        | "PROPRIETARIO_RESIDE_NO_IMOVEL"
        | "IMOVEL_DESOCUPADO"
        | "IMOVEL_COM_INQUILINO"
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
      user_tipo: "PORTAL" | "CORRETOR"
      vaga_cobertura: "COBERTA" | "DESCOBERTA"
      vaga_tamanho: "PEQUENA" | "MEDIA" | "GRANDE"
      vaga_tipo: "PRIVATIVA" | "LIVRE" | "DEMARCADA"
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
      profile_authority_number_type: [
        "VGV_NEGOCIADO",
        "IMOVEIS_VENDIDOS_ALUGADOS",
        "CLIENTES_ATENDIDOS",
        "ANOS_CARREIRA",
      ],
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
      fase_negocio: ["NEGOCIACAO", "JURIDICO", "PERDIDO", "GANHO"],
      fase_empreendimento: ["NA_PLANTA", "EM_CONSTRUCAO", "ENTREGUE"],
      finalidade: ["COMPRAR", "ALUGAR"],
      aceita_parceria_status: ["SIM", "NAO", "SOB_ANALISE"],
      endereco_visualizacao_imovel: [
        "END_SEM_COMPLEMENTO",
        "END_COMPLETO",
        "END_BAIRRO",
        "END_SEM_NUMERO",
      ],
      genero: ["MASCULINO", "FEMININO", "NAO_INFORMAR"],
      intencao_compra: ["MORADIA", "INVESTIMENTO"],
      objetivo_lead: ["COMPRAR", "ALUGAR", "VENDER"],
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
      modalidade_negocio: ["VENDA", "LOCACAO", "CAPTACAO"],
      papel_imobiliaria: ["DONO", "ADMIN", "CORRETOR"],
      papel_parte_negocio: ["COMPRADOR", "VENDEDOR"],
      periodicidade: ["MENSAL", "ANUAL"],
      prova_social_tipo: [
        "ENTREGA_CHAVES",
        "ASSINATURA_CONTRATO",
        "ASSINATURA_ESCRITURA",
        "DEPOIMENTO",
        "COMPRA_REALIZADA",
        "VENDA_REALIZADA",
        "LOCACAO_REALIZADA",
        "POS_VENDA",
      ],
      ref_localidade_tipo: ["UF", "CIDADE"],
      ref_tipo: [
        "IMOVEL",
        "EMPREENDIMENTO",
        "PROVA_SOCIAL",
        "ARTIGO",
        "CAMPANHA",
        "TEMPLATE",
        "OUTRO",
      ],
      categoria_atividade: [
        "QUALIFICACAO",
        "EM_ATENDIMENTO",
        "NEGOCIACAO",
        "FECHAMENTO",
        "POS_VENDA",
        "OUTROS",
      ],
      modelo_atividade: [
        "QUALIFICACAO_PRIMEIRO_CONTATO",
        "QUALIFICACAO_RECONTATO",
        "QUALIFICACAO_VALIDAR_PERFIL",
        "QUALIFICACAO_CONFIRMAR_INTERESSE",
        "QUALIFICACAO_ENTENDER_URGENCIA",
        "QUALIFICACAO_ENVIAR_APRESENTACAO",
        "EM_ATENDIMENTO_FOLLOW_UP",
        "EM_ATENDIMENTO_ENVIAR_SELECAO",
        "EM_ATENDIMENTO_AGENDAR_VISITA",
        "EM_ATENDIMENTO_CONFIRMAR_VISITA",
        "EM_ATENDIMENTO_VISITA_PRESENCIAL",
        "EM_ATENDIMENTO_VISITA_VIRTUAL",
        "EM_ATENDIMENTO_RETORNO_POS_VISITA",
        "NEGOCIACAO_APRESENTAR_PROPOSTA",
        "NEGOCIACAO_AVALIAR_PROPOSTA",
        "NEGOCIACAO_TRABALHAR_CONTRAPROPOSTA",
        "NEGOCIACAO_ALINHAR_CONDICOES",
        "NEGOCIACAO_SOLICITAR_DOCUMENTOS",
        "NEGOCIACAO_CONFIRMAR_SINAL",
        "FECHAMENTO_ELABORAR_CONTRATO",
        "FECHAMENTO_ACOMPANHAR_JURIDICO",
        "FECHAMENTO_ASSINATURA",
        "FECHAMENTO_APROVACAO_CADASTRAL",
        "FECHAMENTO_VISTORIA_FINAL",
        "FECHAMENTO_ENTREGA_CHAVES",
        "POS_VENDA_AGRADECIMENTO",
        "POS_VENDA_PEDIR_INDICACAO",
        "POS_VENDA_RELACIONAMENTO",
        "POS_VENDA_NOVA_DEMANDA",
        "OUTROS_ACAO_PERSONALIZADA",
      ],
      status_assinatura: ["ATIVA", "PENDENTE", "ATRASADA", "CANCELADA"],
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
      status_prova_social: ["RASCUNHO", "PUBLICADO", "ARQUIVADO"],
      status_proposta: [
        "RASCUNHO",
        "ENVIADA",
        "ACEITA",
        "RECUSADA",
        "EXPIRADA",
      ],
      subfase_juridica_negocio: [
        "DOCUMENTOS_RECEBIDOS",
        "ANALISE_DOCUMENTAL",
        "PENDENCIA_DOCUMENTAL",
        "DOCUMENTACAO_APROVADA",
        "MINUTA_DE_CONTRATO_ENVIADA",
        "MINUTA_DE_CONTRATO_APROVADA",
        "ASSINATURA_AGENDADA",
        "CONTRATO_ASSINADO",
        "REGISTRO_EM_CARTORIO",
        "REGISTRO_CONCLUIDO",
      ],
      status_usuario: ["ATIVO", "PENDENTE", "BLOQUEADO"],
      status_verificacao: ["PENDENTE", "VERIFICADO", "EXPIRADO", "BLOQUEADO"],
      storage_provider: ["SUPABASE", "S3"],
      subtipo_imovel: [
        "COBERTURA",
        "DUPLEX",
        "TRIPLEX",
        "GARDEN",
        "LOFT",
        "CONJUNTO_COMERCIAL",
        "ANDAR_INTEIRO",
        "MEIO_ANDAR",
        "LOJA_BOX",
        "COBERTURA_PADRAO",
        "COBERTURA_DUPLEX",
        "COBERTURA_TRIPLEX",
        "SOBRADO",
        "GEMINADA",
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
        "SHOPPING",
        "PONTO_COMERCIAL_LOJA_BOX",
        "PREDIO_EDIFICIO_INTEIRO",
        "SELF_STORAGE",
        "STUDIO",
      ],
      tipo_ambiente_imovel: ["DORMITORIO", "COZINHA", "SALA", "VARANDA"],
      tipo_midia: ["IMAGEM", "VIDEO", "PDF"],
      tipo_negociacao: ["VENDA", "ALUGUEL", "VENDA_E_ALUGUEL"],
      tipo_pessoa_negocio: ["FISICA", "JURIDICA"],
      ocupacao_imovel: [
        "PROPRIETARIO_RESIDE_NO_IMOVEL",
        "IMOVEL_DESOCUPADO",
        "IMOVEL_COM_INQUILINO",
      ],
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
      user_tipo: ["PORTAL", "CORRETOR"],
      vaga_cobertura: ["COBERTA", "DESCOBERTA"],
      vaga_tamanho: ["PEQUENA", "MEDIA", "GRANDE"],
      vaga_tipo: ["PRIVATIVA", "LIVRE", "DEMARCADA"],
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
