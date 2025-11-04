/**
 * Script para actualizar roles específicos de usuarios en Fisiopasteur
 * 
 * Ejecutar desde terminal:
 * npx tsx scripts/actualizar-roles-especificos.ts
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

// Definir los cambios de roles
const CAMBIOS_ROLES = [
  { email: 'marlenelavooy@hotmail.com', id_rol: 1, rol_nombre: 'Admin' },
  { email: 'andrewblockernst@gmail.com', id_rol: 3, rol_nombre: 'Programador' },
  { email: 'ordonez.sand3@gmail.com', id_rol: 3, rol_nombre: 'Programador' },
  { email: 'santibaezagraf@gmail.com', id_rol: 3, rol_nombre: 'Programador' },
  { email: 'ufrancoezequiel@gmail.com', id_rol: 3, rol_nombre: 'Programador' }
];

async function main() {
  console.log('🔧 ACTUALIZACIÓN DE ROLES ESPECÍFICOS\n');
  console.log('='.repeat(60));

  // 1. Verificar organización Fisiopasteur
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

  // 2. Actualizar cada usuario
  console.log('\n🔄 Actualizando roles...\n');
  console.log('-'.repeat(60));

  let exitosos = 0;
  let errores = 0;

  for (const cambio of CAMBIOS_ROLES) {
    // Buscar el usuario por email
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuario')
      .select('id_usuario, nombre, apellido')
      .eq('email', cambio.email)
      .single();

    if (usuarioError || !usuario) {
      console.log(`❌ ${cambio.email} - NO ENCONTRADO`);
      errores++;
      continue;
    }

    // Actualizar el rol en usuario_organizacion
    const { error: updateError } = await supabase
      .from('usuario_organizacion')
      .update({ id_rol: cambio.id_rol })
      .eq('id_usuario', usuario.id_usuario)
      .eq('id_organizacion', org.id_organizacion);

    if (updateError) {
      console.log(`❌ ${cambio.email} - ERROR: ${updateError.message}`);
      errores++;
    } else {
      console.log(`✅ ${cambio.email} → ${cambio.rol_nombre}`);
      console.log(`   ${usuario.nombre} ${usuario.apellido} (id_rol=${cambio.id_rol})`);
      exitosos++;
    }
  }

  // 3. Resumen final
  console.log('\n' + '='.repeat(60));
  console.log('✅ ACTUALIZACIÓN COMPLETADA');
  console.log('='.repeat(60));
  console.log(`\n📊 Resultados:`);
  console.log(`   ✅ Roles actualizados exitosamente: ${exitosos}`);
  console.log(`   ❌ Errores: ${errores}`);
  console.log(`   📝 Total procesado: ${CAMBIOS_ROLES.length}`);

  // 4. Verificar roles finales
  console.log('\n📋 Verificando roles finales de usuarios específicos...\n');
  
  for (const cambio of CAMBIOS_ROLES) {
    const { data: verificacion } = await supabase
      .from('usuario')
      .select(`
        nombre,
        apellido,
        email,
        usuario_organizacion!inner(
          rol:id_rol(nombre)
        )
      `)
      .eq('email', cambio.email)
      .eq('usuario_organizacion.id_organizacion', org.id_organizacion)
      .single();

    if (verificacion) {
      const rolActual = verificacion.usuario_organizacion[0]?.rol?.nombre || 'Desconocido';
      console.log(`   ${verificacion.nombre} ${verificacion.apellido}: ${rolActual}`);
    }
  }

  console.log('\n💡 Roles configurados correctamente!\n');
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
