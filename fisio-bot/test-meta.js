/**
 * Prueba de credenciales de Meta WhatsApp Cloud API contra el número de TEST.
 *
 * Envía la plantilla precargada "hello_world" (no requiere aprobación) al
 * número destino que le pases. Sirve para confirmar que el token + IDs +
 * endpoint funcionan, antes de tocar el código del bot o crear plantillas.
 *
 * Requisitos:
 *   1. En .env: META_PHONE_NUMBER_ID, META_ACCESS_TOKEN (y opcional META_API_VERSION)
 *   2. El número destino debe estar agregado como "recipient" verificado
 *      en el panel de Meta (WhatsApp > API Setup) — el número de test solo
 *      envía a destinatarios verificados.
 *
 * Uso:
 *   node test-meta.js 5491166782051
 */

import 'dotenv/config'

const VERSION = process.env.META_API_VERSION || 'v21.0'
const PHONE_ID = process.env.META_PHONE_NUMBER_ID
const TOKEN = process.env.META_ACCESS_TOKEN
const TO = process.argv[2]

if (!PHONE_ID || !TOKEN) {
    console.error('❌ Falta META_PHONE_NUMBER_ID o META_ACCESS_TOKEN en .env')
    process.exit(1)
}

if (!TO) {
    console.error('❌ Uso: node test-meta.js <numero_destino_verificado>')
    console.error('   Ej: node test-meta.js 5491166782051')
    process.exit(1)
}

const url = `https://graph.facebook.com/${VERSION}/${PHONE_ID}/messages`

console.log('📤 Enviando plantilla "hello_world"')
console.log(`   Endpoint: ${url}`)
console.log(`   Destino:  ${TO}`)
console.log('')

const response = await fetch(url, {
    method: 'POST',
    headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: TO,
        type: 'template',
        template: { name: 'hello_world', language: { code: 'en_US' } },
    }),
})

const data = await response.json()

if (response.ok) {
    console.log('✅ Mensaje aceptado por Meta')
    console.log(`   messageId: ${data?.messages?.[0]?.id}`)
    console.log('   Revisá el WhatsApp del número destino.')
} else {
    console.error(`❌ Error HTTP ${response.status}`)
    console.error(JSON.stringify(data?.error ?? data, null, 2))
    process.exit(1)
}
