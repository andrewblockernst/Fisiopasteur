/**
 * Script para verificar recordatorios en la base de datos
 * Ejecutar con: node test-recordatorios-db.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarRecordatorios() {
  console.log('🔍 Verificando recordatorios en la base de datos...\n');
  
  try {
    // 1. Obtener último turno creado
    const { data: ultimoTurno, error: errorTurno } = await supabase
      .from('turno')
      .select('id_turno, fecha, hora, estado, created_at, paciente:id_paciente(nombre, apellido, telefono)')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (errorTurno) {
      console.error('❌ Error obteniendo último turno:', errorTurno.message);
      return;
    }
    
    console.log('📋 Último turno creado:');
    console.log(`   ID: ${ultimoTurno.id_turno}`);
    console.log(`   Fecha/Hora: ${ultimoTurno.fecha} ${ultimoTurno.hora}`);
    console.log(`   Estado: ${ultimoTurno.estado}`);
    console.log(`   Paciente: ${ultimoTurno.paciente?.nombre} ${ultimoTurno.paciente?.apellido}`);
    console.log(`   Teléfono: ${ultimoTurno.paciente?.telefono}`);
    console.log(`   Creado: ${new Date(ultimoTurno.created_at).toLocaleString('es-AR')}`);
    
    // 2. Buscar notificaciones asociadas a este turno
    const { data: notificaciones, error: errorNotif } = await supabase
      .from('notificacion')
      .select('*')
      .eq('id_turno', ultimoTurno.id_turno)
      .order('fecha_programada', { ascending: true });
    
    if (errorNotif) {
      console.error('❌ Error obteniendo notificaciones:', errorNotif.message);
      return;
    }
    
    console.log(`\n📬 Notificaciones encontradas: ${notificaciones?.length || 0}`);
    
    if (!notificaciones || notificaciones.length === 0) {
      console.log('⚠️  NO HAY NOTIFICACIONES para este turno');
      console.log('\n🔍 Posibles causas:');
      console.log('   1. El turno fue creado muy cerca de la hora (recordatorios ya pasaron)');
      console.log('   2. Hubo un error al guardar las notificaciones');
      console.log('   3. El código de recordatorios no se ejecutó');
      return;
    }
    
    // Separar confirmación de recordatorios
    const confirmacion = notificaciones.find(n => !n.mensaje.includes('RECORDATORIO'));
    const recordatorios = notificaciones.filter(n => n.mensaje.includes('RECORDATORIO'));
    
    if (confirmacion) {
      console.log('\n✅ Confirmación:');
      console.log(`   Estado: ${confirmacion.estado}`);
      console.log(`   Mensaje: ${confirmacion.mensaje.substring(0, 60)}...`);
      console.log(`   Fecha envío: ${confirmacion.fecha_envio ? new Date(confirmacion.fecha_envio).toLocaleString('es-AR') : 'No enviado'}`);
    }
    
    if (recordatorios.length > 0) {
      console.log(`\n🔔 Recordatorios: ${recordatorios.length}`);
      recordatorios.forEach((rec, idx) => {
        const tipo = rec.mensaje.match(/\[RECORDATORIO (.*?)\]/)?.[1] || 'desconocido';
        const fechaProgramada = new Date(rec.fecha_programada);
        const ahora = new Date();
        const diff = fechaProgramada.getTime() - ahora.getTime();
        const minutos = Math.round(diff / (60 * 1000));
        
        console.log(`\n   ${idx + 1}. Recordatorio ${tipo}:`);
        console.log(`      Estado: ${rec.estado}`);
        console.log(`      Programado para: ${fechaProgramada.toLocaleString('es-AR')}`);
        console.log(`      Tiempo restante: ${minutos > 0 ? `${minutos} minutos` : `PASADO (hace ${Math.abs(minutos)} minutos)`}`);
        console.log(`      Fecha envío: ${rec.fecha_envio ? new Date(rec.fecha_envio).toLocaleString('es-AR') : 'Pendiente'}`);
      });
    } else {
      console.log('\n⚠️  NO HAY RECORDATORIOS programados');
      console.log('   Solo se guardó la confirmación, pero no los recordatorios');
    }
    
    // 3. Verificar recordatorios pendientes en general
    console.log('\n\n🔍 Verificando TODOS los recordatorios pendientes en el sistema:');
    const { data: pendientes, error: errorPendientes } = await supabase
      .from('notificacion')
      .select('id_notificacion, id_turno, mensaje, fecha_programada, estado')
      .eq('estado', 'pendiente')
      .like('mensaje', '%RECORDATORIO%')
      .order('fecha_programada', { ascending: true })
      .limit(10);
    
    if (errorPendientes) {
      console.error('❌ Error:', errorPendientes.message);
    } else {
      console.log(`   Total pendientes: ${pendientes?.length || 0}`);
      pendientes?.forEach((p, idx) => {
        const tipo = p.mensaje.match(/\[RECORDATORIO (.*?)\]/)?.[1] || 'desconocido';
        const fechaProgramada = new Date(p.fecha_programada);
        const ahora = new Date();
        const minutos = Math.round((fechaProgramada.getTime() - ahora.getTime()) / (60 * 1000));
        
        console.log(`   ${idx + 1}. Turno ${p.id_turno} - ${tipo} - ${minutos > 0 ? `en ${minutos} min` : `VENCIDO (${Math.abs(minutos)} min)`}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
  }
}

verificarRecordatorios().then(() => {
  console.log('\n✅ Verificación completada');
  process.exit(0);
});
