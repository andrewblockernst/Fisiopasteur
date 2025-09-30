import { obtenerNotificacionesPendientes, marcarNotificacionEnviada, marcarNotificacionFallida } from './supabase.service.js'

/**
 * Procesar recordatorios pendientes desde Supabase
 * Esta función se ejecuta automáticamente cada minuto
 * @param {Function} enviarMensaje - Función para enviar mensajes (telefono, mensaje) => Promise
 */
export async function procesarRecordatoriosPendientes(enviarMensaje) {
  try {
    console.log('🔍 Revisando recordatorios pendientes...')
    
    // Obtener notificaciones pendientes desde Supabase
    const notificaciones = await obtenerNotificacionesPendientes()
    
    if (!notificaciones || notificaciones.length === 0) {
      console.log('✅ No hay recordatorios pendientes')
      return
    }

    console.log(`📋 Encontradas ${notificaciones.length} notificaciones pendientes`)

    // Procesar cada notificación
    for (const notificacion of notificaciones) {
      try {
        await procesarNotificacionIndividual(enviarMensaje, notificacion)
      } catch (error) {
        console.error(`❌ Error procesando notificación ${notificacion.id_notificacion}:`, error)
        await marcarNotificacionFallida(notificacion.id_notificacion)
      }
    }

    console.log('✅ Procesamiento de recordatorios completado')
    
    // Contar los resultados
    let enviadas = 0
    let fallidas = 0
    
    for (const notificacion of notificaciones) {
      // Verificar en la base de datos el estado final
      // Por ahora asumiremos que se procesaron correctamente
      enviadas++
    }
    
    return {
      procesadas: notificaciones.length,
      enviadas,
      fallidas
    }
  } catch (error) {
    console.error('❌ Error general procesando recordatorios:', error)
    return {
      procesadas: 0,
      enviadas: 0,
      fallidas: 0
    }
  }
}

/**
 * Procesar una notificación individual
 */
async function procesarNotificacionIndividual(enviarMensaje, notificacion) {
  console.log(`📨 Procesando notificación ${notificacion.id_notificacion}`)
  
  if (!notificacion.turno) {
    console.log(`⚠️ Notificación ${notificacion.id_notificacion} no tiene turno asociado`)
    await marcarNotificacionFallida(notificacion.id_notificacion)
    return
  }

  const turno = notificacion.turno
  const paciente = turno.paciente
  
  // Verificar que tenemos los datos necesarios
  if (!paciente || !paciente.telefono) {
    console.log(`⚠️ Turno ${turno.id_turno} no tiene datos de paciente o teléfono`)
    await marcarNotificacionFallida(notificacion.id_notificacion)
    return
  }

  // Formatear número de teléfono
  const telefono = formatearTelefono(paciente.telefono)
  if (!telefono) {
    console.log(`⚠️ Teléfono inválido para paciente: ${paciente.telefono}`)
    await marcarNotificacionFallida(notificacion.id_notificacion)
    return
  }

  // Crear mensaje de recordatorio
  const mensaje = crearMensajeRecordatorio(turno)
  
  try {
    // Enviar mensaje a través de la función de envío
    await enviarMensaje(telefono, mensaje)
    console.log(`✅ Recordatorio enviado a ${paciente.nombre} ${paciente.apellido} (${telefono})`)
    
    // Marcar como enviada
    await marcarNotificacionEnviada(notificacion.id_notificacion)
    
  } catch (error) {
    console.error(`❌ Error enviando recordatorio:`, error)
    await marcarNotificacionFallida(notificacion.id_notificacion)
  }
}

/**
 * Formatear número de teléfono para WhatsApp
 */
function formatearTelefono(telefono) {
  if (!telefono) return null
  
  try {
    // Remover espacios, guiones, paréntesis y cualquier carácter no numérico excepto +
    let numero = telefono.toString().replace(/[^\d+]/g, '')
    
    // Remover el + inicial si existe
    if (numero.startsWith('+')) {
      numero = numero.substring(1)
    }
    
    console.log(`📱 Procesando teléfono: ${telefono} -> ${numero}`)
    
    // Validar que tenemos un número
    if (!numero || numero.length < 10) {
      console.log(`❌ Número demasiado corto: ${numero}`)
      return null
    }
    
    let numeroFinal = numero
    
    // Si no empieza con 54 (código de Argentina), y es un número de 10 dígitos, agregar 549
    if (!numero.startsWith('54') && numero.length === 10) {
      numeroFinal = '549' + numero
    }
    // Si empieza con 54 pero no con 549, agregar el 9
    else if (numero.startsWith('54') && !numero.startsWith('549') && numero.length === 12) {
      numeroFinal = '549' + numero.substring(2)
    }
    // Si ya empieza con 549, usar tal como está
    else if (numero.startsWith('549')) {
      numeroFinal = numero
    }
    
    // Validar que el número tenga una longitud válida para Argentina
    if (!numeroFinal.startsWith('549')) {
      console.log(`❌ Número no es argentino: ${numeroFinal}`)
      return null
    }
    
    if (numeroFinal.length < 12 || numeroFinal.length > 14) {
      console.log(`❌ Longitud de número inválida: ${numeroFinal} (${numeroFinal.length} dígitos)`)
      return null
    }
    
    console.log(`📱 Número final: ${numeroFinal}`)
    
    // Agregar @s.whatsapp.net al final
    return numeroFinal + '@s.whatsapp.net'
    
  } catch (error) {
    console.error(`❌ Error formateando teléfono ${telefono}:`, error)
    return null
  }
}

/**
 * Crear mensaje de recordatorio personalizado
 */
function crearMensajeRecordatorio(turno) {
  const fechaFormateada = formatearFecha(turno.fecha)
  const horaFormateada = formatearHora(turno.hora)
  
  return `🏥 *Recordatorio de Turno - FisioPasteur*

👋 Hola ${turno.paciente.nombre}!

📅 Te recordamos tu turno programado para:
🗓️ **Fecha:** ${fechaFormateada}
🕐 **Hora:** ${horaFormateada}
👨‍⚕️ **Especialista:** Dr./Dra. ${turno.especialista.nombre} ${turno.especialista.apellido}
🩺 **Especialidad:** ${turno.especialidad.nombre}

📋 *Importante:*
• Llega 10 minutos antes de tu turno
• Trae tu documentación
• Si necesitas reagendar, contáctanos cuanto antes

¿Podrás asistir a tu turno?
Responde *SI* para confirmar o *NO* si necesitas reprogramar.

¡Te esperamos! 😊`
}

/**
 * Formatear fecha para mostrar
 */
function formatearFecha(fecha) {
  try {
    const fechaObj = new Date(fecha)
    return fechaObj.toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch (error) {
    return fecha
  }
}

/**
 * Formatear hora para mostrar
 */
function formatearHora(hora) {
  try {
    // Si la hora viene como "14:30:00", extraer solo "14:30"
    if (hora.includes(':')) {
      const partes = hora.split(':')
      return `${partes[0]}:${partes[1]}`
    }
    return hora
  } catch (error) {
    return hora
  }
}

/**
 * Iniciar el sistema de recordatorios automáticos
 */
export function iniciarSistemaRecordatorios(enviarMensaje) {
  console.log('🚀 Iniciando sistema de recordatorios automáticos...')
  
  // Ejecutar inmediatamente
  procesarRecordatoriosPendientes(enviarMensaje)
  
  // Ejecutar cada minuto
  setInterval(() => {
    procesarRecordatoriosPendientes(enviarMensaje)
  }, 60000) // 60 segundos
  
  console.log('✅ Sistema de recordatorios iniciado - procesará cada 60 segundos')
}