/**
 * Script para enviar notificaciones pendientes reales
 * Usa el bot de WhatsApp para enviar mensajes
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const WHATSAPP_BOT_URL = process.env.WHATSAPP_BOT_URL || 'http://localhost:3001';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Variables de entorno requeridas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function formatearTelefono(telefono) {
  if (!telefono) return null;
  
  // Remover espacios, guiones, paréntesis
  let numero = telefono.toString().replace(/[^\d+]/g, '');
  
  // Remover el + inicial si existe
  if (numero.startsWith('+')) {
    numero = numero.substring(1);
  }
  
  // Si no empieza con 54 (Argentina), agregar 549
  if (!numero.startsWith('54') && numero.length === 10) {
    numero = '549' + numero;
  }
  // Si empieza con 54 pero no con 549, agregar el 9
  else if (numero.startsWith('54') && !numero.startsWith('549') && numero.length === 12) {
    numero = '549' + numero.substring(2);
  }
  
  // Agregar @s.whatsapp.net
  return numero + '@s.whatsapp.net';
}

function crearMensajeRecordatorio(turno) {
  const fecha = new Date(turno.fecha);
  const fechaFormateada = fecha.toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const hora = turno.hora.substring(0, 5); // HH:MM
  
  return `🏥 *Recordatorio de Turno - FisioPasteur*

👋 Hola ${turno.paciente.nombre}!

📅 Te recordamos tu turno programado para:
🗓️ **Fecha:** ${fechaFormateada}
🕐 **Hora:** ${hora}
👨‍⚕️ **Especialista:** Dr./Dra. ${turno.especialista.nombre} ${turno.especialista.apellido}
🩺 **Especialidad:** ${turno.especialidad.nombre}

📋 *Importante:*
• Llega 10 minutos antes de tu turno
• Trae tu documentación
• Si necesitas reagendar, contáctanos cuanto antes

¿Podrás asistir a tu turno?
Responde *SI* para confirmar o *NO* si necesitas reprogramar.

¡Te esperamos! 😊`;
}

async function enviarMensajeWhatsApp(telefono, mensaje) {
  try {
    const response = await fetch(`${WHATSAPP_BOT_URL}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: telefono,
        message: mensaje
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function enviarNotificacionesPendientes() {
  console.log('📤 ENVÍO REAL DE NOTIFICACIONES PENDIENTES');
  console.log('='.repeat(60));
  console.log('');
  
  const ahora = new Date();
  console.log('⏰ Hora actual:', ahora.toISOString());
  console.log('🤖 Bot URL:', WHATSAPP_BOT_URL);
  console.log('');
  
  // Obtener notificaciones pendientes
  const { data: notificaciones, error } = await supabase
    .from('notificacion')
    .select(`
      id_notificacion,
      id_turno,
      medio,
      mensaje,
      telefono,
      estado,
      fecha_programada,
      turno:id_turno(
        id_turno,
        fecha,
        hora,
        estado,
        paciente:id_paciente(nombre, apellido, telefono),
        especialista:id_especialista(nombre, apellido),
        especialidad:id_especialidad(nombre)
      )
    `)
    .eq('estado', 'pendiente')
    .lte('fecha_programada', ahora.toISOString())
    .not('id_turno', 'is', null)
    .order('fecha_programada', { ascending: true });
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`📋 Notificaciones válidas encontradas: ${notificaciones?.length || 0}`);
  console.log('');
  
  if (!notificaciones || notificaciones.length === 0) {
    console.log('✅ No hay notificaciones válidas para enviar');
    return;
  }
  
  let enviadas = 0;
  let fallidas = 0;
  
  for (const notif of notificaciones) {
    const turno = notif.turno;
    
    console.log(`📨 Notificación #${notif.id_notificacion}`);
    console.log(`   📱 Para: ${turno.paciente.nombre} ${turno.paciente.apellido}`);
    console.log(`   📞 Tel: ${turno.paciente.telefono}`);
    console.log(`   📅 Turno: ${turno.fecha} ${turno.hora}`);
    console.log(`   👨‍⚕️ ${turno.especialista.nombre} ${turno.especialista.apellido}`);
    console.log('');
    
    // Formatear teléfono
    const telefonoFormateado = formatearTelefono(turno.paciente.telefono);
    if (!telefonoFormateado) {
      console.log('   ❌ Teléfono inválido');
      await supabase
        .from('notificacion')
        .update({ estado: 'fallido' })
        .eq('id_notificacion', notif.id_notificacion);
      fallidas++;
      console.log('');
      continue;
    }
    
    console.log(`   📱 Teléfono formateado: ${telefonoFormateado}`);
    
    // Crear mensaje
    const mensaje = crearMensajeRecordatorio(turno);
    console.log('   💬 Mensaje preparado');
    console.log('');
    
    // Enviar mensaje
    console.log('   📤 Enviando...');
    const resultado = await enviarMensajeWhatsApp(telefonoFormateado, mensaje);
    
    if (resultado.success) {
      console.log('   ✅ MENSAJE ENVIADO EXITOSAMENTE');
      
      // Marcar como enviada
      await supabase
        .from('notificacion')
        .update({ 
          estado: 'enviado',
          fecha_envio: new Date().toISOString()
        })
        .eq('id_notificacion', notif.id_notificacion);
      
      enviadas++;
    } else {
      console.log('   ❌ ERROR AL ENVIAR:', resultado.error);
      
      // Marcar como fallida
      await supabase
        .from('notificacion')
        .update({ estado: 'fallido' })
        .eq('id_notificacion', notif.id_notificacion);
      
      fallidas++;
    }
    
    console.log('');
    console.log('-'.repeat(60));
    console.log('');
    
    // Esperar un poco entre mensajes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('='.repeat(60));
  console.log('📊 RESUMEN FINAL:');
  console.log(`   ✅ Enviadas exitosamente: ${enviadas}`);
  console.log(`   ❌ Fallidas: ${fallidas}`);
  console.log(`   📝 Total procesadas: ${enviadas + fallidas}`);
  console.log('='.repeat(60));
}

// Ejecutar
enviarNotificacionesPendientes()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
