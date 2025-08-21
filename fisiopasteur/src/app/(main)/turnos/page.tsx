import { obtenerTurnosConFiltros, obtenerEspecialistas, obtenerBoxes } from "@/lib/actions/turno.action"; // ajusta paths si separaste actions
import FiltrosTurnos from "@/componentes/turnos/filtros-turnos";
import TablaTurnos from "@/componentes/turnos/listado-turnos";

export default async function TurnosPage({ searchParams }: { searchParams: any }) {
    // Si no hay filtros, mostrar por defecto los del dia
  const hoy = new Date().toISOString().split('T')[0];
  const filtros = {
    fecha_desde: searchParams?.desde ?? hoy,
    fecha_hasta: searchParams?.hasta ?? hoy,
    especialista_id: searchParams?.especialista ?? undefined,
    hora_desde: searchParams?.hdesde ?? undefined,
    hora_hasta: searchParams?.hhasta ?? undefined,
    estado: searchParams?.estado ?? undefined,
  };

  const [resTurnos, resEspecialistas, resBoxes] = await Promise.all([
    obtenerTurnosConFiltros(filtros),
    obtenerEspecialistas(),
    obtenerBoxes(),
  ]);

  if (!resTurnos.success) {
    return <div className="p-6 text-red-700">Error: {resTurnos.error}</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold mb-4">Turnos</h1>
      <FiltrosTurnos
        especialistas={resEspecialistas.success ? resEspecialistas.data : []}
        boxes={resBoxes.success ? resBoxes.data : []}
        initial={filtros}
      />
      <TablaTurnos turnos={resTurnos.data ?? []} />
    </div>
  );
}
