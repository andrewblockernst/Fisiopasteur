import { obtenerTurnosConFiltros, obtenerEspecialistas, obtenerBoxes, obtenerEspecialidades } from "@/lib/actions/turno.action";
import FiltrosTurnos from "@/componentes/turnos/filtros-turnos";
import TablaTurnos from "@/componentes/turnos/listado-turnos";
import TurnosPageContainer from "@/componentes/turnos/turnos-page-container";

export default async function TurnosPage({ searchParams }: { searchParams: Promise<any> }) {
  // Await searchParams antes de usar sus propiedades
  const params = await searchParams;
  
  // Si no hay filtros, mostrar por defecto los del día
  const hoy = new Date().toISOString().split('T')[0];
  const filtros = {
    fecha_desde: params?.desde ?? hoy,
    fecha_hasta: params?.hasta ?? hoy,
    especialista_id: params?.especialista ?? undefined,
    especialidad_id: params?.especialidad ?? undefined,
    // Eliminamos hora_desde y hora_hasta
    estado: params?.estado ?? undefined,
  };

  const [resTurnos, resEspecialistas, resEspecialidades, resBoxes] = await Promise.all([
    obtenerTurnosConFiltros(filtros),
    obtenerEspecialistas(),
    obtenerEspecialidades(),
    obtenerBoxes(),
  ]);

  if (!resTurnos.success) {
    return <div className="p-6 text-red-700">Error: {resTurnos.error}</div>;
  }

  return (
    <TurnosPageContainer
      turnos={resTurnos.data ?? []}
      especialistas={resEspecialistas.success ? resEspecialistas.data : []}
      especialidades={resEspecialidades.success ? resEspecialidades.data : []}
      boxes={resBoxes.success ? resBoxes.data : []}
      initialFilters={filtros}
    />
  );
}