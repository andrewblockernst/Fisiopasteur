import { obtenerTurnosConFiltros, obtenerEspecialistas, obtenerBoxes, obtenerEspecialidades } from "@/lib/actions/turno.action";
import FiltrosTurnos from "@/componentes/turnos/filtros-turnos";
import TablaTurnos from "@/componentes/turnos/listado-turnos";

export default async function TurnosPage({ searchParams }: { searchParams: Promise<any> }) {
  const params = await searchParams;
  
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
    <div className="sm:container sm:p-6 text-black">
      <h1 className="text-2xl font-bold mb-4">Turnos</h1>
      <FiltrosTurnos
        especialistas={resEspecialistas.success ? resEspecialistas.data : []}
        especialidades={resEspecialidades.success ? resEspecialidades.data : []}
        boxes={resBoxes.success ? resBoxes.data : []}
        initial={filtros}
      />
      <TablaTurnos turnos={resTurnos.data ?? []} />
    </div>
  );
}