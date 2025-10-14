import React from "react";
import CalendarioClient from "../../../componentes/calendario/calendario-client";
import { obtenerTurnosConFiltros, obtenerEspecialistas } from "@/lib/actions/turno.action";
import { getPacientes } from "@/lib/actions/paciente.action";
import type { TurnoConDetalles } from "@/stores/turno-store";

export default async function CalendarioPage() {
  // Cargar datos reales desde las Server Actions
  const [resTurnos, resEspecialistas, resPacientes] = await Promise.all([
    obtenerTurnosConFiltros(),
    obtenerEspecialistas(),
    getPacientes({}) // Obtener más pacientes para el selector
  ]);

  // Procesar resultados de las Server Actions y mapear a la estructura esperada
  const turnos: TurnoConDetalles[] = resTurnos.success 
    ? (resTurnos.data || []).map((turno: any) => ({
        ...turno,
        especialista: turno.especialista ? {
          id_usuario: turno.especialista.id_usuario,
          nombre: turno.especialista.nombre,
          apellido: turno.especialista.apellido,
          color: turno.especialista.color,
          email: '',
          usuario: '',
          contraseña: '',
          telefono: null,
          id_especialidad: null,
          id_rol: 2,
          activo: true,
          created_at: null,
          updated_at: null,
        } : undefined,
        paciente: turno.paciente || undefined,
        box: turno.box || undefined
      }))
    : [];

  const especialistas = resEspecialistas.success ? resEspecialistas.data || [] : [];
  const pacientes = resPacientes.data || [];

  return (
    <CalendarioClient 
      turnosIniciales={turnos}
      especialistas={especialistas}
      pacientes={pacientes}
    />
  );
}
