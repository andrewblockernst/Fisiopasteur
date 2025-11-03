/**
 * Script para simular el procesamiento de notificaciones pendientes
 * Muestra qué notificaciones se procesarían sin enviar realmente
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Variables de entorno requeridas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function simularProcesamiento() {
  console.log('🔄 SIMULACIÓN DE PROCESAMIENTO DE RECORDATORIOS');
  console.log('='.repeat(60));
  console.log('');
  
  const ahora = new Date();
  console.log('⏰ Hora actual:', ahora.toISOString());
  console.log('');
  
  // Obtener notificaciones pendientes que deberían enviarse
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
    .order('fecha_programada', { ascending: true });
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log(`📋 Total de notificaciones para procesar: ${notificaciones?.length || 0}`);
  console.log('');
  
  if (!notificaciones || notificaciones.length === 0) {
    console.log('✅ No hay notificaciones pendientes para procesar');
    return;
  }
  
  let procesadas = 0;
  let exitosas = 0;
  let fallidas = 0;
  
  for (const notif of notificaciones) {
    procesadas++;
    console.log(`📨 [${procesadas}/${notificaciones.length}] Notificación #${notif.id_notificacion}`);
    
    // Verificar si tiene turno asociado
    if (!notif.turno || !notif.id_turno) {
      console.log('   ❌ Sin turno asociado → MARCAR COMO FALLIDA');
      fallidas++;
      
      // Marcar como fallida
      const { error: updateError } = await supabase
        .from('notificacion')
        .update({ estado: 'fallido' })
        .eq('id_notificacion', notif.id_notificacion);
      
      if (updateError) {
        console.log('   ⚠️  Error marcando como fallida:', updateError.message);
      }
      console.log('');
      continue;
    }
    
    // Verificar datos del paciente
    const turno = notif.turno;
    if (!turno.paciente || !turno.paciente.telefono) {
      console.log('   ❌ Sin datos de paciente/teléfono → MARCAR COMO FALLIDA');
      fallidas++;
      
      // Marcar como fallida
      await supabase
        .from('notificacion')
        .update({ estado: 'fallido' })
        .eq('id_notificacion', notif.id_notificacion);
      
      console.log('');
      continue;
    }
    
    // Simular envío exitoso
    console.log(`   ✅ ENVIARÍA A: ${turno.paciente.nombre} ${turno.paciente.apellido}`);
    console.log(`   📱 Teléfono: ${turno.paciente.telefono}`);
    console.log(`   📅 Turno: ${turno.fecha} ${turno.hora}`);
    console.log(`   👨‍⚕️ Especialista: ${turno.especialista?.nombre || 'N/A'} ${turno.especialista?.apellido || ''}`);
    console.log(`   🩺 Especialidad: ${turno.especialidad?.nombre || 'N/A'}`);
    console.log('   💬 Mensaje: [RECORDATORIO DE TURNO]');
    console.log('');
    
    exitosas++;
    
    // En producción, aquí se enviaría el mensaje y marcaría como enviada
    // Por ahora solo simulamos
    console.log('   🟡 SIMULACIÓN - No se envía realmente');
    console.log('');
  }
  
  console.log('='.repeat(60));
  console.log('📊 RESUMEN:');
  console.log(`   Total procesadas: ${procesadas}`);
  console.log(`   ✅ Exitosas (se enviarían): ${exitosas}`);
  console.log(`   ❌ Fallidas: ${fallidas}`);
  console.log('='.repeat(60));
}

// Ejecutar
simularProcesamiento()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
