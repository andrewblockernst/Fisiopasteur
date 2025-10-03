import 'dotenv/config'
import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils, EVENTS } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'
import { procesarRecordatoriosPendientes } from './recordatorios.service'

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
    console.log(`📱 Formateando teléfono: ${telefono}`)
    
    // Remover caracteres especiales y espacios
    const numero = telefono.replace(/[^0-9]/g, '')
    console.log(`📱 Número limpio: ${numero}`)
    
    let numeroFinal = numero
    
    // Si no tiene código de país, agregar Argentina (+54)
    if (!numero.startsWith('54') && numero.length === 10) {
        numeroFinal = `549${numero}`
    } else if (numero.startsWith('549') && numero.length === 13) {
        numeroFinal = numero
    } else if (numero.startsWith('54') && numero.length === 12) {
        numeroFinal = numero
    } else if (numero.length === 10) {
        numeroFinal = `549${numero}`
    }
    
    // Agregar @s.whatsapp.net al final
    const numeroFormateado = `${numeroFinal}@s.whatsapp.net`
    console.log(`📱 Número formateado final: ${numeroFormateado}`)
    
    return numeroFormateado
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
    
    console.log('🔄 Creando provider de WhatsApp...')
    const adapterProvider = createProvider(Provider, {
        writeMyself: 'none'
    })

    // Eventos mejorados para debugging del QR
    adapterProvider.on('ready', () => {
        console.log('✅ WhatsApp conectado exitosamente!')
    })
    
    adapterProvider.on('qr', (qr) => {
        console.log('\n' + '='.repeat(50))
        console.log('📱 CÓDIGO QR PARA WHATSAPP:')
        console.log('='.repeat(50))
        console.log(qr)
        console.log('='.repeat(50))
        console.log('⚠️  Escanea este QR con WhatsApp en tu teléfono:')
        console.log('   1. Abre WhatsApp en tu teléfono')
        console.log('   2. Ve a Ajustes > Dispositivos vinculados')
        console.log('   3. Toca "Vincular un dispositivo"')
        console.log('   4. Escanea el código QR de arriba')
        console.log('='.repeat(50) + '\n')
    })
    
    adapterProvider.on('auth_failure', (error) => {
        console.error('❌ Error de autenticación:', error)
    })
    
    adapterProvider.on('disconnected', (reason) => {
        console.log('🔌 WhatsApp desconectado:', reason)
    })
    
    adapterProvider.on('loading.screen', (percent, message) => {
        console.log('🔄 Cargando WhatsApp:', percent, message)
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

    // ===== SISTEMA DE RECORDATORIOS AUTOMÁTICOS =====
    
    // Variable para controlar el intervalo de recordatorios
    let recordatoriosInterval: NodeJS.Timeout | null = null
    let botInstance: any = null
    
    // Función para iniciar el procesamiento de recordatorios
    const iniciarProcesadorRecordatorios = (bot: any) => {
        console.log('🕐 Iniciando servicio de recordatorios automáticos...')
        botInstance = bot
        
        // Función auxiliar para enviar mensajes desde el bot
        const enviarMensajeBot = async (telefono: string, mensaje: string) => {
            try {
                if (!botInstance) {
                    throw new Error('Bot no está inicializado')
                }
                
                // Enviar el mensaje usando la función del bot
                await botInstance.sendMessage(telefono, mensaje, { media: null as any })
                return true
            } catch (error) {
                console.error('❌ Error enviando mensaje desde bot:', error)
                throw error
            }
        }
        
        // Procesar recordatorios cada 5 minutos
        const procesarRecordatorios = async () => {
            try {
                // Verificar que el bot esté conectado
                const isAuthenticated = adapterProvider.vendor?.authState?.creds ? true : false
                if (!isAuthenticated) {
                    console.log('⏸️ Bot no autenticado, saltando procesamiento de recordatorios')
                    return
                }
                
                console.log('🔄 Procesando recordatorios pendientes...')
                const resultado = await procesarRecordatoriosPendientes(enviarMensajeBot)
                
                if (resultado.procesadas > 0) {
                    console.log(`✨ Recordatorios procesados: ${resultado.enviadas} enviadas, ${resultado.fallidas} fallidas`)
                }
            } catch (error) {
                console.error('❌ Error en procesamiento automático de recordatorios:', error)
            }
        }
        
        // Ejecutar inmediatamente y luego cada 5 minutos
        procesarRecordatorios()
        recordatoriosInterval = setInterval(procesarRecordatorios, 5 * 60 * 1000) // 5 minutos
        
        console.log('✅ Servicio de recordatorios automáticos iniciado (cada 5 minutos)')
    }
    
    // Detener procesamiento de recordatorios
    const detenerProcesadorRecordatorios = () => {
        if (recordatoriosInterval) {
            clearInterval(recordatoriosInterval)
            recordatoriosInterval = null
            console.log('⏹️ Servicio de recordatorios automáticos detenido')
        }
    }
    
    // Escuchar cuando el bot se conecta para iniciar recordatorios
    adapterProvider.on('ready', () => {
        console.log('🤖 Bot conectado y listo')
        
        // Iniciar sistema de recordatorios autónomo via API de Fisiopasteur
        console.log('🚀 Iniciando sistema de recordatorios autónomos vía API...')
        
        const FISIOPASTEUR_URL = process.env.FISIOPASTEUR_API_URL || 'https://fisiopasteur.vercel.app'
        
        // Función para procesar recordatorios llamando al endpoint de Vercel
        const procesarRecordatoriosViaAPI = async () => {
            try {
                console.log('🔄 Llamando al endpoint de recordatorios...')
                const response = await fetch(`${FISIOPASTEUR_URL}/api/cron/recordatorios`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
                
                if (!response.ok) {
                    console.error(`❌ Error en llamada API: ${response.status}`)
                    return
                }
                
                const resultado = await response.json()
                if (resultado.success) {
                    console.log(`✅ Recordatorios procesados vía API: ${JSON.stringify(resultado.data)}`)
                } else {
                    console.error(`❌ Error en API de recordatorios: ${resultado.message}`)
                }
            } catch (error) {
                console.error('❌ Error llamando al endpoint de recordatorios:', error)
            }
        }
        
        // Ejecutar inmediatamente
        procesarRecordatoriosViaAPI()
        
        // Ejecutar cada 60 segundos
        recordatoriosInterval = setInterval(procesarRecordatoriosViaAPI, 60000)
        
        console.log('✅ Sistema de recordatorios autónomos vía API iniciado (cada 60 segundos)')
    })
    
    // Escuchar cuando el bot se desconecta para detener recordatorios
    adapterProvider.on('auth_failure', () => {
        console.log('❌ Falla de autenticación')
        detenerProcesadorRecordatorios()
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

    // ===== ENDPOINTS PARA INTEGRACIÓN CON FISIOPASTEUR =====
    
    // Endpoint para confirmar turno (desde el sistema principal)
    adapterProvider.server.post(
        '/api/turno/confirmar',
        handleCtx(async (bot, req, res) => {
            try {
                // Verificar múltiples condiciones del bot
                if (!bot) {
                    res.writeHead(503, { 'Content-Type': 'application/json' })
                    return res.end(JSON.stringify({ 
                        status: 'error', 
                        message: 'Bot no inicializado',
                        code: 'BOT_NOT_READY'
                    }))
                }
                
                // Verificar si el bot está autenticado y listo
                const isAuthenticated = adapterProvider.vendor?.authState?.creds ? true : false
                // Simplificamos la verificación de conexión
                const isReady = adapterProvider.vendor ? true : false
                
                if (!isAuthenticated) {
                    res.writeHead(503, { 'Content-Type': 'application/json' })
                    return res.end(JSON.stringify({ 
                        status: 'error', 
                        message: 'Bot no autenticado. Escanee el código QR.',
                        code: 'NOT_AUTHENTICATED'
                    }))
                }
                
                if (!isReady) {
                    res.writeHead(503, { 'Content-Type': 'application/json' })
                    return res.end(JSON.stringify({ 
                        status: 'error', 
                        message: 'Bot no conectado a WhatsApp. Intente nuevamente en unos segundos.',
                        code: 'NOT_CONNECTED'
                    }))
                }
                
                const turnoData: any = req.body
                
                // Extraer datos con compatibilidad para ambas estructuras
                const telefono = turnoData.telefono
                const pacienteNombre = turnoData.pacienteNombre || turnoData.paciente?.nombre
                const pacienteApellido = turnoData.pacienteApellido || turnoData.paciente?.apellido
                const especialistaNombre = turnoData.profesional || turnoData.especialista?.nombre
                
                // Validar datos requeridos
                if (!telefono || !pacienteNombre) {
                    res.writeHead(400, { 'Content-Type': 'application/json' })
                    return res.end(JSON.stringify({ 
                        status: 'error', 
                        message: 'Datos incompletos. Teléfono y nombre son requeridos.',
                        code: 'INVALID_DATA',
                        received: { telefono, pacienteNombre, data: turnoData }
                    }))
                }
                
                // Crear objeto normalizado para el mensaje
                const datosNormalizados = {
                    ...turnoData,
                    pacienteNombre,
                    pacienteApellido,
                    profesional: especialistaNombre,
                    telefono
                }
                
                const numeroFormateado = formatearTelefono(telefono)
                const mensaje = formatearMensajeTurno(datosNormalizados, 'confirmacion')
                
                console.log(`📤 Enviando mensaje a ${numeroFormateado}: ${mensaje.substring(0, 50)}...`)
                
                // Verificación adicional de la sesión antes de enviar
                await new Promise(resolve => setTimeout(resolve, 1000)) // Esperar 1 segundo
                
                // Verificar que el vendor esté correctamente inicializado
                if (!adapterProvider.vendor?.authState?.creds) {
                    throw new Error('Sesión de WhatsApp no inicializada completamente')
                }
                
                // Intentar enviar el mensaje con manejo de errores específico
                try {
                    // Usar exactamente el mismo formato que el endpoint que funciona
                    await bot.sendMessage(numeroFormateado, mensaje, { media: null as any })
                    console.log(`✅ Mensaje enviado exitosamente a ${numeroFormateado}`)
                } catch (sendError) {
                    console.error(`❌ Error específico enviando mensaje:`, sendError)
                    // Intentar una vez más después de un pequeño delay
                    console.log(`🔄 Reintentando envío en 2 segundos...`)
                    await new Promise(resolve => setTimeout(resolve, 2000))
                    try {
                        await bot.sendMessage(numeroFormateado, mensaje, { media: null as any })
                        console.log(`✅ Mensaje enviado exitosamente en segundo intento a ${numeroFormateado}`)
                    } catch (retryError) {
                        console.error(`❌ Error en reintento:`, retryError)
                        throw new Error(`Error enviando mensaje: ${sendError instanceof Error ? sendError.message : 'Error desconocido'}`)
                    }
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ 
                    status: 'success', 
                    message: 'Confirmación enviada',
                    turnoId: turnoData.turnoId || turnoData.id_turno
                }))
            } catch (error) {
                console.error('Error enviando confirmación:', error)
                res.writeHead(500, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ 
                    status: 'error', 
                    message: 'Error interno del servidor',
                    details: error instanceof Error ? error.message : 'Error desconocido'
                }))
            }
        })
    )
    
    // Endpoint para recordatorio de turno
    adapterProvider.server.post(
        '/api/turno/recordatorio',
        handleCtx(async (bot, req, res) => {
            try {
                // Verificar múltiples condiciones del bot
                if (!bot) {
                    res.writeHead(503, { 'Content-Type': 'application/json' })
                    return res.end(JSON.stringify({ 
                        status: 'error', 
                        message: 'Bot no inicializado',
                        code: 'BOT_NOT_READY'
                    }))
                }
                
                // Verificar si el bot está autenticado y listo
                const isAuthenticated = adapterProvider.vendor?.authState?.creds ? true : false
                const isReady = adapterProvider.vendor ? true : false
                
                if (!isAuthenticated) {
                    res.writeHead(503, { 'Content-Type': 'application/json' })
                    return res.end(JSON.stringify({ 
                        status: 'error', 
                        message: 'Bot no autenticado. Escanee el código QR.',
                        code: 'NOT_AUTHENTICATED'
                    }))
                }
                
                if (!isReady) {
                    res.writeHead(503, { 'Content-Type': 'application/json' })
                    return res.end(JSON.stringify({ 
                        status: 'error', 
                        message: 'Bot no conectado a WhatsApp. Intente nuevamente en unos segundos.',
                        code: 'NOT_CONNECTED'
                    }))
                }
                
                const turnoData: any = req.body
                
                // Extraer datos con compatibilidad para ambas estructuras
                const telefono = turnoData.telefono
                const pacienteNombre = turnoData.pacienteNombre || turnoData.paciente?.nombre
                const pacienteApellido = turnoData.pacienteApellido || turnoData.paciente?.apellido
                const especialistaNombre = turnoData.profesional || turnoData.especialista?.nombre
                
                // Validar datos requeridos
                if (!telefono || !pacienteNombre) {
                    res.writeHead(400, { 'Content-Type': 'application/json' })
                    return res.end(JSON.stringify({ 
                        status: 'error', 
                        message: 'Datos incompletos. Teléfono y nombre son requeridos.',
                        code: 'INVALID_DATA'
                    }))
                }
                
                // Crear objeto normalizado para el mensaje
                const datosNormalizados = {
                    ...turnoData,
                    pacienteNombre,
                    pacienteApellido,
                    profesional: especialistaNombre,
                    telefono
                }
                
                const numeroFormateado = formatearTelefono(telefono)
                const mensaje = formatearMensajeTurno(datosNormalizados, 'recordatorio')
                
                console.log(`📤 Enviando recordatorio a ${numeroFormateado}: ${mensaje.substring(0, 50)}...`)
                
                // Verificación adicional de la sesión antes de enviar
                await new Promise(resolve => setTimeout(resolve, 1000)) // Esperar 1 segundo
                
                // Verificar que el vendor esté correctamente inicializado
                if (!adapterProvider.vendor?.authState?.creds) {
                    throw new Error('Sesión de WhatsApp no inicializada completamente')
                }
                
                // Intentar enviar el mensaje con manejo de errores específico
                try {
                    await bot.sendMessage(numeroFormateado, mensaje, { media: null as any })
                    console.log(`✅ Recordatorio enviado exitosamente a ${numeroFormateado}`)
                } catch (sendError) {
                    console.error(`❌ Error específico enviando recordatorio:`, sendError)
                    // Intentar una vez más después de un pequeño delay
                    console.log(`🔄 Reintentando envío de recordatorio en 2 segundos...`)
                    await new Promise(resolve => setTimeout(resolve, 2000))
                    try {
                        await bot.sendMessage(numeroFormateado, mensaje, { media: null as any })
                        console.log(`✅ Recordatorio enviado exitosamente en segundo intento a ${numeroFormateado}`)
                    } catch (retryError) {
                        console.error(`❌ Error en reintento de recordatorio:`, retryError)
                        throw new Error(`Error enviando recordatorio: ${sendError instanceof Error ? sendError.message : 'Error desconocido'}`)
                    }
                }
                
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
                    message: 'Error interno del servidor',
                    details: error instanceof Error ? error.message : 'Error desconocido'
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
    
    // Endpoint temporal para restaurar sesión de WhatsApp
    adapterProvider.server.get('/api/restore-session', async (req, res) => {
        try {
            const { execSync } = await import('child_process')
            const { existsSync } = await import('fs')
            const { join } = await import('path')
            const { fileURLToPath } = await import('url')
            
            // Obtener __dirname equivalente para módulos ES
            const __filename = fileURLToPath(import.meta.url)
            const __dirname = join(__filename, '..')
            
            // Verificar si existe el archivo de sesión
            const sessionFile = join(__dirname, 'whatsapp_session.tar.gz')
            if (existsSync(sessionFile)) {
                // Extraer la sesión
                execSync(`cd ${__dirname} && tar -xzf whatsapp_session.tar.gz`)
                
                res.writeHead(200, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ 
                    status: 'success',
                    message: 'Sesión de WhatsApp restaurada. Reiniciando bot...'
                }))
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({ 
                    status: 'error',
                    message: 'Archivo de sesión no encontrado'
                }))
            }
        } catch (error) {
            console.error('Error restaurando sesión:', error)
            res.writeHead(500, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ 
                status: 'error',
                message: 'Error restaurando sesión'
            }))
        }
    })

    // Endpoint para procesar recordatorios manualmente
    adapterProvider.server.post(
        '/api/recordatorios/procesar',
        handleCtx(async (bot, req, res) => {
            try {
                if (!bot) {
                    res.writeHead(503, { 'Content-Type': 'application/json' })
                    return res.end(JSON.stringify({ 
                        status: 'error', 
                        message: 'Bot no inicializado'
                    }))
                }
                
                const isAuthenticated = adapterProvider.vendor?.authState?.creds ? true : false
                if (!isAuthenticated) {
                    res.writeHead(503, { 'Content-Type': 'application/json' })
                    return res.end(JSON.stringify({ 
                        status: 'error', 
                        message: 'Bot no autenticado'
                    }))
                }
                
                console.log('🔄 Procesamiento manual de recordatorios iniciado...')
                
                // Función para enviar mensajes usando la instancia del bot
                const enviarMensaje = async (telefono: string, mensaje: string) => {
                    return await bot.sendMessage(telefono, mensaje, { media: null as any })
                }
                
                const resultado = await procesarRecordatoriosPendientes(enviarMensaje)
                
                res.writeHead(200, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({
                    status: 'success',
                    message: 'Recordatorios procesados exitosamente',
                    resultado: {
                        procesadas: resultado.procesadas,
                        enviadas: resultado.enviadas,
                        fallidas: resultado.fallidas
                    }
                }))
                
            } catch (error) {
                console.error('❌ Error en procesamiento manual de recordatorios:', error)
                res.writeHead(500, { 'Content-Type': 'application/json' })
                return res.end(JSON.stringify({
                    status: 'error',
                    message: 'Error interno del servidor',
                    details: error instanceof Error ? error.message : 'Error desconocido'
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
    
    // Endpoint para verificar si está autenticado
    adapterProvider.server.get('/api/status', (req, res) => {
        const isAuthenticated = adapterProvider.vendor?.authState?.creds ? true : false
        res.writeHead(200, { 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ 
            authenticated: isAuthenticated,
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
    console.log(`   POST /api/recordatorios/procesar - Procesar recordatorios manualmente`)
    console.log(`   GET /api/health - Estado del servicio`)
    console.log(`   GET /api/status - Estado de autenticación`)
    console.log(``)
    console.log(`🕐 Sistema de recordatorios automáticos: ACTIVADO (cada 5 minutos)`)
    
    httpServer(+PORT)
}

main().catch(console.error)
