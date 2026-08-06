import 'dotenv/config'

/**
 * Provider de WhatsApp usando la Cloud API oficial de Meta.
 *
 * Reemplaza a wasender.service.ts. La diferencia conceptual clave:
 * los mensajes proactivos (confirmaciones, recordatorios) DEBEN enviarse como
 * plantillas (templates) pre-aprobadas — no como texto libre. El texto libre
 * (sendText) solo funciona dentro de la ventana de 24h posterior a que el
 * paciente nos escriba.
 *
 * Variables de entorno requeridas:
 *   META_PHONE_NUMBER_ID   id del número (test o producción)
 *   META_ACCESS_TOKEN      token permanente (System User)
 *   META_API_VERSION       opcional, default v21.0
 *   META_TEMPLATE_LANG     opcional, default es_AR
 */

const META_API_VERSION = process.env.META_API_VERSION || 'v21.0'
const META_PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID!
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN!
const DEFAULT_LANG = process.env.META_TEMPLATE_LANG || 'es_AR'

interface SendTemplateParams {
    to: string
    template: string
    variables?: (string | number)[]
    languageCode?: string
}

interface SendTextParams {
    to: string
    text: string
}

interface MetaResponse {
    success: boolean
    data?: any
    error?: string
    messageId?: string
}

class MetaWhatsAppService {
    private url: string
    private token: string

    constructor() {
        if (!META_PHONE_NUMBER_ID) {
            throw new Error('META_PHONE_NUMBER_ID no está configurada en las variables de entorno')
        }
        if (!META_ACCESS_TOKEN) {
            throw new Error('META_ACCESS_TOKEN no está configurada en las variables de entorno')
        }

        this.url = `https://graph.facebook.com/${META_API_VERSION}/${META_PHONE_NUMBER_ID}/messages`
        this.token = META_ACCESS_TOKEN

        console.log('✅ Meta WhatsApp Cloud API inicializado')
    }

    /**
     * Normaliza el número al formato que espera Meta: E.164 sin '+'.
     * Ej: "+54 9 11 6678-2051" -> "5491166782051"
     */
    private formatPhoneNumber(telefono: string): string {
        let numero = telefono.replace(/[^0-9]/g, '')

        // Número argentino sin código de país (10 dígitos) -> agregar 549
        if (!numero.startsWith('54') && numero.length === 10) {
            numero = `549${numero}`
        }

        return numero
    }

    /** POST genérico al endpoint de mensajes con manejo de errores uniforme. */
    private async post(payload: any): Promise<MetaResponse> {
        try {
            const response = await fetch(this.url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })

            const data = await response.json()

            if (!response.ok) {
                const msg = data?.error?.message || `Error HTTP ${response.status}`
                console.error('❌ Error en Meta Cloud API:', JSON.stringify(data?.error ?? data))
                return { success: false, error: msg }
            }

            const messageId = data?.messages?.[0]?.id
            console.log(`✅ Mensaje aceptado por Meta (id: ${messageId})`)
            return { success: true, data, messageId }
        } catch (error) {
            console.error('❌ Error enviando a Meta Cloud API:', error)
            return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' }
        }
    }

    /**
     * Envía una plantilla aprobada. Las `variables` mapean en orden a los
     * parámetros {{1}}, {{2}}, ... del body de la plantilla.
     */
    async sendTemplate({ to, template, variables = [], languageCode = DEFAULT_LANG }: SendTemplateParams): Promise<MetaResponse> {
        const numero = this.formatPhoneNumber(to)

        console.log(`📤 Enviando plantilla "${template}" a ${numero}`)

        const payload: any = {
            messaging_product: 'whatsapp',
            to: numero,
            type: 'template',
            template: {
                name: template,
                language: { code: languageCode },
            },
        }

        if (variables.length > 0) {
            payload.template.components = [
                {
                    type: 'body',
                    parameters: variables.map((v) => ({ type: 'text', text: String(v) })),
                },
            ]
        }

        return this.post(payload)
    }

    /**
     * Envía texto libre. SOLO válido dentro de la ventana de 24h posterior a
     * un mensaje del paciente; fuera de ella Meta lo rechaza. Usar para
     * respuestas, no para mensajes proactivos.
     */
    async sendText({ to, text }: SendTextParams): Promise<MetaResponse> {
        const numero = this.formatPhoneNumber(to)

        console.log(`📤 Enviando texto libre a ${numero}`)

        return this.post({
            messaging_product: 'whatsapp',
            to: numero,
            type: 'text',
            text: { body: text, preview_url: false },
        })
    }
}

// Singleton perezoso: NO instanciar al importar, o un import crashea el proceso
// entero cuando faltan las vars de Meta aunque se use WaSender. // ponytail: lazy
let _instance: MetaWhatsAppService | null = null
export const getMetaService = () => (_instance ??= new MetaWhatsAppService())
