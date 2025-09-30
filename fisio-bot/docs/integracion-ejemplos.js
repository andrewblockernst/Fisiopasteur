// 🔗 Ejemplos de Integración - Bot WhatsApp Fisiopasteur
// Copiar y adaptar estos ejemplos a tu sistema principal

// ===== 1. CONFIRMACIÓN DE TURNO =====
const enviarConfirmacionTurno = async (turnoData) => {
  const payload = {
    pacienteNombre: turnoData.paciente.nombre,
    pacienteApellido: turnoData.paciente.apellido,
    telefono: turnoData.paciente.telefono, // Formato: "1123456789" o "+54 9 11 2345-6789" 
    fecha: "15/10/2025", // DD/MM/YYYY
    hora: "14:30",       // HH:MM
    profesional: "Dr. García",
    especialidad: "Kinesiología",
    turnoId: turnoData.id,
    centroMedico: "Fisiopasteur Centro" // Opcional
  }

  try {
    const response = await fetch('https://fisiopasteur-bot.herokuapp.com/api/turno/confirmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    const result = await response.json()
    console.log('✅ Confirmación enviada:', result.status)
    return result
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// ===== 2. RECORDATORIO DE TURNO =====
const enviarRecordatorio = async (turnoData, tipo = '24h') => {
  try {
    const response = await fetch('https://fisiopasteur-bot.herokuapp.com/api/turno/recordatorio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pacienteNombre: turnoData.paciente.nombre,
        pacienteApellido: turnoData.paciente.apellido,
        telefono: turnoData.paciente.telefono,
        fecha: turnoData.fecha,
        hora: turnoData.hora,
        profesional: turnoData.profesional,
        especialidad: turnoData.especialidad,
        turnoId: turnoData.id
      })
    })
    
    const result = await response.json()
    console.log(`📱 Recordatorio ${tipo} enviado:`, result.status)
  } catch (error) {
    console.error(`❌ Error recordatorio ${tipo}:`, error)
  }
}

// ===== 3. PROGRAMAR RECORDATORIOS AUTOMÁTICOS =====
const programarRecordatoriosAutomaticos = (turnoData) => {
  const fechaHoraTurno = new Date(`${turnoData.fecha.split('/').reverse().join('-')} ${turnoData.hora}`)
  
  // Recordatorio 24 horas antes
  const tiempo24h = fechaHoraTurno.getTime() - (24 * 60 * 60 * 1000)
  const ahora = Date.now()
  
  if (tiempo24h > ahora) {
    setTimeout(() => {
      enviarRecordatorio(turnoData, '24h')
    }, tiempo24h - ahora)
  }
  
  // Recordatorio 2 horas antes  
  const tiempo2h = fechaHoraTurno.getTime() - (2 * 60 * 60 * 1000)
  if (tiempo2h > ahora) {
    setTimeout(() => {
      enviarRecordatorio(turnoData, '2h')
    }, tiempo2h - ahora)
  }
}

// ===== 4. EJEMPLO COMPLETO DE INTEGRACIÓN =====
const crearTurnoConNotificaciones = async (datosTurno) => {
  // 1. Guardar turno en base de datos (tu código)
  const turno = await guardarTurnoEnDB(datosTurno)
  
  // 2. Enviar confirmación por WhatsApp
  await enviarConfirmacionTurno(turno)
  
  // 3. Programar recordatorios
  programarRecordatoriosAutomaticos(turno)
  
  return turno
}

module.exports = {
  enviarConfirmacionTurno,
  enviarRecordatorio,
  programarRecordatoriosAutomaticos,
  crearTurnoConNotificaciones
}