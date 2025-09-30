import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils, EVENTS } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'

const PORT = process.env.PORT ?? 3008

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

// Flow de bienvenida general
const welcomeFlow = addKeyword<Provider, Database>(['hola', 'hi', 'hello', 'buenos dias', 'buenas tardes'])
    .addAnswer('👋 ¡Hola! Soy el asistente virtual de *Fisiopasteur*')
    .addAnswer([
        '🏥 Te ayudo con información sobre tus turnos de kinesiología.',
        '',
        'Puedes escribir:',
        '• *confirmar* - Para confirmar tu próximo turno',
        '• *cancelar* - Para cancelar un turno',
        '• *info* - Para información del centro',
        '• *ayuda* - Para ver todas las opciones'
    ].join('\n'))

// Flow para confirmación de asistencia
const confirmarFlow = addKeyword<Provider, Database>(['confirmar', 'confirmo', 'si voy', 'asistiré'])
    .addAnswer('✅ ¡Perfecto! He registrado tu confirmación de asistencia.')
    .addAnswer([
        '📋 *Recordatorios importantes:*',
        '• Llega 10 minutos antes de tu cita',
        '• Trae ropa cómoda para la sesión',
        '• Si necesitas cancelar, hazlo con 24hs de anticipación'
    ].join('\n'))

// Flow para cancelación
const cancelarFlow = addKeyword<Provider, Database>(['cancelar', 'no puedo ir', 'reprogramar'])
    .addAnswer('❌ Entiendo que necesitas cancelar tu turno.')
    .addAnswer(
        '¿Estás seguro que deseas cancelar? Responde *SI* para confirmar o *NO* para mantener el turno.',
        { capture: true },
        async (ctx, { flowDynamic, state }) => {
            const response = ctx.body.toLowerCase()
            if (response.includes('si') || response.includes('sí')) {
                await flowDynamic('🗓️ Tu turno ha sido cancelado. Te enviaremos información para reprogramar pronto.')
                // Aquí se podría integrar con la API para cancelar el turno
            } else {
                await flowDynamic('👍 Perfecto, tu turno se mantiene confirmado.')
            }
        }
    )

// Flow de información del centro
const infoFlow = addKeyword<Provider, Database>(['info', 'información', 'direccion', 'horarios'])
    .addAnswer([
        '🏥 *Información de Fisiopasteur*',
        '',
        '📍 **Dirección:** [Tu dirección aquí]',
        '📞 **Teléfono:** [Tu teléfono aquí]',
        '🕐 **Horarios:** Lun a Vie 8:00 - 20:00, Sáb 8:00 - 14:00',
        '',
        '🚗 **Cómo llegar:** [Instrucciones de ubicación]'
    ].join('\n'))

// Flow de ayuda
const ayudaFlow = addKeyword<Provider, Database>(['ayuda', 'help', 'opciones', 'menu'])
    .addAnswer([
        '🤖 *Menú de opciones:*',
        '',
        '• *confirmar* - Confirmar asistencia a tu turno',
        '• *cancelar* - Cancelar o reprogramar turno',
        '• *info* - Información del centro médico',
        '• *contacto* - Hablar con recepción',
        '',
        '💡 También recibirás notificaciones automáticas sobre tus turnos.'
    ].join('\n'))

// Flow para contacto directo
const contactoFlow = addKeyword<Provider, Database>(['contacto', 'recepcion', 'hablar', 'consulta'])
    .addAnswer([
        '👥 *Contacto directo:*',
        '',
        '📞 **Recepción:** [Número de teléfono]',
        '📧 **Email:** [Email del centro]',
        '🕐 **Horarios de atención:** Lun a Vie 8:00 - 20:00',
        '',
        'También puedes seguir escribiendo aquí y te ayudaré en lo que necesites.'
    ].join('\n'))

// Flow para casos no entendidos
const fallbackFlow = addKeyword<Provider, Database>(utils.setEvent('FALLBACK'))
    .addAnswer([
        '🤔 No entendí tu mensaje.',
        '',
        'Puedes escribir *ayuda* para ver las opciones disponibles',
        'o *contacto* para hablar directamente con recepción.'
    ].join('\n'))

// Función auxiliar para formatear mensajes de turno
const formatearMensajeTurno = (turno: TurnoData, tipo: 'confirmacion' | 'recordatorio'): string => {
    const emoji = tipo === 'confirmacion' ? '✅' : '⏰'
    const titulo = tipo === 'confirmacion' ? 'Confirmación de Turno' : 'Recordatorio de Turno'
    
    return [
        `${emoji} *${titulo}*`,
        '',
        `👤 **Paciente:** ${turno.pacienteNombre} ${turno.pacienteApellido}`,
        `📅 **Fecha:** ${turno.fecha}`,
        `🕐 **Hora:** ${turno.hora}`,
        `👩‍⚕️ **Profesional:** ${turno.profesional}`,
        `🏥 **Especialidad:** ${turno.especialidad}`,
        turno.centroMedico ? `🏢 **Centro:** ${turno.centroMedico}` : '',
        '',
        tipo === 'confirmacion' ? 
            'Responde *confirmar* para confirmar tu asistencia o *cancelar* si no puedes asistir.' :
            '⚠️ Tu turno es en las próximas horas. Responde *confirmar* si vas a asistir.',
        '',
        '📱 Para más información escribe *info*'
    ].filter(line => line !== '').join('\n')
}

// Función auxiliar para validar número de teléfono
const formatearTelefono = (telefono: string): string => {
    // Remover caracteres especiales y espacios
    const numero = telefono.replace(/[^0-9]/g, '')
    
    // Si no tiene código de país, agregar Argentina (+54)
    if (!numero.startsWith('54') && numero.length === 10) {
        return `549${numero}`
    }
    
    return numero
}

const main = async () => {
    // Configurar flows del bot
    const adapterFlow = createFlow([
        welcomeFlow,
        confirmarFlow,
        cancelarFlow,
        infoFlow,
        ayudaFlow,
        contactoFlow,
        fallbackFlow
    ])
    
    // Configuración del provider para mostrar QR en logs de Heroku
    const adapterProvider = createProvider(Provider, {
        writeMyself: 'both'
    })
    const adapterDB = new Database()

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    // Escuchar evento QR y mostrarlo en logs para Heroku
    adapterProvider.on('qr', (qr) => {
        console.log('🔥🔥🔥 CODIGO QR PARA ESCANEAR 🔥🔥🔥')
        console.log(qr)
        console.log('🔥🔥🔥 ESCANEA ESTE CODIGO CON WHATSAPP 🔥🔥🔥')
    })

    // ===== ENDPOINTS PARA INTEGRACIÓN CON FISIOPASTEUR =====
    
    // Endpoint para confirmar turno (desde el sistema principal)
    adapterProvider.server.post(
        '/api/turno/confirmar',
        handleCtx(async (bot, req, res) => {
            try {
                const turnoData: TurnoData = req.body
                const numeroFormateado = formatearTelefono(turnoData.telefono)
                const mensaje = formatearMensajeTurno(turnoData, 'confirmacion')
                
                if (!bot) {
                    throw new Error('Bot no inicializado')
                }
                
                await bot.sendMessage(numeroFormateado, mensaje)
                
                res.writeHead(200, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ 
                    status: 'success', 
                    message: 'Confirmación enviada',
                    turnoId: turnoData.turnoId
                }))
            } catch (error) {
                console.error('Error enviando confirmación:', error)
                res.writeHead(500, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ 
                    status: 'error', 
                    message: 'Error interno del servidor'
                }))
            }
        })
    )
    
    // Endpoint para recordatorio de turno
    adapterProvider.server.post(
        '/api/turno/recordatorio',
        handleCtx(async (bot, req, res) => {
            try {
                const turnoData: TurnoData = req.body
                const numeroFormateado = formatearTelefono(turnoData.telefono)
                const mensaje = formatearMensajeTurno(turnoData, 'recordatorio')
                
                if (!bot) {
                    throw new Error('Bot no inicializado')
                }
                
                await bot.sendMessage(numeroFormateado, mensaje)
                
                res.writeHead(200, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ 
                    status: 'success', 
                    message: 'Recordatorio enviado',
                    turnoId: turnoData.turnoId
                }))
            } catch (error) {
                console.error('Error enviando recordatorio:', error)
                res.writeHead(500, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ 
                    status: 'error', 
                    message: 'Error interno del servidor'
                }))
            }
        })
    )
    
    // Endpoint genérico para enviar mensajes
    adapterProvider.server.post(
        '/api/mensaje/enviar',
        handleCtx(async (bot, req, res) => {
            try {
                const { telefono, mensaje, media } = req.body
                
                if (!telefono || !mensaje) {
                    res.writeHead(400, { 'Content-Type': 'application/json' })
                    return res.end(JSON.stringify({ 
                        status: 'error', 
                        message: 'Teléfono y mensaje son requeridos'
                    }))
                }
                
                if (!bot) {
                    throw new Error('Bot no inicializado')
                }
                
                const numeroFormateado = formatearTelefono(telefono)
                await bot.sendMessage(numeroFormateado, mensaje, { media: media ?? null })
                
                res.writeHead(200, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ 
                    status: 'success', 
                    message: 'Mensaje enviado correctamente'
                }))
            } catch (error) {
                console.error('Error enviando mensaje:', error)
                res.writeHead(500, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ 
                    status: 'error', 
                    message: 'Error interno del servidor'
                }))
            }
        })
    )
    
    // Endpoint para gestión de lista negra
    adapterProvider.server.post(
        '/api/blacklist',
        handleCtx(async (bot, req, res) => {
            try {
                const { telefono, accion } = req.body
                const numeroFormateado = formatearTelefono(telefono)
                
                if (!bot) {
                    throw new Error('Bot no inicializado')
                }
                
                if (accion === 'remover') {
                    bot.blacklist.remove(numeroFormateado)
                } else if (accion === 'agregar') {
                    bot.blacklist.add(numeroFormateado)
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' })
                    return res.end(JSON.stringify({ 
                        status: 'error', 
                        message: 'Acción debe ser "agregar" o "remover"'
                    }))
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ 
                    status: 'success', 
                    telefono: numeroFormateado, 
                    accion 
                }))
            } catch (error) {
                console.error('Error gestionando blacklist:', error)
                res.writeHead(500, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ 
                    status: 'error', 
                    message: 'Error interno del servidor'
                }))
            }
        })
    )
    
    // Endpoint de estado/health check
    adapterProvider.server.get('/api/health', (req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ 
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'Fisiopasteur WhatsApp Bot'
        }))
    })

    console.log(`🤖 Bot de Fisiopasteur iniciado en puerto ${PORT}`)
    console.log(`📱 Endpoints disponibles:`)
    console.log(`   POST /api/turno/confirmar - Enviar confirmación de turno`)
    console.log(`   POST /api/turno/recordatorio - Enviar recordatorio`)
    console.log(`   POST /api/mensaje/enviar - Enviar mensaje genérico`)
    console.log(`   POST /api/blacklist - Gestionar lista negra`)
    console.log(`   GET /api/health - Estado del servicio`)
    
    httpServer(+PORT)
}

main().catch(console.error)
