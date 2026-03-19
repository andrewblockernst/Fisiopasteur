import 'dotenv/config'
import express from 'express'
import { waSenderService } from './wasender.service'
import { procesarRecordatoriosPendientes } from './recordatorios.service'

const PORT = process.env.PORT ?? 3008
const app = express()

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Tipos para los datos del turno
interface TurnoData {
    pacienteNombre: string
    pacienteApellido: string
    telefono: string
    fecha: string
    hora: string
    profesional: string
    especialidad: string
    turnoId: string
    centroMedico?: string
}

// Función auxiliar para formatear mensajes de turno
const formatearMensajeTurno = (turno: TurnoData, tipo: 'confirmacion' | 'recordatorio'): string => {
    const emoji = tipo === 'confirmacion' ? '✅' : '⏰'
    const titulo = tipo === 'confirmacion' ? 'Confirmación de Turno' : 'Recordatorio de Turno'
    
    const mensajeBase = [
        `${emoji} *${titulo}*`,
        '',
        '',
        `Paciente: ${turno.pacienteNombre} ${turno.pacienteApellido}`,
        `Fecha: ${turno.fecha}`,
        `Hora: ${turno.hora}`,
        `Profesional: ${turno.profesional}`,
        `Especialidad: ${turno.especialidad}`,
        ''
    ].filter(line => line !== '')

    const mensajeFinal = [
        ...mensajeBase,
        '',
        '✔️ *Recomendaciones para tu turno:*',
        '• Llegá 10 minutos antes',
        '• Traé ropa cómoda',
        '',
        '📍 Pasteur 206, Libertador San Martín',
        'Ante cualquier consulta, comuniquese directamente con su especialista.',
        '',
        '💪 ¡Te esperamos!'
    ]

    return mensajeFinal.join('\n')
}

// ===== SISTEMA DE RECORDATORIOS AUTOMÁTICOS =====

let recordatoriosInterval: NodeJS.Timeout | null = null

const FISIOPASTEUR_URL = process.env.FISIOPASTEUR_API_URL || 'https://fisiopasteur.vercel.app'

// Función helper para fetch con timeout
const fetchWithTimeout = async (url: string, options: any = {}, timeoutMs = 10000) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        })
        clearTimeout(timeout)
        return response
    } catch (error: any) {
        clearTimeout(timeout)
        if (error.name === 'AbortError') {
            throw new Error(`Timeout después de ${timeoutMs}ms`)
        }
        throw error
    }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const formatearFecha = (fecha: string): string => {
    const [year, month, day] = fecha.split('-')
    return `${day}/${month}/${year}`
}

// Notificar a Vercel el resultado de cada envío
const marcarNotificacion = async (id: number, estado: 'enviado' | 'fallido') => {
    try {
        await fetchWithTimeout(
            `${FISIOPASTEUR_URL}/api/cron/notificacion/${id}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado }),
            },
            5000
        )
    } catch (error: any) {
        console.error(`⚠️ No se pudo marcar notificación ${id} como ${estado}: ${error.message}`)
    }
}

/**
 * El bot obtiene la lista de recordatorios pendientes de Vercel,
 * los envía directamente a WaSender respetando el rate limit de 5s,
 * y notifica a Vercel el resultado de cada uno.
 * Así el timeout de Vercel no afecta el procesamiento.
 */
const procesarRecordatoriosAutonomo = async () => {
    try {
        const startTime = Date.now()
        console.log(`🔄 [${new Date().toISOString()}] Obteniendo recordatorios pendientes...`)

        const response = await fetchWithTimeout(
            `${FISIOPASTEUR_URL}/api/cron/recordatorios/pendientes`,
            { method: 'GET', headers: { 'Content-Type': 'application/json' } },
            10000
        )

        if (!response.ok) {
            console.error(`❌ Error obteniendo pendientes: ${response.status}`)
            return
        }

        const resultado = await response.json()
        if (!resultado.success || !resultado.data) {
            console.error(`❌ Respuesta inválida: ${resultado.error}`)
            return
        }

        const pendientes: any[] = resultado.data
        if (pendientes.length === 0) {
            console.log(`✅ Sin recordatorios pendientes (${Date.now() - startTime}ms)`)
            return
        }

        console.log(`📋 ${pendientes.length} recordatorio(s) a enviar`)

        let enviados = 0
        let fallidos = 0

        for (let i = 0; i < pendientes.length; i++) {
            const notif = pendientes[i]
            const turno = notif.turno

            if (!turno?.paciente?.telefono) {
                console.error(`❌ Notificación ${notif.id_notificacion} sin teléfono — marcando fallida`)
                await marcarNotificacion(notif.id_notificacion, 'fallido')
                fallidos++
                continue
            }

            const turnoData: TurnoData = {
                pacienteNombre: turno.paciente.nombre || 'Paciente',
                pacienteApellido: turno.paciente.apellido || '',
                telefono: turno.paciente.telefono,
                fecha: formatearFecha(turno.fecha),
                hora: (turno.hora || '').substring(0, 5),
                profesional: turno.especialista
                    ? `${turno.especialista.nombre} ${turno.especialista.apellido}`
                    : 'Profesional',
                especialidad: turno.especialidad?.nombre || 'Consulta',
                turnoId: String(notif.id_turno),
            }

            const mensaje = formatearMensajeTurno(turnoData, 'recordatorio')

            console.log(`📤 [${i + 1}/${pendientes.length}] Enviando recordatorio a ${turnoData.telefono}`)

            if (process.env.WHATSAPP_ENABLED !== 'true') {
                console.log(`⚠️ [DEV] Envío bloqueado (WHATSAPP_ENABLED no activo). Destinatario: ${turnoData.telefono}`)
                await marcarNotificacion(notif.id_notificacion, 'fallido')
                fallidos++
                continue
            }

        const envio = await waSenderService.sendMessage({ to: turnoData.telefono, text: mensaje })

            if (envio.success) {
                console.log(`✅ Recordatorio ${notif.id_notificacion} enviado`)
                await marcarNotificacion(notif.id_notificacion, 'enviado')
                enviados++
            } else {
                console.error(`❌ Falló recordatorio ${notif.id_notificacion}: ${envio.error}`)
                await marcarNotificacion(notif.id_notificacion, 'fallido')
                fallidos++
            }

            // ⏰ Rate limit WaSender Basic: 5s entre mensajes
            if (i < pendientes.length - 1) {
                console.log(`⏳ Esperando 5s (rate limit WaSender)...`)
                await delay(5000)
            }
        }

        console.log(`✨ Completado en ${Date.now() - startTime}ms: ${enviados} enviados, ${fallidos} fallidos`)

    } catch (error: any) {
        console.error('❌ Error en procesador de recordatorios:', error.message)
    }
}

// Iniciar sistema de recordatorios autónomo
const iniciarProcesadorRecordatorios = () => {
    console.log('🚀 Iniciando sistema de recordatorios autónomos...')

    // Ejecutar inmediatamente
    procesarRecordatoriosAutonomo()

    // Ejecutar cada 2 minutos
    recordatoriosInterval = setInterval(procesarRecordatoriosAutonomo, 120000)

    console.log('✅ Sistema de recordatorios autónomos iniciado (cada 2 minutos)')
}

// Detener procesamiento de recordatorios
const detenerProcesadorRecordatorios = () => {
    if (recordatoriosInterval) {
        clearInterval(recordatoriosInterval)
        recordatoriosInterval = null
        console.log('⏹️ Servicio de recordatorios automáticos detenido')
    }
}

// ===== ENDPOINTS PARA INTEGRACIÓN CON FISIOPASTEUR =====

// Endpoint para confirmar turno
app.post('/api/turno/confirmar', async (req, res) => {
    try {
        const turnoData: any = req.body
        
        // Extraer datos con compatibilidad para ambas estructuras
        const telefono = turnoData.telefono
        const pacienteNombre = turnoData.pacienteNombre || turnoData.paciente?.nombre
        const pacienteApellido = turnoData.pacienteApellido || turnoData.paciente?.apellido
        const especialistaNombre = turnoData.profesional || turnoData.especialista?.nombre
        
        // Validar datos requeridos
        if (!telefono || !pacienteNombre) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Datos incompletos. Teléfono y nombre son requeridos.',
                code: 'INVALID_DATA',
                received: { telefono, pacienteNombre, data: turnoData }
            })
        }
        
        // Crear objeto normalizado para el mensaje
        const datosNormalizados = {
            ...turnoData,
            pacienteNombre,
            pacienteApellido,
            profesional: especialistaNombre,
            telefono
        }
        
        const mensaje = formatearMensajeTurno(datosNormalizados, 'confirmacion')
        
        console.log(`📤 Enviando confirmación a ${telefono}`)
        
        // Enviar mensaje usando WaSenderAPI
        const resultado = await waSenderService.sendMessage({
            to: telefono,
            text: mensaje
        })
        
        if (!resultado.success) {
            throw new Error(resultado.error || 'Error enviando mensaje')
        }
        
        console.log(`✅ Confirmación enviada exitosamente`)
        
        return res.status(200).json({ 
            status: 'success', 
            message: 'Confirmación enviada',
            turnoId: turnoData.turnoId || turnoData.id_turno
        })
        
    } catch (error) {
        console.error('❌ Error enviando confirmación:', error)
        return res.status(500).json({ 
            status: 'error', 
            message: 'Error interno del servidor',
            details: error instanceof Error ? error.message : 'Error desconocido'
        })
    }
})

// Endpoint para recordatorio de turno
app.post('/api/turno/recordatorio', async (req, res) => {
    try {
        const turnoData: any = req.body
        
        // Extraer datos con compatibilidad para ambas estructuras
        const telefono = turnoData.telefono
        const pacienteNombre = turnoData.pacienteNombre || turnoData.paciente?.nombre
        const pacienteApellido = turnoData.pacienteApellido || turnoData.paciente?.apellido
        const especialistaNombre = turnoData.profesional || turnoData.especialista?.nombre
        
        // Validar datos requeridos
        if (!telefono || !pacienteNombre) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Datos incompletos. Teléfono y nombre son requeridos.',
                code: 'INVALID_DATA'
            })
        }
        
        // Crear objeto normalizado para el mensaje
        const datosNormalizados = {
            ...turnoData,
            pacienteNombre,
            pacienteApellido,
            profesional: especialistaNombre,
            telefono
        }
        
        const mensaje = formatearMensajeTurno(datosNormalizados, 'recordatorio')
        
        console.log(`📤 Enviando recordatorio a ${telefono}`)
        
        // Enviar mensaje usando WaSenderAPI
        const resultado = await waSenderService.sendMessage({
            to: telefono,
            text: mensaje
        })
        
        if (!resultado.success) {
            throw new Error(resultado.error || 'Error enviando mensaje')
        }
        
        console.log(`✅ Recordatorio enviado exitosamente`)
        
        return res.status(200).json({ 
            status: 'success', 
            message: 'Recordatorio enviado',
            turnoId: turnoData.turnoId
        })
        
    } catch (error) {
        console.error('❌ Error enviando recordatorio:', error)
        return res.status(500).json({ 
            status: 'error', 
            message: 'Error interno del servidor',
            details: error instanceof Error ? error.message : 'Error desconocido'
        })
    }
})

// Endpoint genérico para enviar mensajes
app.post('/api/mensaje/enviar', async (req, res) => {
    try {
        const { telefono, mensaje, media } = req.body
        
        if (!telefono || !mensaje) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Teléfono y mensaje son requeridos'
            })
        }
        
        const resultado = await waSenderService.sendMessage({
            to: telefono,
            text: mensaje,
            media: media
        })
        
        if (!resultado.success) {
            throw new Error(resultado.error || 'Error enviando mensaje')
        }
        
        return res.status(200).json({ 
            status: 'success', 
            message: 'Mensaje enviado correctamente'
        })
        
    } catch (error) {
        console.error('❌ Error enviando mensaje:', error)
        return res.status(500).json({ 
            status: 'error', 
            message: 'Error interno del servidor'
        })
    }
})

// Endpoint para procesar recordatorios manualmente
app.post('/api/recordatorios/procesar', async (req, res) => {
    try {
        console.log('🔄 Procesamiento manual de recordatorios iniciado...')
        
        // Función para enviar mensajes usando WaSenderAPI
        const enviarMensaje = async (telefono: string, mensaje: string) => {
            const resultado = await waSenderService.sendMessage({
                to: telefono,
                text: mensaje
            })
            
            if (!resultado.success) {
                throw new Error(resultado.error || 'Error enviando mensaje')
            }
            
            return true
        }
        
        const resultado = await procesarRecordatoriosPendientes(enviarMensaje)
        
        return res.status(200).json({
            status: 'success',
            message: 'Recordatorios procesados exitosamente',
            resultado: {
                procesadas: resultado.procesadas,
                enviadas: resultado.enviadas,
                fallidas: resultado.fallidas
            }
        })
        
    } catch (error) {
        console.error('❌ Error en procesamiento manual de recordatorios:', error)
        return res.status(500).json({
            status: 'error',
            message: 'Error interno del servidor',
            details: error instanceof Error ? error.message : 'Error desconocido'
        })
    }
})

// Endpoint de health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    })
})

app.head('/health', (req, res) => {
    res.status(200).end()
})

// Endpoint de health check detallado
app.get('/api/health', (req, res) => {
    const uptime = Math.floor(process.uptime())
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    
    res.json({ 
        status: 'ok',
        uptime: `${hours}h ${minutes}m`,
        uptimeSeconds: uptime,
        timestamp: new Date().toISOString(),
        service: 'Fisiopasteur WhatsApp Bot (WaSenderAPI)',
        memory: {
            rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
        }
    })
})

app.head('/api/health', (req, res) => {
    res.status(200).end()
})

// Endpoint para verificar estado de WhatsApp
app.get('/api/status', async (req, res) => {
    try {
        const sessionStatus = await waSenderService.getSessionStatus()
        const uptime = Math.floor(process.uptime())
        
        res.json({ 
            authenticated: sessionStatus.success,
            sessionData: sessionStatus.data,
            uptime: uptime,
            timestamp: new Date().toISOString(),
            service: 'Fisiopasteur WhatsApp Bot (WaSenderAPI)'
        })
    } catch (error) {
        res.json({ 
            authenticated: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
            service: 'Fisiopasteur WhatsApp Bot (WaSenderAPI)'
        })
    }
})

// Endpoint para obtener QR (si es necesario)
app.get('/api/qr', async (req, res) => {
    try {
        const qrResult = await waSenderService.getQRCode()
        
        if (!qrResult.success) {
            return res.status(500).json({
                status: 'error',
                message: qrResult.error || 'Error obteniendo QR'
            })
        }
        
        res.json({
            status: 'success',
            data: qrResult.data
        })
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error instanceof Error ? error.message : 'Error desconocido'
        })
    }
})

// Endpoint raíz
app.get('/', (req, res) => {
    res.json({
        service: 'Fisiopasteur WhatsApp Bot',
        version: '2.0.0',
        provider: 'WaSenderAPI',
        status: 'running'
    })
})

// Manejar cierre del proceso
process.on('SIGTERM', () => {
    console.log('📴 Cerrando aplicación...')
    detenerProcesadorRecordatorios()
    process.exit(0)
})

process.on('SIGINT', () => {
    console.log('📴 Cerrando aplicación...')
    detenerProcesadorRecordatorios()
    process.exit(0)
})

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🤖 Bot de Fisiopasteur iniciado en puerto ${PORT}`)
    console.log(`📱 Provider: WaSenderAPI`)
    console.log(`📱 Endpoints disponibles:`)
    console.log(`   POST /api/turno/confirmar - Enviar confirmación de turno`)
    console.log(`   POST /api/turno/recordatorio - Enviar recordatorio`)
    console.log(`   POST /api/mensaje/enviar - Enviar mensaje genérico`)
    console.log(`   POST /api/recordatorios/procesar - Procesar recordatorios manualmente`)
    console.log(`   GET /api/health - Estado del servicio`)
    console.log(`   GET /api/status - Estado de autenticación WhatsApp`)
    console.log(`   GET /api/qr - Obtener código QR (si es necesario)`)
    console.log(``)
    console.log(`🕐 Sistema de recordatorios automáticos: ACTIVADO (cada 2 minutos)`)
    
    // Iniciar sistema de recordatorios
    iniciarProcesadorRecordatorios()
})
