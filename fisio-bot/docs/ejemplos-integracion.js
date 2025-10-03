// Ejemplos de integración del Bot de WhatsApp con Fisiopasteur
// Estos son ejemplos de cómo llamar al bot desde tu sistema principal

// ===== DESDE EL SISTEMA FISIOPASTEUR =====

// Ejemplo 1: Enviar confirmación cuando se crea un turno
const enviarConfirmacionTurno = async (turnoData) => {
  const payload = {
    pacienteNombre: turnoData.paciente.nombre,
    pacienteApellido: turnoData.paciente.apellido,
    telefono: turnoData.paciente.telefono,
    fecha: turnoData.fecha, // formato: "DD/MM/YYYY"
    hora: turnoData.hora,   // formato: "HH:MM"
    profesional: turnoData.profesional.nombreCompleto,
    especialidad: turnoData.especialidad,
    turnoId: turnoData.id,
    centroMedico: turnoData.centro?.nombre || "Fisiopasteur"
  }

  try {
    const response = await fetch('https://fisiopasteur-bot.herokuapp.com/api/turno/confirmar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()
    
    if (result.status === 'success') {
      console.log('✅ Confirmación enviada por WhatsApp')
      // Opcional: guardar en DB que se envió la confirmación
      await actualizarEstadoTurno(turnoData.id, 'confirmacion_enviada')
    } else {
      console.error('❌ Error enviando confirmación:', result.message)
    }
  } catch (error) {
    console.error('❌ Error de conexión con bot:', error)
  }
}

// Ejemplo 2: Programar recordatorios automáticos
const programarRecordatorios = async (turnoData) => {
  const fechaHoraTurno = new Date(`${turnoData.fecha} ${turnoData.hora}`)
  
  // Recordatorio 24 horas antes
  const recordatorio24h = new Date(fechaHoraTurno.getTime() - (24 * 60 * 60 * 1000))
  
  // Recordatorio 2 horas antes  
  const recordatorio2h = new Date(fechaHoraTurno.getTime() - (2 * 60 * 60 * 1000))
  
  // Programar con tu sistema de cron jobs o scheduler
  await programarTarea(recordatorio24h, () => {
    enviarRecordatorio(turnoData, '24h')
  })
  
  await programarTarea(recordatorio2h, () => {
    enviarRecordatorio(turnoData, '2h')
  })
}

const enviarRecordatorio = async (turnoData, tipo) => {
  const payload = {
    pacienteNombre: turnoData.paciente.nombre,
    pacienteApellido: turnoData.paciente.apellido,
    telefono: turnoData.paciente.telefono,
    fecha: turnoData.fecha,
    hora: turnoData.hora,
    profesional: turnoData.profesional.nombreCompleto,
    especialidad: turnoData.especialidad,
    turnoId: turnoData.id
  }

  try {
    const response = await fetch('https://fisiopasteur-bot.herokuapp.com/api/turno/recordatorio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()
    console.log(`📱 Recordatorio ${tipo} enviado:`, result.status)
  } catch (error) {
    console.error(`❌ Error enviando recordatorio ${tipo}:`, error)
  }
}

// ===== WEBHOOK PARA RECIBIR RESPUESTAS =====

// Endpoint en tu sistema Fisiopasteur para recibir confirmaciones del bot
app.post('/webhook/bot-respuestas', (req, res) => {
  const { telefono, mensaje, turnoId, accion } = req.body
  
  switch (accion) {
    case 'confirmacion':
      // El paciente confirmó asistencia
      actualizarEstadoTurno(turnoId, 'confirmado')
      break
      
    case 'cancelacion':
      // El paciente canceló el turno
      cancelarTurno(turnoId)
      liberarHorario(turnoId)
      break
      
    case 'reprogramacion':
      // El paciente quiere reprogramar
      marcarParaReprogramacion(turnoId)
      break
  }
  
  res.json({ status: 'received' })
})

// ===== EJEMPLOS DE MENSAJES PERSONALIZADOS =====

// Envío de mensaje personalizado para casos especiales
const enviarMensajePersonalizado = async (telefono, mensaje) => {
  try {
    const response = await fetch('https://fisiopasteur-bot.herokuapp.com/api/mensaje/enviar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telefono: telefono,
        mensaje: mensaje
      })
    })

    const result = await response.json()
    return result.status === 'success'
  } catch (error) {
    console.error('Error enviando mensaje personalizado:', error)
    return false
  }
}

// Ejemplos de uso:
// await enviarMensajePersonalizado("1123456789", 
//   "Hola Juan! Te recordamos que mañana tienes tu evaluación inicial. Por favor trae ropa cómoda.")

// await enviarMensajePersonalizado("1123456789",
//   "Tu turno del viernes ha sido reprogramado para el lunes a las 15:00hs. ¿Te viene bien?")

// ===== INTEGRACIÓN CON SISTEMA DE TURNOS =====

// Cuando se crea un turno en Fisiopasteur:
const crearTurno = async (datosTurno) => {
  // 1. Crear turno en la base de datos
  const turno = await guardarTurnoEnDB(datosTurno)
  
  // 2. Enviar confirmación por WhatsApp
  await enviarConfirmacionTurno(turno)
  
  // 3. Programar recordatorios
  await programarRecordatorios(turno)
  
  return turno
}

// ===== MONITOREO Y SALUD =====

// Verificar que el bot esté funcionando
const verificarEstadoBot = async () => {
  try {
    const response = await fetch('https://fisiopasteur-bot.herokuapp.com/api/health')
    const result = await response.json()
    return result.status === 'ok'
  } catch (error) {
    console.error('Bot no disponible:', error)
    return false
  }
}

// Ejemplo de uso en un cron job para monitoreo:
// setInterval(async () => {
//   const botOnline = await verificarEstadoBot()
//   if (!botOnline) {
//     // Enviar alerta al admin
//     enviarAlertaAdmin("Bot de WhatsApp no está disponible")
//   }
// }, 5 * 60 * 1000) // cada 5 minutos

module.exports = {
  enviarConfirmacionTurno,
  enviarRecordatorio,
  enviarMensajePersonalizado,
  programarRecordatorios,
  verificarEstadoBot
}