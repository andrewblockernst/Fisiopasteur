import 'dotenv/config'
import { supabase } from '../src/supabase.client'
import { waSenderService } from '../src/wasender.service'

// Script de un solo uso: manda UNA disculpa a cada persona cuyo turno ya ocurrió
// durante la caída del bot y no recibió su recordatorio/confirmación (notif
// fallidas desde el 04-08, turno ya pasado). Los turnos futuros NO se tocan: el
// bot les manda el recordatorio/confirmación normal cuando corresponda.
//   npx tsx scripts/reenviar-disculpa.ts        -> dry-run (no envía, solo lista)
//   SEND=1 npx tsx scripts/reenviar-disculpa.ts -> envía de verdad
// ponytail: script efímero, borrar tras usar.

// 👉 TEXTO DE DISCULPA (se envía solo, sin el mensaje original: el turno ya pasó).
const DISCULPA = `
Hola, soy la secretaria virtual de Fisiopasteur.
Nos disculpamos por las molestias que puedas haber tenido. Hubo un inconveniente técnico con nuestro sistema de recordatorios que afectó la comunicación en los últimos días.

Ya hemos solucionado el inconveniente y estamos trabajando para asegurar que todas las notificaciones se entreguen correctamente.

💪 Desde ya muchas gracias.`

const DRY_RUN = process.env.SEND !== '1'
const DESDE = '2026-08-04T00:00:00Z'
const SEND_INTERVAL_MS = 6000 // WaSender Account Protection: 1 msg / 5s

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))
const normTel = (t: string) => t.replace(/\D/g, '')

async function main() {
    const texto = DISCULPA.trim()

    const { data, error } = await supabase
        .from('notificacion')
        .select('id_notificacion, telefono, turno:id_turno(fecha, hora, estado, paciente:id_paciente(telefono))')
        .eq('estado', 'fallido')
        .gte('fecha_programada', DESDE)
        .order('fecha_programada', { ascending: true })

    if (error) { console.error('❌ Supabase:', error.message); process.exit(1) }

    const now = new Date()
    const rows = (data ?? []) as any[]

    // Solo turnos que YA pasaron, no cancelados/eliminados. Los futuros los maneja el bot.
    const pasados = rows.filter(r => {
        const t = r.turno
        if (!t?.fecha) return false
        if (t.estado === 'cancelado' || t.estado === 'eliminado') return false
        return new Date(`${t.fecha}T${t.hora || '00:00:00'}`) <= now
    })

    // Deduplicar por teléfono: una sola disculpa por persona, aunque tenga varios turnos.
    const porPersona = new Map<string, { to: string; ids: number[] }>()
    for (const r of pasados) {
        const to: string = r.telefono || r.turno?.paciente?.telefono || ''
        if (!to) { console.warn(`⚠️ notif ${r.id_notificacion} sin teléfono, salteada`); continue }
        const key = normTel(to)
        const e = porPersona.get(key) ?? { to, ids: [] }
        e.ids.push(r.id_notificacion)
        porPersona.set(key, e)
    }

    const personas = [...porPersona.values()]
    console.log(`📋 ${personas.length} personas (de ${pasados.length} notif pasadas) — ${DRY_RUN ? 'DRY-RUN' : 'ENVÍO REAL'}\n`)

    let ok = 0, fail = 0
    for (let i = 0; i < personas.length; i++) {
        const { to, ids } = personas[i]
        console.log(`📤 [${i + 1}/${personas.length}] ${to} (notif ${ids.join(',')})`)
        if (DRY_RUN) { ok++; continue }

        const envio = await waSenderService.sendMessage({ to, text: texto })
        if (envio.success) {
            await supabase.from('notificacion').update({ estado: 'enviado' }).in('id_notificacion', ids)
            console.log(`✅ enviado y ${ids.length} notif marcadas`); ok++
        } else {
            console.error(`❌ falló: ${(envio as any).error} — quedan en 'fallido'`); fail++
        }
        if (i < personas.length - 1) await delay(SEND_INTERVAL_MS)
    }

    console.log(`\n✨ Listo: ${ok} ${DRY_RUN ? 'a enviar' : 'enviadas'}, ${fail} fallidas`)
    process.exit(0)
}

main()
