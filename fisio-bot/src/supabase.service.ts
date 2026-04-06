import { createClient } from '@supabase/supabase-js'
import { nowIso } from './dayjs'

// Configuración de Supabase
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Variables de entorno SUPABASE_URL y SUPABASE_ANON_KEY son requeridas')
  process.exit(1)
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
console.log('🔌 Cliente Supabase inicializado en el bot')

// Tipos para las notificaciones
export interface NotificacionPendiente {
  id_notificacion: number
  id_turno: number | null
  medio: string
  mensaje: string | null
  telefono: string | null
  estado: string
  fecha_programada: string
  turno?: {
    id_turno: number
    fecha: string
    hora: string
    estado: string
    paciente: {
      nombre: string
      apellido: string
      telefono: string
    }
    especialista: {
      nombre: string
      apellido: string
    }
    especialidad: {
      nombre: string
    }
  }
}

/**
 * Obtener notificaciones pendientes de Supabase
 * ✅ MULTI-ORG: Ahora procesa notificaciones de TODAS las organizaciones
 */
export async function obtenerNotificacionesPendientes(): Promise<NotificacionPendiente[]> {
  try {
    const ahora = nowIso()
    
    console.log('🔍 Consultando notificaciones pendientes hasta:', ahora)
    
    const { data, error } = await supabase
      .from('notificacion')
      .select(`
        *,
        turno:id_turno(
          *,
          paciente:id_paciente(nombre, apellido, telefono),
          especialista:id_especialista(nombre, apellido),
          especialidad:id_especialidad(nombre)
        )
      `)
      .eq('estado', 'pendiente')
      .lte('fecha_programada', ahora)
      .order('fecha_programada', { ascending: true })

    if (error) {
      console.error('❌ Error obteniendo notificaciones de Supabase:', error)
      console.error('Detalles del error:', JSON.stringify(error, null, 2))
      return []
    }

    console.log(`✅ Encontradas ${data?.length || 0} notificaciones pendientes`)
    if (data && data.length > 0) {
      console.log('📋 Notificaciones:', data.map(n => ({
        id: n.id_notificacion,
        turno: n.id_turno,
        fecha_programada: n.fecha_programada
      })))
    }

    return data || []
  } catch (error) {
    console.error('❌ Error inesperado consultando Supabase:', error)
    return []
  }
}

/**
 * Marcar notificación como enviada
 */
export async function marcarNotificacionEnviada(idNotificacion: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notificacion')
      .update({ 
        estado: 'enviado',
        fecha_envio: nowIso()
      })
      .eq('id_notificacion', idNotificacion)

    if (error) {
      console.error('❌ Error marcando notificación como enviada:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('❌ Error inesperado actualizando notificación:', error)
    return false
  }
}

/**
 * Marcar notificación como fallida
 */
export async function marcarNotificacionFallida(idNotificacion: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notificacion')
      .update({ estado: 'fallido' })
      .eq('id_notificacion', idNotificacion)

    if (error) {
      console.error('❌ Error marcando notificación como fallida:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('❌ Error inesperado actualizando notificación:', error)
    return false
  }
}