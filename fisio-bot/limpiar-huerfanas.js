/**
 * Script para limpiar notificaciones huérfanas (sin turno asociado)
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

async function limpiarNotificacionesHuerfanas() {
  console.log('🧹 LIMPIEZA DE NOTIFICACIONES HUÉRFANAS');
  console.log('='.repeat(60));
  console.log('');
  
  // 1. Encontrar notificaciones con id_turno null
  console.log('🔍 Buscando notificaciones huérfanas...');
  
  const { data: huerfanas, error: errorBusqueda } = await supabase
    .from('notificacion')
    .select('id_notificacion, id_turno, estado, fecha_programada')
    .is('id_turno', null);
  
  if (errorBusqueda) {
    console.error('❌ Error buscando notificaciones huérfanas:', errorBusqueda);
    return;
  }
  
  if (!huerfanas || huerfanas.length === 0) {
    console.log('✅ No hay notificaciones huérfanas');
    return;
  }
  
  console.log(`📊 Encontradas ${huerfanas.length} notificaciones huérfanas`);
  console.log('');
  
  // Agrupar por estado
  const porEstado = huerfanas.reduce((acc, n) => {
    acc[n.estado] = (acc[n.estado] || 0) + 1;
    return acc;
  }, {});
  
  console.log('Por estado:', porEstado);
  console.log('');
  
  // 2. Marcar pendientes como fallidas
  const pendientes = huerfanas.filter(n => n.estado === 'pendiente');
  
  if (pendientes.length > 0) {
    console.log(`🔄 Marcando ${pendientes.length} notificaciones pendientes como fallidas...`);
    
    const ids = pendientes.map(n => n.id_notificacion);
    
    const { error: errorUpdate } = await supabase
      .from('notificacion')
      .update({ estado: 'fallido' })
      .in('id_notificacion', ids);
    
    if (errorUpdate) {
      console.error('❌ Error actualizando notificaciones:', errorUpdate);
    } else {
      console.log('✅ Notificaciones marcadas como fallidas');
    }
  } else {
    console.log('ℹ️ No hay notificaciones pendientes huérfanas para marcar como fallidas');
  }
  
  console.log('');
  
  // 3. Opcional: Eliminar notificaciones muy antiguas
  console.log('🗑️ LIMPIEZA DE NOTIFICACIONES ANTIGUAS');
  console.log('-'.repeat(60));
  
  // Notificaciones de más de 30 días
  const hace30Dias = new Date();
  hace30Dias.setDate(hace30Dias.getDate() - 30);
  
  const { data: antiguas, error: errorAntiguas } = await supabase
    .from('notificacion')
    .select('id_notificacion, fecha_programada, estado')
    .is('id_turno', null)
    .lt('fecha_programada', hace30Dias.toISOString());
  
  if (errorAntiguas) {
    console.error('❌ Error buscando notificaciones antiguas:', errorAntiguas);
  } else if (antiguas && antiguas.length > 0) {
    console.log(`📊 Encontradas ${antiguas.length} notificaciones huérfanas de más de 30 días`);
    console.log('');
    console.log('⚠️  ADVERTENCIA: Estas notificaciones podrían eliminarse para limpiar la base de datos');
    console.log('Para eliminarlas, descomenta la sección de eliminación en el script');
    console.log('');
    
    // Descomenta esto para eliminar:
    /*
    console.log('🗑️ Eliminando notificaciones antiguas...');
    const idsAntiguas = antiguas.map(n => n.id_notificacion);
    
    const { error: errorDelete } = await supabase
      .from('notificacion')
      .delete()
      .in('id_notificacion', idsAntiguas);
    
    if (errorDelete) {
      console.error('❌ Error eliminando notificaciones:', errorDelete);
    } else {
      console.log(`✅ ${antiguas.length} notificaciones antiguas eliminadas`);
    }
    */
  } else {
    console.log('✅ No hay notificaciones antiguas para limpiar');
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log('✅ Limpieza completada');
}

// Ejecutar
limpiarNotificacionesHuerfanas()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
