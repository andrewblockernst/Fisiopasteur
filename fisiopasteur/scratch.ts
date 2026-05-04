import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('turno').select(`
    *,
    paciente:id_paciente(id_paciente, nombre, apellido, dni, telefono, email),
    especialista:id_especialista(id_usuario, nombre, apellido, color),
    especialidad:id_especialidad(id_especialidad, nombre),
    box:id_box(id_box, numero),
    grupo_tratamiento:id_grupo_tratamiento(id_grupo, cantidad_turnos_planificados)
  `).eq('id_turno', 612).single();

  console.log(JSON.stringify({ data, error }, null, 2));
}

run();
