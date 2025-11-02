import { obtenerTurnosConFiltros, obtenerEspecialistas, obtenerBoxes, obtenerEspecialidades } from "@/lib/actions/turno.action";
import TurnosPageContainer from "@/componentes/turnos/turnos-page-container";
import type { TurnoConDetalles } from "@/stores/turno-store";

export default async function TurnosPage({ searchParams }: { searchParams: any }) {
  // Si searchParams es una promesa, espera; si no, úsalo directo
  const params = searchParams;

  
  const hoy = new Date().toISOString().split('T')[0];
  const filtros = {
    fecha_desde: params?.desde ?? hoy,
    fecha_hasta: params?.hasta ?? hoy,
    especialista_id: params?.especialista ?? undefined,
    especialidad_id: params?.especialidad ?? undefined,
    estado: params?.estado ?? undefined,
  };

  // Usar la función original sin filtro automático de usuario
  const [resTurnos, resEspecialistas, resEspecialidades, resBoxes] = await Promise.all([
    obtenerTurnosConFiltros(filtros), // Cambiar de vuelta a esta función
    obtenerEspecialistas(),
    obtenerEspecialidades(),
    obtenerBoxes(),
  ]);
  
  if (!resTurnos.success) {
    return <div className="p-6 text-red-700">Error: {resTurnos.error}</div>;
  }

  return (
    <TurnosPageContainer
      turnos={(resTurnos.data ?? []) as unknown as TurnoConDetalles[]}
      especialistas={resEspecialistas.success ? (resEspecialistas.data ?? []) : []}
      especialidades={resEspecialidades.success ? (resEspecialidades.data ?? []) : []}
      boxes={resBoxes.success ? (resBoxes.data ?? []) : []}
      initialFilters={filtros}
    />
  );
}