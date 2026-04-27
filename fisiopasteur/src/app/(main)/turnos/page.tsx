import { obtenerTurnosConFiltros, obtenerEspecialistas, obtenerBoxes, obtenerEspecialidades } from "@/lib/actions/turno.action";
import { obtenerPerfilUsuario } from "@/lib/actions/perfil.action";
import TurnosPageContainer from "@/componentes/turnos/turnos-page-container";
import type { TurnoConDetalles } from "@/stores/turno-store";
import { QueryClient } from "@tanstack/react-query";
import { puedeGestionarTurnos } from "@/lib/constants/roles";
import { redirect } from "next/navigation";
import { todayYmd } from "@/lib/dayjs";

// Helper function to parse search params
function parseSearchParams(params: { [key: string]: string | string[] | undefined }) {
  const hoy = todayYmd();
  const allowedPageSizes = [10, 20, 30, 50];
  
  
  // Helper para convertir a array
  const toArray = (value: string | string[] | undefined): string[] => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  };
  
  const parsePageNumber = (value: string | string[] | undefined, fallback: number) => {
    const raw = Array.isArray(value) ? value[0] : value;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
  };

  const parsePageSize = (value: string | string[] | undefined, fallback: number) => {
    const parsed = parsePageNumber(value, fallback);
    return allowedPageSizes.includes(parsed) ? parsed : fallback;
  };

  return {
    fecha_desde: Array.isArray(params?.desde) ? params.desde[0] : (params?.desde ?? hoy),
    fecha_hasta: Array.isArray(params?.hasta) ? params.hasta[0] : (params?.hasta ?? hoy),
    especialista_ids: toArray(params?.especialistas),
    especialidad_ids: toArray(params?.especialidades),
    estados: toArray(params?.estados),
    page: parsePageNumber(params?.page, 1),
    page_size: parsePageSize(params?.page_size, 20),
    paciente_id: params?.paciente_id
      ? parseInt(Array.isArray(params.paciente_id) ? params.paciente_id[0] : params.paciente_id)
      : undefined,
  };
}

export default async function TurnosPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> // ✅ Mantener Promise<>
}) {
  // ✅ Await searchParams primero (Next.js 15 requirement)
  const params = await searchParams;
  const perfilResult: any = await obtenerPerfilUsuario();
  const perfil = perfilResult.success ? perfilResult.data : null;
  const userId = perfil?.id_usuario ? String(perfil.id_usuario) : "";
  const puedeGestionar = puedeGestionarTurnos(perfil?.rol?.id ?? null);

  // ✅ Parsear parámetros base
  const filtrosBase = parseSearchParams(params);
  const especialistasEnUrl = Array.isArray(params?.especialistas)
    ? params.especialistas.filter(Boolean)
    : (params?.especialistas ? [params.especialistas] : []);
  const verTodos = Array.isArray(params?.ver_todos)
    ? params.ver_todos[0] === "1"
    : params?.ver_todos === "1";

  const debeAplicarAutoFiltro = !verTodos && !puedeGestionar && Boolean(userId) && especialistasEnUrl.length === 0;
  const filtros = debeAplicarAutoFiltro
    ? {
        ...filtrosBase,
        especialista_ids: [String(userId)],
      }
    : filtrosBase;

  // Normalizar URL en servidor para evitar estado visual inconsistente de filtros.
  if (debeAplicarAutoFiltro) {
    const usp = new URLSearchParams();
    if (filtros.fecha_desde) usp.set("desde", filtros.fecha_desde);
    if (filtros.fecha_hasta) usp.set("hasta", filtros.fecha_hasta);
    filtros.especialista_ids.forEach((id) => usp.append("especialistas", id));
    filtros.especialidad_ids.forEach((id) => usp.append("especialidades", id));
    filtros.estados.forEach((estado) => usp.append("estados", estado));
    usp.set("page", String(filtros.page ?? 1));
    usp.set("page_size", String(filtros.page_size ?? 20));
    if (typeof filtros.paciente_id === "number") usp.set("paciente_id", String(filtros.paciente_id));
    redirect(`/turnos?${usp.toString()}`);
  }

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