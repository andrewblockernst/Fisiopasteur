import { obtenerTurnosConFiltros, obtenerEspecialistas, obtenerBoxes, obtenerEspecialidades } from "@/lib/actions/turno.action";
import TurnosPageContainer from "@/componentes/turnos/turnos-page-container";
import type { TurnoConDetalles } from "@/stores/turno-store";

export default async function TurnosPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
  // ✅ No hacer await a searchParams directamente, usar directamente
  // const params = await searchParams;
  const params = searchParams instanceof Promise 
    ? await Promise.race([
        searchParams,
        new Promise(resolve => setTimeout(() => resolve({}), 100))
      ]) as any
    : searchParams;

  const hoy = new Date().toISOString().split('T')[0];
  
  // Parse especialidad_id to number if present
  const especialidadParam = Array.isArray(params?.especialidad) ? params.especialidad[0] : params?.especialidad;
  const especialidad_id = especialidadParam ? Number(especialidadParam) : undefined;
  
  return {
    fecha_desde: Array.isArray(params?.desde) ? params.desde[0] : (params?.desde ?? hoy),
    fecha_hasta: Array.isArray(params?.hasta) ? params.hasta[0] : (params?.hasta ?? hoy),
    especialista_id: Array.isArray(params?.especialista) ? params.especialista[0] : params?.especialista,
    especialidad_id,
    estado: Array.isArray(params?.estado) ? params.estado[0] : params?.estado,
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

  // Usar la función original sin filtro automático de usuario
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
      turnos={(resTurnos.data ?? []) as unknown as TurnoConDetalles[]}
      especialistas={resEspecialistas.success ? (resEspecialistas.data ?? []) : []}
      especialidades={resEspecialidades.success ? (resEspecialidades.data ?? []) : []}
      boxes={resBoxes.success ? (resBoxes.data ?? []) : []}
      initialFilters={filtros}
    />
  );
}