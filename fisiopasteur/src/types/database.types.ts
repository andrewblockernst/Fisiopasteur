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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      box: {
        Row: {
          created_at: string | null
          estado: string
          id_box: number
          numero: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          estado: string
          id_box?: number
          numero: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          estado?: string
          id_box?: number
          numero?: number
          updated_at?: string | null
        }
        Relationships: [
        ]
      }
      especialidad: {
        Row: {
          id_especialidad: number
          nombre: string
        }
        Insert: {
          id_especialidad?: number
          nombre: string
        }
        Update: {
          id_especialidad?: number
          nombre?: string
        }
        Relationships: [
        ]
      }
      evaluacion_inicial: {
        Row: {
          antecedentes_familiares: boolean | null
          antecedentes_familiares_quien: string | null
          artritis: boolean | null
          cirugias: string | null
          created_at: string | null
          dbt: boolean | null
          deporte_cual: string | null
          diagnostico_eco: boolean | null
          diagnostico_observaciones: string | null
          diagnostico_rm: boolean | null
          diagnostico_rx: boolean | null
          diagnostico_tac: boolean | null
          diagrama_dolor: Json | null
          diu: boolean | null
          embarazada: boolean | null
          fracturas: string | null
          fuma: boolean | null
          id_evaluacion: string
          id_grupo: string
          medico_actual: string | null
          menopausia: boolean | null
          momento_mas_dolor: string | null
          numero_afiliado: string | null
          objetivos_tratamiento: string | null
          obra_social: string | null
          otras_afecciones: string | null
          realiza_deportes: boolean | null
          ta: string | null
          tiempo_con_dolor: string | null
          toma_alcohol: boolean | null
          toma_medicamentos: string | null
          trabajo_actual: string | null
          trabajo_anterior: boolean | null
          trabajo_anterior_cual: string | null
          tratamiento_fk_anterior: boolean | null
          traumatismo: boolean | null
          traumatismo_descripcion: string | null
          updated_at: string | null
        }
        Insert: {
          antecedentes_familiares?: boolean | null
          antecedentes_familiares_quien?: string | null
          artritis?: boolean | null
          cirugias?: string | null
          created_at?: string | null
          dbt?: boolean | null
          deporte_cual?: string | null
          diagnostico_eco?: boolean | null
          diagnostico_observaciones?: string | null
          diagnostico_rm?: boolean | null
          diagnostico_rx?: boolean | null
          diagnostico_tac?: boolean | null
          diagrama_dolor?: Json | null
          diu?: boolean | null
          embarazada?: boolean | null
          fracturas?: string | null
          fuma?: boolean | null
          id_evaluacion?: string
          id_grupo: string
          medico_actual?: string | null
          menopausia?: boolean | null
          momento_mas_dolor?: string | null
          numero_afiliado?: string | null
          objetivos_tratamiento?: string | null
          obra_social?: string | null
          otras_afecciones?: string | null
          realiza_deportes?: boolean | null
          ta?: string | null
          tiempo_con_dolor?: string | null
          toma_alcohol?: boolean | null
          toma_medicamentos?: string | null
          trabajo_actual?: string | null
          trabajo_anterior?: boolean | null
          trabajo_anterior_cual?: string | null
          tratamiento_fk_anterior?: boolean | null
          traumatismo?: boolean | null
          traumatismo_descripcion?: string | null
          updated_at?: string | null
        }
        Update: {
          antecedentes_familiares?: boolean | null
          antecedentes_familiares_quien?: string | null
          artritis?: boolean | null
          cirugias?: string | null
          created_at?: string | null
          dbt?: boolean | null
          deporte_cual?: string | null
          diagnostico_eco?: boolean | null
          diagnostico_observaciones?: string | null
          diagnostico_rm?: boolean | null
          diagnostico_rx?: boolean | null
          diagnostico_tac?: boolean | null
          diagrama_dolor?: Json | null
          diu?: boolean | null
          embarazada?: boolean | null
          fracturas?: string | null
          fuma?: boolean | null
          id_evaluacion?: string
          id_grupo?: string
          medico_actual?: string | null
          menopausia?: boolean | null
          momento_mas_dolor?: string | null
          numero_afiliado?: string | null
          objetivos_tratamiento?: string | null
          obra_social?: string | null
          otras_afecciones?: string | null
          realiza_deportes?: boolean | null
          ta?: string | null
          tiempo_con_dolor?: string | null
          toma_alcohol?: boolean | null
          toma_medicamentos?: string | null
          trabajo_actual?: string | null
          trabajo_anterior?: boolean | null
          trabajo_anterior_cual?: string | null
          tratamiento_fk_anterior?: boolean | null
          traumatismo?: boolean | null
          traumatismo_descripcion?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluacion_inicial_id_grupo_fkey"
            columns: ["id_grupo"]
            isOneToOne: false
            referencedRelation: "grupo_tratamiento"
            referencedColumns: ["id_grupo"]
          },
        ]
      }
      evolucion_clinica: {
        Row: {
          created_at: string | null
          id_evolucion: number
          id_turno: number | null
          observaciones: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id_evolucion?: number
          id_turno?: number | null
          observaciones?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id_evolucion?: number
          id_turno?: number | null
          observaciones?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evolucion_clinica_id_turno_fkey"
            columns: ["id_turno"]
            isOneToOne: false
            referencedRelation: "turno"
            referencedColumns: ["id_turno"]
          },
        ]
      }
      grupo_tratamiento: {
        Row: {
          created_at: string | null
          fecha_inicio: string
          id_especialidad: number | null
          id_especialista: string
          id_grupo: string
          id_paciente: number
          nombre: string
          tipo_plan: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fecha_inicio: string
          id_especialidad?: number | null
          id_especialista: string
          id_grupo?: string
          id_paciente: number
          nombre: string
          tipo_plan: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fecha_inicio?: string
          id_especialidad?: number | null
          id_especialista?: string
          id_grupo?: string
          id_paciente?: number
          nombre?: string
          tipo_plan?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grupo_tratamiento_id_especialidad_fkey"
            columns: ["id_especialidad"]
            isOneToOne: false
            referencedRelation: "especialidad"
            referencedColumns: ["id_especialidad"]
          },
          {
            foreignKeyName: "grupo_tratamiento_id_especialista_fkey"
            columns: ["id_especialista"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "grupo_tratamiento_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "paciente"
            referencedColumns: ["id_paciente"]
          },
        ]
      }
      notificacion: {
        Row: {
          estado: string | null
          fecha_envio: string | null
          fecha_programada: string | null
          id_notificacion: number
          id_turno: number | null
          medio: string
          mensaje: string
          telefono: string | null
        }
        Insert: {
          estado?: string | null
          fecha_envio?: string | null
          fecha_programada?: string | null
          id_notificacion?: number
          id_turno?: number | null
          medio: string
          mensaje: string
          telefono?: string | null
        }
        Update: {
          estado?: string | null
          fecha_envio?: string | null
          fecha_programada?: string | null
          id_notificacion?: number
          id_turno?: number | null
          medio?: string
          mensaje?: string
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacion_id_turno_fkey"
            columns: ["id_turno"]
            isOneToOne: false
            referencedRelation: "turno"
            referencedColumns: ["id_turno"]
          },
        ]
      }
      paciente: {
        Row: {
          activo: boolean
          apellido: string
          created_at: string | null
          direccion: string | null
          dni: string | null
          edad: number | null
          email: string | null
          fecha_nacimiento: string | null
          historia_clinica: string | null
          id_paciente: number
          nombre: string
          telefono: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean
          apellido: string
          created_at?: string | null
          direccion?: string | null
          dni?: string | null
          edad?: number | null
          email?: string | null
          fecha_nacimiento?: string | null
          historia_clinica?: string | null
          id_paciente?: number
          nombre: string
          telefono: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean
          apellido?: string
          created_at?: string | null
          direccion?: string | null
          dni?: string | null
          edad?: number | null
          email?: string | null
          fecha_nacimiento?: string | null
          historia_clinica?: string | null
          id_paciente?: number
          nombre?: string
          telefono?: string
          updated_at?: string | null
        }
        Relationships: [
        ]
      }
      rol: {
        Row: {
          id: number
          jerarquia: number
          nombre: string
        }
        Insert: {
          id: number
          jerarquia: number
          nombre: string
        }
        Update: {
          id?: number
          jerarquia?: number
          nombre?: string
        }
        Relationships: []
      }
      turno: {
        Row: {
          created_at: string | null
          dificultad: string | null
          estado: string | null
          evolucion_clinica: string | null
          evolucion_completada_en: string | null
          fecha: string
          hora: string
          id_box: number | null
          id_especialidad: number | null
          id_especialista: string | null
          id_grupo_tratamiento: string | null
          id_paciente: number | null
          id_turno: number
          notas: string | null
          observaciones: string | null
          precio: number | null
          tipo_plan: string | null
          titulo_tratamiento: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dificultad?: string | null
          estado?: string | null
          evolucion_clinica?: string | null
          evolucion_completada_en?: string | null
          fecha: string
          hora: string
          id_box?: number | null
          id_especialidad?: number | null
          id_especialista?: string | null
          id_grupo_tratamiento?: string | null
          id_paciente?: number | null
          id_turno?: number
          notas?: string | null
          observaciones?: string | null
          precio?: number | null
          tipo_plan?: string | null
          titulo_tratamiento?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dificultad?: string | null
          estado?: string | null
          evolucion_clinica?: string | null
          evolucion_completada_en?: string | null
          fecha?: string
          hora?: string
          id_box?: number | null
          id_especialidad?: number | null
          id_especialista?: string | null
          id_grupo_tratamiento?: string | null
          id_paciente?: number | null
          id_turno?: number
          notas?: string | null
          observaciones?: string | null
          precio?: number | null
          tipo_plan?: string | null
          titulo_tratamiento?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_turno_especialidad"
            columns: ["id_especialidad"]
            isOneToOne: false
            referencedRelation: "especialidad"
            referencedColumns: ["id_especialidad"]
          },
          {
            foreignKeyName: "turno_id_box_fkey"
            columns: ["id_box"]
            isOneToOne: false
            referencedRelation: "box"
            referencedColumns: ["id_box"]
          },
          {
            foreignKeyName: "turno_id_especialista_fkey"
            columns: ["id_especialista"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
          },
          {
            foreignKeyName: "turno_id_paciente_fkey"
            columns: ["id_paciente"]
            isOneToOne: false
            referencedRelation: "paciente"
            referencedColumns: ["id_paciente"]
          },
        ]
      }
      usuario: {
        Row: {
          activo: boolean | null
          apellido: string
          color: string | null
          contraseña: string
          created_at: string | null
          email: string
          id_especialidad: number | null
          id_rol: number | null
          id_usuario: string
          nombre: string
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          apellido: string
          color?: string | null
          contraseña: string
          created_at?: string | null
          email: string
          id_especialidad?: number | null
          id_rol?: number | null
          id_usuario?: string
          nombre: string
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          apellido?: string
          color?: string | null
          contraseña?: string
          created_at?: string | null
          email?: string
          id_especialidad?: number | null
          id_rol?: number | null
          id_usuario?: string
          nombre?: string
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuario_id_especialidad_fkey"
            columns: ["id_especialidad"]
            isOneToOne: false
            referencedRelation: "especialidad"
            referencedColumns: ["id_especialidad"]
          },
          {
            foreignKeyName: "usuario_id_rol_fkey"
            columns: ["id_rol"]
            isOneToOne: false
            referencedRelation: "rol"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_especialidad: {
        Row: {
          activo: boolean | null
          fecha_asignacion: string | null
          id_especialidad: number
          id_usuario: string
          id_usuario_especialidad: number
          precio_obra_social: number | null
          precio_particular: number | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          fecha_asignacion?: string | null
          id_especialidad: number
          id_usuario: string
          id_usuario_especialidad?: number
          precio_obra_social?: number | null
          precio_particular?: number | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          fecha_asignacion?: string | null
          id_especialidad?: number
          id_usuario?: string
          id_usuario_especialidad?: number
          precio_obra_social?: number | null
          precio_particular?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuario_especialidad_id_especialidad_fkey"
            columns: ["id_especialidad"]
            isOneToOne: false
            referencedRelation: "especialidad"
            referencedColumns: ["id_especialidad"]
          },
          {
            foreignKeyName: "usuario_especialidad_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id_usuario"]
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
      [_ in never]: never
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
    Enums: {},
  },
} as const