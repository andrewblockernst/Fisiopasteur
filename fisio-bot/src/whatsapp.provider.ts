import { waSenderService } from './wasender.service'
import { getMetaService } from './meta.service'

/**
 * Capa de abstracción del proveedor de WhatsApp.
 *
 * Permite alternar entre WaSenderAPI (legacy, texto libre) y la Cloud API de
 * Meta (plantillas) con una env var, sin tocar la lógica de negocio del bot.
 *
 *   WHATSAPP_PROVIDER=wasender   (default) -> envía el `text` tal cual
 *   WHATSAPP_PROVIDER=meta                 -> envía la plantilla si está
 *                                             definida; si no, cae a texto
 *                                             libre (solo válido dentro de la
 *                                             ventana de 24h del paciente)
 *
 * Cada punto de envío provee SIEMPRE `text` (compatibilidad con WaSender) y,
 * cuando corresponde, `template` (lo que usa Meta para mensajes proactivos).
 */

export const PROVIDER = (process.env.WHATSAPP_PROVIDER || 'wasender').toLowerCase()

export interface OutgoingMessage {
    to: string
    /** Texto plano. Lo usa WaSender, y Meta como fallback dentro de la ventana de 24h. */
    text: string
    /** Plantilla aprobada. Lo usa Meta para mensajes proactivos. */
    template?: {
        name: string
        variables: (string | number)[]
        languageCode?: string
    }
    /** URL de media (solo WaSender). */
    media?: string
}

export interface EnvioResult {
    success: boolean
    error?: string
    messageId?: string
    data?: any
}

export async function sendViaProvider(msg: OutgoingMessage): Promise<EnvioResult> {
    if (PROVIDER === 'meta') {
        if (msg.template) {
            return getMetaService().sendTemplate({
                to: msg.to,
                template: msg.template.name,
                variables: msg.template.variables,
                languageCode: msg.template.languageCode,
            })
        }
        // Sin plantilla -> texto libre. Meta solo lo entrega dentro de la
        // ventana de 24h posterior a un mensaje entrante del paciente.
        console.warn(`⚠️ [Meta] Texto libre a ${msg.to} sin plantilla — solo se entrega dentro de la ventana de 24h.`)
        return getMetaService().sendText({ to: msg.to, text: msg.text })
    }

    // WaSender (default): siempre texto.
    return waSenderService.sendMessage({ to: msg.to, text: msg.text, media: msg.media })
}
