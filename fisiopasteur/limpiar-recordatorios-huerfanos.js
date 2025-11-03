/**
 * Script para limpiar recordatorios huérfanos (sin turno asociado)
 * Ejecutar con: node limpiar-recordatorios-huerfanos.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function limpiarHuerfanos() {
  console.log('🧹 Buscando recordatorios huérfanos...\n');
  
  try {
    // 1. Encontrar notificaciones con id_turno null o turno eliminado
    const { data: huerfanos, error } = await supabase
      .from('notificacion')
      .select('id_notificacion, id_turno, mensaje, estado, fecha_programada')
      .is('id_turno', null)
      .eq('estado', 'pendiente');
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    if (!huerfanos || huerfanos.length === 0) {
      console.log('✅ No hay recordatorios huérfanos con id_turno = null');
      return;
    }
    
    console.log(`⚠️  Encontrados ${huerfanos.length} recordatorios huérfanos:`);
    huerfanos.forEach((h, idx) => {
      const tipo = h.mensaje?.match(/\[RECORDATORIO (.*?)\]/)?.[1] || 'desconocido';
      console.log(`   ${idx + 1}. ID ${h.id_notificacion} - ${tipo} - ${h.fecha_programada}`);
    });
    
    console.log('\n🗑️  Marcando como fallidos...');
    
    const { error: updateError } = await supabase
      .from('notificacion')
      .update({ estado: 'fallido' })
      .is('id_turno', null)
      .eq('estado', 'pendiente');
    
    if (updateError) {
      console.error('❌ Error actualizando:', updateError.message);
      return;
    }
    
    console.log(`✅ ${huerfanos.length} recordatorios huérfanos marcados como fallidos`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

limpiarHuerfanos().then(() => {
  console.log('\n✅ Limpieza completada');
  process.exit(0);
});
