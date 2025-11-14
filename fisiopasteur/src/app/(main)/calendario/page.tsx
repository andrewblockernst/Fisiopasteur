import React from "react";
import CalendarioClientQuery from "../../../componentes/calendario/calendario-client-query";
import { obtenerEspecialistas } from "@/lib/actions/turno.action";
import { getPacientes } from "@/lib/actions/paciente.action";

export default async function CalendarioPage() {
  // Solo cargar especialistas y pacientes en el servidor
  // Los turnos se cargan con React Query en el cliente
  const [resEspecialistas, resPacientes] = await Promise.all([
    obtenerEspecialistas(),
    getPacientes({})
  ]);

  const especialistas = resEspecialistas.success ? resEspecialistas.data || [] : [];
  const pacientes = resPacientes.data || [];

  return (
    <CalendarioClientQuery 
      especialistas={especialistas}
      pacientes={pacientes}
    />
  );
}
