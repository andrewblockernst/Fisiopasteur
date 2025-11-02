/**
 * Script para vincular TODOS los usuarios existentes a Fisiopasteur
 * 
 * Ejecutar desde terminal:
 * npx tsx scripts/vincular-todos-fisiopasteur.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Cargar variables de entorno desde fisiopasteur/.env.local
const envPath = path.join(__dirname, '../fisiopasteur/.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ Variables de entorno cargadas desde .env.local\n');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔗 VINCULACIÓN MASIVA - TODOS LOS USUARIOS A FISIOPASTEUR\n');
  console.log('='.repeat(60));

  // 1. Buscar organización Fisiopasteur
  console.log('\n📋 Paso 1: Verificando organización Fisiopasteur...');
  const { data: org, error: orgError } = await supabase
    .from('organizacion')
    .select('id_organizacion, nombre')
    .eq('nombre', 'Fisiopasteur')
    .single();

  if (orgError || !org) {
    console.error('❌ No se encontró la organización Fisiopasteur');
    process.exit(1);
  }

  console.log(`✅ Organización encontrada: ${org.nombre}`);
  console.log(`   ID: ${org.id_organizacion}`);

  // 2. Obtener todos los usuarios
  console.log('\n📋 Paso 2: Obteniendo todos los usuarios...');
  const { data: usuarios, error: usuariosError } = await supabase
    .from('usuario')
    .select('id_usuario, email, nombre, apellido')
    .order('email');

  if (usuariosError || !usuarios || usuarios.length === 0) {
    console.error('❌ No se encontraron usuarios');
    process.exit(1);
  }

  console.log(`✅ Se encontraron ${usuarios.length} usuarios\n`);

  // 3. Verificar cuántos ya están vinculados
  const { data: vinculosExistentes } = await supabase
    .from('usuario_organizacion')
    .select('id_usuario')
    .eq('id_organizacion', org.id_organizacion);

  const idsVinculados = new Set(vinculosExistentes?.map(v => v.id_usuario) || []);

  console.log('📊 Resumen:');
  console.log(`   Total de usuarios: ${usuarios.length}`);
  console.log(`   Ya vinculados: ${idsVinculados.size}`);
  console.log(`   Por vincular: ${usuarios.length - idsVinculados.size}\n`);

  // 4. Vincular cada usuario
  let vinculadosNuevos = 0;
  let actualizados = 0;
  let errores = 0;

  console.log('🔄 Vinculando usuarios...\n');
  console.log('-'.repeat(60));

  for (const usuario of usuarios) {
    const yaVinculado = idsVinculados.has(usuario.id_usuario);
    const status = yaVinculado ? '↻' : '✓';
    
    // Vincular o actualizar
    const { error: vinculoError } = await supabase
      .from('usuario_organizacion')
      .upsert({
        id_usuario: usuario.id_usuario,
        id_organizacion: org.id_organizacion,
        id_rol: 2, // Rol Especialista por defecto (el admin se puede cambiar manualmente)
        activo: true,
        color_calendario: '#3b82f6' // Azul por defecto
      }, {
        onConflict: 'id_usuario,id_organizacion'
      });

    if (vinculoError) {
      console.log(`❌ ${usuario.email} - ERROR: ${vinculoError.message}`);
      errores++;
    } else {
      if (yaVinculado) {
        console.log(`${status} ${usuario.email} - ${usuario.nombre} ${usuario.apellido} [YA VINCULADO]`);
        actualizados++;
      } else {
        console.log(`${status} ${usuario.email} - ${usuario.nombre} ${usuario.apellido} [NUEVO]`);
        vinculadosNuevos++;
      }
    }
  }

  // 5. Resumen final
  console.log('\n' + '='.repeat(60));
  console.log('✅ PROCESO COMPLETADO');
  console.log('='.repeat(60));
  console.log(`\n📊 Resultados:`);
  console.log(`   ✅ Nuevos vínculos creados: ${vinculadosNuevos}`);
  console.log(`   ↻  Vínculos ya existentes: ${actualizados}`);
  console.log(`   ❌ Errores: ${errores}`);
  console.log(`   📝 Total procesado: ${usuarios.length}`);

  // 6. Verificar resultado final
  console.log('\n📋 Verificando vínculos finales...');
  const { data: vinculosFinales, error: verificacionError } = await supabase
    .from('usuario_organizacion')
    .select(`
      usuario:id_usuario(email, nombre, apellido),
      rol:id_rol(nombre)
    `)
    .eq('id_organizacion', org.id_organizacion)
    .order('usuario(email)');

  if (verificacionError) {
    console.error('❌ Error verificando vínculos:', verificacionError);
  } else {
    console.log(`\n✅ Total de usuarios vinculados a Fisiopasteur: ${vinculosFinales?.length || 0}`);
  }

  console.log('\n💡 Nota: Todos los usuarios fueron vinculados como "Especialista"');
  console.log('   Si necesitas cambiar alguno a "Admin", usa el script:');
  console.log('   npx tsx scripts/vincular-usuario-fisiopasteur.ts\n');
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
