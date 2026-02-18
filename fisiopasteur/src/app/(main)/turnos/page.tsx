import { obtenerTurnosConFiltros, obtenerEspecialistas, obtenerBoxes, obtenerEspecialidades } from "@/lib/actions/turno.action";
import TurnosPageContainer from "@/componentes/turnos/turnos-page-container";
import type { TurnoConDetalles } from "@/stores/turno-store";
import { QueryClient } from "@tanstack/react-query";

// Helper function to parse search params
function parseSearchParams(params: { [key: string]: string | string[] | undefined }) {
  const hoy = new Date().toISOString().split('T')[0];
  
  // Helper para convertir a array
  const toArray = (value: string | string[] | undefined): string[] => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };
  
  return {
    fecha_desde: Array.isArray(params?.desde) ? params.desde[0] : (params?.desde ?? hoy),
    fecha_hasta: Array.isArray(params?.hasta) ? params.hasta[0] : (params?.hasta ?? hoy),
    especialista_ids: toArray(params?.especialistas),
    especialidad_ids: toArray(params?.especialidades),
    estados: toArray(params?.estados),
  };
}

export default async function TurnosPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> // ✅ Mantener Promise<>
}) {
  // ✅ Await searchParams primero (Next.js 15 requirement)
  const params = await searchParams;
  // ✅ Luego parsear los parámetros
  const filtros = parseSearchParams(params);
  // Crear cliente en el servidor (uno nuevo por request)
  const queryClient = new QueryClient();

  // Prefetch de los datos (llena la caché del servidor)
  await queryClient.prefetchQuery({
    queryKey: ['turnos', 'list', filtros],
    queryFn: async () => obtenerTurnosConFiltros(filtros).then(res => res.data as TurnoConDetalles[] || []),
  });
      

  // Usar la función original sin filtro automático de usuario
  const [resEspecialistas, resEspecialidades, resBoxes] = await Promise.all([
    // obtenerTurnosConFiltros(filtros),
    obtenerEspecialistas(),
    obtenerEspecialidades(),
    obtenerBoxes()
  ]);
  
  // if (error) {
  //   return <div className="p-6 text-red-700">Error: {resTurnos.error}</div>;
  // }

  return (
    <TurnosPageContainer
      // initialTurnos={(resTurnos.data ?? []) as unknown as TurnoConDetalles[]} // ✅ Datos iniciales del servidor
      especialistas={resEspecialistas.success ? (resEspecialistas.data ?? []) : []}
      especialidades={resEspecialidades.success ? (resEspecialidades.data ?? []) : []}
      boxes={resBoxes.success ? (resBoxes.data ?? []) : []}
      initialFilters={filtros}
    />
  );
}