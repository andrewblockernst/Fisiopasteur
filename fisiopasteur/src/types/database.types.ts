export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      box: {
        Row: {
          estado: string
          id_box: number
          numero: number
        }
        Insert: {
          estado: string
          id_box?: number
          numero: number
        }
        Update: {
          estado?: string
          id_box?: number
          numero?: number
        }
        Relationships: []
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
        Relationships: []
      }
      evolucion_clinica: {
        Row: {
          id_evolucion: number
          id_turno: number | null
          observaciones: string | null
        }
        Insert: {
          id_evolucion?: number
          id_turno?: number | null
          observaciones?: string | null
        }
        Update: {
          id_evolucion?: number
          id_turno?: number | null
          observaciones?: string | null
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
      notificacion: {
        Row: {
          estado: string | null
          fecha_envio: string | null
          id_notificacion: number
          id_turno: number | null
          medio: string
          mensaje: string
        }
        Insert: {
          estado?: string | null
          fecha_envio?: string | null
          id_notificacion?: number
          id_turno?: number | null
          medio: string
          mensaje: string
        }
        Update: {
          estado?: string | null
          fecha_envio?: string | null
          id_notificacion?: number
          id_turno?: number | null
          medio?: string
          mensaje?: string
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
          apellido: string
          direccion: string | null
          dni: string
          edad: number | null
          email: string | null
          estado: string | null
          fecha_nacimiento: string | null
          historia_clinica: string | null
          id_paciente: number
          nombre: string
          telefono: string | null
        }
        Insert: {
          apellido: string
          direccion?: string | null
          dni: string
          edad?: number | null
          email?: string | null
          estado?: string | null
          fecha_nacimiento?: string | null
          historia_clinica?: string | null
          id_paciente?: number
          nombre: string
          telefono?: string | null
        }
        Update: {
          apellido?: string
          direccion?: string | null
          dni?: string
          edad?: number | null
          email?: string | null
          estado?: string | null
          fecha_nacimiento?: string | null
          historia_clinica?: string | null
          id_paciente?: number
          nombre?: string
          telefono?: string | null
        }
        Relationships: []
      }
      turno: {
        Row: {
          estado: string | null
          fecha: string
          hora: string
          id_box: number | null
          id_especialista: string | null
          id_paciente: number | null
          id_turno: number
          precio: number | null
        }
        Insert: {
          estado?: string | null
          fecha: string
          hora: string
          id_box?: number | null
          id_especialista?: string | null
          id_paciente?: number | null
          id_turno?: number
          precio?: number | null
        }
        Update: {
          estado?: string | null
          fecha?: string
          hora?: string
          id_box?: number | null
          id_especialista?: string | null
          id_paciente?: number | null
          id_turno?: number
          precio?: number | null
        }
        Relationships: [
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
          apellido: string
          color: string | null
          contraseña: string
          email: string
          id_especialidad: number | null
          id_usuario: string
          nombre: string
          rol: string
          telefono: string | null
          usuario: string
        }
        Insert: {
          apellido: string
          color?: string | null
          contraseña: string
          email: string
          id_especialidad?: number | null
          id_usuario?: string
          nombre: string
          rol: string
          telefono?: string | null
          usuario: string
        }
        Update: {
          apellido?: string
          color?: string | null
          contraseña?: string
          email?: string
          id_especialidad?: number | null
          id_usuario?: string
          nombre?: string
          rol?: string
          telefono?: string | null
          usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_id_especialidad_fkey"
            columns: ["id_especialidad"]
            isOneToOne: false
            referencedRelation: "especialidad"
            referencedColumns: ["id_especialidad"]
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
