/**
 * Script para vincular usuario dueño con organización Fisiopasteur
 * 
 * Ejecutar desde terminal:
 * npx tsx scripts/vincular-usuario-fisiopasteur.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Cargar variables de entorno desde fisiopasteur/.env.local
const envPath = path.join(__dirname, '../fisiopasteur/.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ Variables de entorno cargadas desde .env.local');
} else {
  console.log('⚠️  No se encontró .env.local, usando variables de entorno del sistema');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n🔗 VINCULAR USUARIO CON ORGANIZACIÓN FISIOPASTEUR\n');

  // 1. Buscar organización Fisiopasteur
  console.log('📋 Paso 1: Buscando organización Fisiopasteur...');
  const { data: org, error: orgError } = await supabase
    .from('organizacion')
    .select('id_organizacion, nombre, activo')
    .eq('nombre', 'Fisiopasteur')
    .single();

  if (orgError || !org) {
    console.error('❌ Error: No se encontró la organización Fisiopasteur');
    console.error('   Primero ejecuta: npm run seed:organizations');
    process.exit(1);
  }

  console.log(`✅ Organización encontrada: ${org.nombre} (ID: ${org.id_organizacion})`);

  // 2. Listar usuarios disponibles
  console.log('\n📋 Paso 2: Listando usuarios disponibles...');
  const { data: usuarios, error: usuariosError } = await supabase
    .from('usuario')
    .select('id_usuario, email, nombre, apellido')
    .order('email');

  if (usuariosError || !usuarios || usuarios.length === 0) {
    console.error('❌ Error: No se encontraron usuarios');
    process.exit(1);
  }

  console.log('\n📋 Usuarios disponibles:');
  usuarios.forEach((u, index) => {
    console.log(`   ${index + 1}. ${u.email} - ${u.nombre} ${u.apellido} (ID: ${u.id_usuario})`);
  });

  // 3. Seleccionar usuario
  const userIndex = await question('\n❓ Selecciona el número del usuario a vincular (1-' + usuarios.length + '): ');
  const selectedUser = usuarios[parseInt(userIndex) - 1];

  if (!selectedUser) {
    console.error('❌ Selección inválida');
    process.exit(1);
  }

  console.log(`\n✅ Usuario seleccionado: ${selectedUser.email}`);

  // 4. Verificar si ya está vinculado
  const { data: existingLink } = await supabase
    .from('usuario_organizacion')
    .select('*')
    .eq('id_usuario', selectedUser.id_usuario)
    .eq('id_organizacion', org.id_organizacion)
    .single();

  if (existingLink) {
    console.log('⚠️  El usuario ya está vinculado a esta organización');
    const overwrite = await question('❓ ¿Deseas actualizar el vínculo? (s/n): ');
    if (overwrite.toLowerCase() !== 's') {
      console.log('❌ Operación cancelada');
      process.exit(0);
    }
  }

  // 5. Seleccionar rol
  console.log('\n📋 Roles disponibles:');
  console.log('   1. Admin (puede gestionar todo)');
  console.log('   2. Especialista (puede ver turnos y pacientes)');
  
  const rolInput = await question('❓ Selecciona el rol (1-2): ');
  const idRol = parseInt(rolInput);

  if (idRol !== 1 && idRol !== 2) {
    console.error('❌ Rol inválido');
    process.exit(1);
  }

  // 6. Vincular usuario
  console.log('\n🔄 Vinculando usuario con organización...');
  
  const { data: vinculo, error: vinculoError } = await supabase
    .from('usuario_organizacion')
    .upsert({
      id_usuario: selectedUser.id_usuario,
      id_organizacion: org.id_organizacion,
      id_rol: idRol,
      activo: true,
      color_calendario: '#3b82f6' // Azul por defecto
    }, {
      onConflict: 'id_usuario,id_organizacion'
    })
    .select()
    .single();

  if (vinculoError) {
    console.error('❌ Error al vincular usuario:', vinculoError);
    process.exit(1);
  }

  console.log('✅ Usuario vinculado exitosamente!');

  // 7. Si es especialista, preguntar por especialidades
  if (idRol === 2) {
    console.log('\n📋 Paso adicional: Asignar especialidades');
    
    const { data: especialidades } = await supabase
      .from('especialidad')
      .select('id_especialidad, nombre')
      .order('nombre');

    if (especialidades && especialidades.length > 0) {
      console.log('\n📋 Especialidades disponibles:');
      especialidades.forEach((e, index) => {
        console.log(`   ${index + 1}. ${e.nombre}`);
      });

      const espInput = await question('\n❓ Ingresa los números de especialidades separados por coma (ej: 1,3,5) o ENTER para omitir: ');
      
      if (espInput.trim()) {
        const selectedEspecialidades = espInput.split(',').map(s => parseInt(s.trim()) - 1);
        
        for (const index of selectedEspecialidades) {
          const esp = especialidades[index];
          if (esp) {
            await supabase
              .from('usuario_especialidad')
              .upsert({
                id_usuario: selectedUser.id_usuario,
                id_usuario_organizacion: vinculo.id_usuario_organizacion,
                id_especialidad: esp.id_especialidad,
                activo: true
              }, {
                onConflict: 'id_usuario_organizacion,id_especialidad'
              });
            
            console.log(`   ✅ Especialidad agregada: ${esp.nombre}`);
          }
        }
      }
    }
  }

  // 8. Mostrar resumen final
  console.log('\n' + '='.repeat(60));
  console.log('✅ VINCULACIÓN COMPLETADA EXITOSAMENTE');
  console.log('='.repeat(60));
  console.log(`\n📧 Usuario: ${selectedUser.email}`);
  console.log(`🏢 Organización: ${org.nombre}`);
  console.log(`👤 Rol: ${idRol === 1 ? 'Admin' : 'Especialista'}`);
  console.log(`🎨 Color: #3b82f6`);
  console.log(`✅ Estado: Activo`);
  console.log('\n💡 El usuario ya puede iniciar sesión y acceder a la aplicación\n');

  rl.close();
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
