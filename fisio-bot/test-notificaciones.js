/**
 * Script de prueba para verificar notificaciones pendientes
 * Usa las variables de entorno del bot
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Variables de entorno SUPABASE_URL y SUPABASE_ANON_KEY son requeridas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verificarNotificaciones() {
  console.log('🔍 VERIFICACIÓN DE NOTIFICACIONES PENDIENTES');
  console.log('='.repeat(60));
  console.log('');
  
  const ahora = new Date();
  console.log('⏰ Fecha/hora actual:', ahora.toISOString());
  console.log('');
  
  // 1. Contar todas las notificaciones
  console.log('📊 CONTEO DE NOTIFICACIONES');
  console.log('-'.repeat(60));
  
  const { data: todas, error: errorTodas } = await supabase
    .from('notificacion')
    .select('estado', { count: 'exact', head: false });
  
  if (errorTodas) {
    console.error('❌ Error:', errorTodas);
  } else {
    console.log(`Total de notificaciones: ${todas?.length || 0}`);
    
    const porEstado = todas?.reduce((acc, n) => {
      acc[n.estado] = (acc[n.estado] || 0) + 1;
      return acc;
    }, {});
    
    console.log('Por estado:', porEstado);
  }
  console.log('');
  
  // 2. Ver notificaciones pendientes
  console.log('⏳ NOTIFICACIONES PENDIENTES');
  console.log('-'.repeat(60));
  
  const { data: pendientes, error: errorPendientes } = await supabase
    .from('notificacion')
    .select(`
      id_notificacion,
      id_turno,
      medio,
      estado,
      fecha_programada,
      id_organizacion,
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
    .order('fecha_programada', { ascending: true });
  
  if (errorPendientes) {
    console.error('❌ Error obteniendo pendientes:', errorPendientes);
  } else {
    console.log(`Total pendientes: ${pendientes?.length || 0}`);
    console.log('');
    
    if (pendientes && pendientes.length > 0) {
      pendientes.forEach((n, idx) => {
        const fechaProgramada = new Date(n.fecha_programada);
        const esPasada = fechaProgramada <= ahora;
        const diferencia = Math.floor((fechaProgramada - ahora) / 60000); // minutos
        
        console.log(`${idx + 1}. Notificación #${n.id_notificacion}`);
        console.log(`   Turno: #${n.id_turno} - ${n.turno?.fecha || 'N/A'} ${n.turno?.hora || 'N/A'}`);
        console.log(`   Paciente: ${n.turno?.paciente?.nombre || 'N/A'} ${n.turno?.paciente?.apellido || 'N/A'}`);
        console.log(`   Teléfono: ${n.turno?.paciente?.telefono || 'N/A'}`);
        console.log(`   Especialista: ${n.turno?.especialista?.nombre || 'N/A'} ${n.turno?.especialista?.apellido || 'N/A'}`);
        console.log(`   Especialidad: ${n.turno?.especialidad?.nombre || 'N/A'}`);
        console.log(`   Programada para: ${fechaProgramada.toISOString()}`);
        console.log(`   ¿Es pasada?: ${esPasada ? '✅ SÍ (debería enviarse)' : '❌ NO (futura)'}`);
        console.log(`   Diferencia: ${diferencia} minutos ${esPasada ? '(atrasada)' : '(adelante)'}`);
        console.log(`   Organización: ${n.id_organizacion || 'N/A'}`);
        console.log('');
      });
    }
  }
  
  // 3. Ver notificaciones que deberían enviarse AHORA
  console.log('🚀 NOTIFICACIONES QUE DEBERÍAN ENVIARSE AHORA');
  console.log('-'.repeat(60));
  
  const { data: paraEnviar, error: errorParaEnviar } = await supabase
    .from('notificacion')
    .select(`
      id_notificacion,
      id_turno,
      fecha_programada,
      turno:id_turno(
        fecha,
        hora,
        paciente:id_paciente(nombre, apellido, telefono)
      )
    `)
    .eq('estado', 'pendiente')
    .lte('fecha_programada', ahora.toISOString());
  
  if (errorParaEnviar) {
    console.error('❌ Error:', errorParaEnviar);
  } else {
    console.log(`Total que deberían enviarse: ${paraEnviar?.length || 0}`);
    
    if (paraEnviar && paraEnviar.length > 0) {
      paraEnviar.forEach((n, idx) => {
        console.log(`${idx + 1}. Notif #${n.id_notificacion} - Turno #${n.id_turno}`);
        console.log(`   Para: ${n.turno?.paciente?.nombre} ${n.turno?.paciente?.apellido}`);
        console.log(`   Tel: ${n.turno?.paciente?.telefono}`);
        console.log(`   Programada: ${n.fecha_programada}`);
      });
    }
  }
  console.log('');
  
  // 4. Ver últimas notificaciones enviadas
  console.log('✅ ÚLTIMAS NOTIFICACIONES ENVIADAS');
  console.log('-'.repeat(60));
  
  const { data: enviadas, error: errorEnviadas } = await supabase
    .from('notificacion')
    .select('id_notificacion, id_turno, fecha_programada, fecha_envio')
    .eq('estado', 'enviado')
    .order('fecha_envio', { ascending: false })
    .limit(5);
  
  if (errorEnviadas) {
    console.error('❌ Error:', errorEnviadas);
  } else {
    console.log(`Total enviadas: ${enviadas?.length || 0} (mostrando últimas 5)`);
    
    if (enviadas && enviadas.length > 0) {
      enviadas.forEach((n, idx) => {
        console.log(`${idx + 1}. Notif #${n.id_notificacion} - Turno #${n.id_turno}`);
        console.log(`   Programada: ${n.fecha_programada}`);
        console.log(`   Enviada: ${n.fecha_envio || 'N/A'}`);
      });
    }
  }
  console.log('');
  
  console.log('='.repeat(60));
  console.log('✅ Verificación completada');
}

// Ejecutar
verificarNotificaciones()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
