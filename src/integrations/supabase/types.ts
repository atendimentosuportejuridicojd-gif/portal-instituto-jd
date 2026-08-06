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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          acao: string
          created_at: string
          entidade: string | null
          entidade_id: string | null
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      assinaturas: {
        Row: {
          cancelada_em: string | null
          created_at: string
          fim: string | null
          hotmart_subscriber_code: string | null
          hotmart_transaction_id: string | null
          id: string
          inicio: string
          plano: string | null
          produto: string | null
          status: string
          ultima_renovacao_em: string | null
          ultimo_evento: string | null
          ultimo_evento_em: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelada_em?: string | null
          created_at?: string
          fim?: string | null
          hotmart_subscriber_code?: string | null
          hotmart_transaction_id?: string | null
          id?: string
          inicio?: string
          plano?: string | null
          produto?: string | null
          status?: string
          ultima_renovacao_em?: string | null
          ultimo_evento?: string | null
          ultimo_evento_em?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelada_em?: string | null
          created_at?: string
          fim?: string | null
          hotmart_subscriber_code?: string | null
          hotmart_transaction_id?: string | null
          id?: string
          inicio?: string
          plano?: string | null
          produto?: string | null
          status?: string
          ultima_renovacao_em?: string | null
          ultimo_evento?: string | null
          ultimo_evento_em?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      concurso_materiais: {
        Row: {
          concurso_id: string
          exclusivo: boolean
          material_id: string
          ordem: number
        }
        Insert: {
          concurso_id: string
          exclusivo?: boolean
          material_id: string
          ordem?: number
        }
        Update: {
          concurso_id?: string
          exclusivo?: boolean
          material_id?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "concurso_materiais_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "concursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "concurso_materiais_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      concursos: {
        Row: {
          ano: number | null
          banca: string | null
          created_at: string
          data_prova: string | null
          descricao: string | null
          edital_url: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          orgao: string | null
          publicado: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          ano?: number | null
          banca?: string | null
          created_at?: string
          data_prova?: string | null
          descricao?: string | null
          edital_url?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          orgao?: string | null
          publicado?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          ano?: number | null
          banca?: string | null
          created_at?: string
          data_prova?: string | null
          descricao?: string | null
          edital_url?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          orgao?: string | null
          publicado?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      configuracoes_plataforma: {
        Row: {
          email_contato: string | null
          facebook_url: string | null
          favicon_url: string | null
          hotmart_regularizacao_url: string | null
          id: boolean
          instagram_url: string | null
          linkedin_url: string | null
          logo_url: string | null
          nome_curto: string
          nome_plataforma: string
          sobre: string | null
          telefone: string | null
          texto_rodape: string | null
          updated_at: string
          updated_by: string | null
          whatsapp: string | null
          youtube_url: string | null
        }
        Insert: {
          email_contato?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          hotmart_regularizacao_url?: string | null
          id?: boolean
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          nome_curto?: string
          nome_plataforma?: string
          sobre?: string | null
          telefone?: string | null
          texto_rodape?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
          youtube_url?: string | null
        }
        Update: {
          email_contato?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          hotmart_regularizacao_url?: string | null
          id?: boolean
          instagram_url?: string | null
          linkedin_url?: string | null
          logo_url?: string | null
          nome_curto?: string
          nome_plataforma?: string
          sobre?: string | null
          telefone?: string | null
          texto_rodape?: string | null
          updated_at?: string
          updated_by?: string | null
          whatsapp?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      cronograma_itens: {
        Row: {
          created_at: string
          cronograma_id: string
          dia: number
          id: string
          material_id: string | null
          observacoes: string | null
          ordem: number
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cronograma_id: string
          dia?: number
          id?: string
          material_id?: string | null
          observacoes?: string | null
          ordem?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cronograma_id?: string
          dia?: number
          id?: string
          material_id?: string | null
          observacoes?: string | null
          ordem?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronograma_itens_cronograma_id_fkey"
            columns: ["cronograma_id"]
            isOneToOne: false
            referencedRelation: "cronogramas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronograma_itens_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      cronogramas: {
        Row: {
          concurso_id: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          publicado: boolean
          trilha_id: string | null
          updated_at: string
        }
        Insert: {
          concurso_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          publicado?: boolean
          trilha_id?: string | null
          updated_at?: string
        }
        Update: {
          concurso_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          publicado?: boolean
          trilha_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronogramas_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "concursos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronogramas_trilha_id_fkey"
            columns: ["trilha_id"]
            isOneToOne: false
            referencedRelation: "trilhas"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinas: {
        Row: {
          concurso_id: string | null
          created_at: string
          descricao: string | null
          especifica: boolean
          id: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
        }
        Insert: {
          concurso_id?: string | null
          created_at?: string
          descricao?: string | null
          especifica?: boolean
          id?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
        }
        Update: {
          concurso_id?: string | null
          created_at?: string
          descricao?: string | null
          especifica?: boolean
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinas_concurso_id_fkey"
            columns: ["concurso_id"]
            isOneToOne: false
            referencedRelation: "concursos"
            referencedColumns: ["id"]
          },
        ]
      }
      favoritos: {
        Row: {
          created_at: string
          id: string
          item_id: string
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          tipo?: string
          user_id?: string
        }
        Relationships: []
      }
      materiais: {
        Row: {
          arquivo_url: string | null
          atualizado_em: string | null
          created_at: string
          descricao: string | null
          disciplina_id: string | null
          download_permitido: boolean
          id: string
          modulo_id: string | null
          ordem: number
          paginas: number | null
          publicado: boolean
          publicado_em: string
          storage_path: string | null
          tags: string[] | null
          tamanho_bytes: number | null
          titulo: string
          updated_at: string
          versao: number
        }
        Insert: {
          arquivo_url?: string | null
          atualizado_em?: string | null
          created_at?: string
          descricao?: string | null
          disciplina_id?: string | null
          download_permitido?: boolean
          id?: string
          modulo_id?: string | null
          ordem?: number
          paginas?: number | null
          publicado?: boolean
          publicado_em?: string
          storage_path?: string | null
          tags?: string[] | null
          tamanho_bytes?: number | null
          titulo: string
          updated_at?: string
          versao?: number
        }
        Update: {
          arquivo_url?: string | null
          atualizado_em?: string | null
          created_at?: string
          descricao?: string | null
          disciplina_id?: string | null
          download_permitido?: boolean
          id?: string
          modulo_id?: string | null
          ordem?: number
          paginas?: number | null
          publicado?: boolean
          publicado_em?: string
          storage_path?: string | null
          tags?: string[] | null
          tamanho_bytes?: number | null
          titulo?: string
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "materiais_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materiais_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      material_leitura: {
        Row: {
          concluido: boolean
          concluido_em: string | null
          created_at: string
          id: string
          material_id: string
          ultima_pagina: number
          updated_at: string
          user_id: string
          versao_vista: number
        }
        Insert: {
          concluido?: boolean
          concluido_em?: string | null
          created_at?: string
          id?: string
          material_id: string
          ultima_pagina?: number
          updated_at?: string
          user_id: string
          versao_vista?: number
        }
        Update: {
          concluido?: boolean
          concluido_em?: string | null
          created_at?: string
          id?: string
          material_id?: string
          ultima_pagina?: number
          updated_at?: string
          user_id?: string
          versao_vista?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_leitura_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      material_versoes: {
        Row: {
          arquivo_url: string | null
          created_at: string
          created_by: string | null
          id: string
          material_id: string
          notas: string | null
          storage_path: string | null
          versao: number
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          material_id: string
          notas?: string | null
          storage_path?: string | null
          versao: number
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          material_id?: string
          notas?: string | null
          storage_path?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_versoes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          created_at: string
          descricao: string | null
          disciplina_id: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          disciplina_id: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          disciplina_id?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modulos_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
        ]
      }
      noticias: {
        Row: {
          conteudo: string | null
          created_at: string
          fixado: boolean
          id: string
          imagem_url: string | null
          publicado: boolean
          published_at: string
          resumo: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          conteudo?: string | null
          created_at?: string
          fixado?: boolean
          id?: string
          imagem_url?: string | null
          publicado?: boolean
          published_at?: string
          resumo?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          conteudo?: string | null
          created_at?: string
          fixado?: boolean
          id?: string
          imagem_url?: string | null
          publicado?: boolean
          published_at?: string
          resumo?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string
          created_by: string | null
          escopo: string
          id: string
          link: string | null
          mensagem: string
          publicada_em: string
          target_user_id: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          escopo?: string
          id?: string
          link?: string | null
          mensagem?: string
          publicada_em?: string
          target_user_id?: string | null
          tipo?: string
          titulo: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          escopo?: string
          id?: string
          link?: string | null
          mensagem?: string
          publicada_em?: string
          target_user_id?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      notificacoes_leituras: {
        Row: {
          lida_em: string
          notificacao_id: string
          user_id: string
        }
        Insert: {
          lida_em?: string
          notificacao_id: string
          user_id: string
        }
        Update: {
          lida_em?: string
          notificacao_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_leituras_notificacao_id_fkey"
            columns: ["notificacao_id"]
            isOneToOne: false
            referencedRelation: "notificacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_estudo_itens: {
        Row: {
          concluido: boolean
          created_at: string
          data: string
          id: string
          material_id: string | null
          observacoes: string | null
          ordem: number
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          concluido?: boolean
          created_at?: string
          data: string
          id?: string
          material_id?: string | null
          observacoes?: string | null
          ordem?: number
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          concluido?: boolean
          created_at?: string
          data?: string
          id?: string
          material_id?: string | null
          observacoes?: string | null
          ordem?: number
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_estudo_itens_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bloqueado: boolean
          bloqueado_motivo: string | null
          created_at: string
          email: string
          id: string
          nome_completo: string
          ultimo_acesso_em: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bloqueado?: boolean
          bloqueado_motivo?: string | null
          created_at?: string
          email?: string
          id: string
          nome_completo?: string
          ultimo_acesso_em?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bloqueado?: boolean
          bloqueado_motivo?: string | null
          created_at?: string
          email?: string
          id?: string
          nome_completo?: string
          ultimo_acesso_em?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      questao_alternativas: {
        Row: {
          correta: boolean
          id: string
          letra: string
          ordem: number
          questao_id: string
          texto: string
        }
        Insert: {
          correta?: boolean
          id?: string
          letra: string
          ordem?: number
          questao_id: string
          texto: string
        }
        Update: {
          correta?: boolean
          id?: string
          letra?: string
          ordem?: number
          questao_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "questao_alternativas_questao_id_fkey"
            columns: ["questao_id"]
            isOneToOne: false
            referencedRelation: "questoes"
            referencedColumns: ["id"]
          },
        ]
      }
      questao_sessoes: {
        Row: {
          acertos: number
          concluida_em: string | null
          created_at: string
          erros: number
          id: string
          iniciada_em: string
          material_id: string
          percentual: number
          status: string
          total_questoes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          acertos?: number
          concluida_em?: string | null
          created_at?: string
          erros?: number
          id?: string
          iniciada_em?: string
          material_id: string
          percentual?: number
          status?: string
          total_questoes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          acertos?: number
          concluida_em?: string | null
          created_at?: string
          erros?: number
          id?: string
          iniciada_em?: string
          material_id?: string
          percentual?: number
          status?: string
          total_questoes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questao_sessoes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      questao_tentativas: {
        Row: {
          acertou: boolean
          alternativa_id: string | null
          created_at: string
          id: string
          questao_id: string
          sessao_id: string | null
          user_id: string
        }
        Insert: {
          acertou: boolean
          alternativa_id?: string | null
          created_at?: string
          id?: string
          questao_id: string
          sessao_id?: string | null
          user_id: string
        }
        Update: {
          acertou?: boolean
          alternativa_id?: string | null
          created_at?: string
          id?: string
          questao_id?: string
          sessao_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questao_tentativas_alternativa_id_fkey"
            columns: ["alternativa_id"]
            isOneToOne: false
            referencedRelation: "questao_alternativas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questao_tentativas_questao_id_fkey"
            columns: ["questao_id"]
            isOneToOne: false
            referencedRelation: "questoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questao_tentativas_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "questao_sessoes"
            referencedColumns: ["id"]
          },
        ]
      }
      questoes: {
        Row: {
          ano: number | null
          banca: string | null
          comentario_professor: string | null
          created_at: string
          disciplina_id: string | null
          enunciado: string
          id: string
          material_id: string | null
          nivel: string | null
          ordem: number
          orgao: string | null
          publicado: boolean
          referencia: string | null
          updated_at: string
        }
        Insert: {
          ano?: number | null
          banca?: string | null
          comentario_professor?: string | null
          created_at?: string
          disciplina_id?: string | null
          enunciado: string
          id?: string
          material_id?: string | null
          nivel?: string | null
          ordem?: number
          orgao?: string | null
          publicado?: boolean
          referencia?: string | null
          updated_at?: string
        }
        Update: {
          ano?: number | null
          banca?: string | null
          comentario_professor?: string | null
          created_at?: string
          disciplina_id?: string | null
          enunciado?: string
          id?: string
          material_id?: string | null
          nivel?: string | null
          ordem?: number
          orgao?: string | null
          publicado?: boolean
          referencia?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questoes_disciplina_id_fkey"
            columns: ["disciplina_id"]
            isOneToOne: false
            referencedRelation: "disciplinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questoes_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      trilha_materiais: {
        Row: {
          material_id: string
          ordem: number
          trilha_id: string
        }
        Insert: {
          material_id: string
          ordem?: number
          trilha_id: string
        }
        Update: {
          material_id?: string
          ordem?: number
          trilha_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trilha_materiais_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trilha_materiais_trilha_id_fkey"
            columns: ["trilha_id"]
            isOneToOne: false
            referencedRelation: "trilhas"
            referencedColumns: ["id"]
          },
        ]
      }
      trilhas: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_desempenho_material: {
        Args: { _material_id: string; _user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assinatura_ativa: { Args: { _user_id: string }; Returns: boolean }
      registrar_ultimo_acesso: { Args: never; Returns: undefined }
      tem_acesso_conteudo: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "administrador" | "aluno" | "aluno_teste"
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
      app_role: ["administrador", "aluno", "aluno_teste"],
    },
  },
} as const
