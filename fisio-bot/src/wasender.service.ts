import 'dotenv/config'

const WASENDER_API_KEY = process.env.WASENDER_API_KEY!
const WASENDER_API_URL = process.env.WASENDER_API_URL || 'https://wasenderapi.com/api'
const WASENDER_SESSION_ID = process.env.WASENDER_SESSION_ID || 'default'

interface SendMessageParams {
    to: string
    text: string
    media?: string
}

interface WaSenderResponse {
    success: boolean
    message?: string
    data?: any
    error?: string
}

/**
 * Servicio para enviar mensajes de WhatsApp usando WaSenderAPI
 */
export class WaSenderService {
    private apiKey: string
    private baseUrl: string
    private sessionId: string

    constructor() {
        if (!WASENDER_API_KEY) {
            throw new Error('WASENDER_API_KEY no está configurada en las variables de entorno')
        }
        
        this.apiKey = WASENDER_API_KEY
        this.baseUrl = WASENDER_API_URL
        this.sessionId = WASENDER_SESSION_ID
        
        console.log('✅ WaSenderAPI inicializado')
    }

    /**
     * Formatea el número de teléfono para WhatsApp
     * @param telefono Número de teléfono (puede incluir código de país)
     * @returns Número formateado sin caracteres especiales
     */
    private formatPhoneNumber(telefono: string): string {
        // Remover caracteres especiales y espacios
        let numero = telefono.replace(/[^0-9]/g, '')
        
        // Si no tiene código de país, agregar Argentina (+54)
        if (!numero.startsWith('54') && numero.length === 10) {
            numero = `549${numero}`
        } else if (numero.startsWith('54') && !numero.startsWith('549') && numero.length === 12) {
            // Convertir 5493434687043 a 5493434687043
            numero = numero
        } else if (numero.startsWith('549') && numero.length === 13) {
            numero = numero
        }
        
        console.log(`📱 Número formateado: ${telefono} -> ${numero}`)
        return numero
    }

    /**
     * Envía un mensaje de texto por WhatsApp
     * @param params Parámetros del mensaje (to, text, media opcional)
     * @returns Respuesta de la API
     */
    async sendMessage(params: SendMessageParams): Promise<WaSenderResponse> {
        try {
            const numeroFormateado = this.formatPhoneNumber(params.to)
            
            console.log(`📤 Enviando mensaje a ${numeroFormateado}`)
            console.log(`💬 Texto: ${params.text.substring(0, 50)}...`)
            
            const payload: any = {
                session: this.sessionId,
                to: numeroFormateado,
                text: params.text
            }
            
            // Si hay media (imagen, documento, etc.), agregarla
            if (params.media) {
                payload.media = params.media
            }
            
            const response = await fetch(`${this.baseUrl}/send-message`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            
            const data = await response.json()
            
            if (!response.ok) {
                console.error(`❌ Error en WaSenderAPI:`, data)
                return {
                    success: false,
                    error: data.message || `Error HTTP ${response.status}`
                }
            }
            
            console.log(`✅ Mensaje enviado exitosamente a ${numeroFormateado}`)
            return {
                success: true,
                data: data
            }
            
        } catch (error) {
            console.error(`❌ Error enviando mensaje:`, error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Error desconocido'
            }
        }
    }

    /**
     * Verifica el estado de la sesión de WhatsApp
     * @returns Estado de la sesión
     */
    async getSessionStatus(): Promise<WaSenderResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/sessions/${this.sessionId}/status`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            })
            
            const data = await response.json()
            
            if (!response.ok) {
                return {
                    success: false,
                    error: data.message || `Error HTTP ${response.status}`
                }
            }
            
            return {
                success: true,
                data: data
            }
            
        } catch (error) {
            console.error(`❌ Error obteniendo estado de sesión:`, error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Error desconocido'
            }
        }
    }

    /**
     * Obtiene el código QR para vincular WhatsApp (si es necesario)
     * @returns QR code o estado de la sesión
     */
    async getQRCode(): Promise<WaSenderResponse> {
        try {
            const response = await fetch(`${this.baseUrl}/sessions/${this.sessionId}/qr`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            })
            
            const data = await response.json()
            
            if (!response.ok) {
                return {
                    success: false,
                    error: data.message || `Error HTTP ${response.status}`
                }
            }
            
            return {
                success: true,
                data: data
            }
            
        } catch (error) {
            console.error(`❌ Error obteniendo QR:`, error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Error desconocido'
            }
        }
    }
}

// Exportar instancia singleton
export const waSenderService = new WaSenderService()
