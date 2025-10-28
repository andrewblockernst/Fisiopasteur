"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, Filter, X, Plus } from "lucide-react";
import Button from "@/componentes/boton";
import NuevoTurnoModal from "../calendario/nuevo-turno-dialog";
import { useAuth } from "@/hooks/usePerfil"; // Agregar el hook

interface FiltrosTurnosProps {
  especialistas: any[];
  especialidades: any[];
  boxes: any[];
  initial: any;
}

export default function FiltrosTurnos({ especialistas, especialidades, boxes, initial }: FiltrosTurnosProps) {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useAuth(); // Obtener usuario actual y loading
  
  const [filter, setFilter] = useState(initial);
  const [tipoFiltro, setTipoFiltro] = useState<string>("");
  const [valorFiltro, setValorFiltro] = useState<string>("");
  const [openNew, setOpenNew] = useState(false);
  const [filtroInicialAplicado, setFiltroInicialAplicado] = useState(false); // ✅ Control de primera carga

  useEffect(() => setFilter(initial), [params]);

  // Aplicar filtro automático SOLO en la primera carga
  useEffect(() => {
    if (!loading && user && !filtroInicialAplicado) {
      const currentEspecialistaParam = params.get('especialista');
      const verTodosParam = params.get('ver_todos');
      
      // Aplicar filtro automático si:
      // 1. No puede gestionar turnos (solo especialistas), O
      // 2. Puede gestionar pero también aparece en la lista de especialistas (es especialista activo)
      const esEspecialistaActivo = especialistas?.some((esp: any) => esp.id_usuario === user.id_usuario);
      
      const debeAplicarFiltro = !user.puedeGestionarTurnos || (user.puedeGestionarTurnos && esEspecialistaActivo);
      
      // ✅ SOLO aplicar si NO hay ningún parámetro en la URL (primera carga)
      if (debeAplicarFiltro && !currentEspecialistaParam && !verTodosParam && user.id_usuario) {
        const usp = new URLSearchParams(params.toString());
        usp.set('especialista', user.id_usuario);
        
        // Redirigir con el filtro aplicado
        router.replace(`/turnos?${usp.toString()}`);
      }
      
      // ✅ Marcar que ya se aplicó el filtro inicial
      setFiltroInicialAplicado(true);
    }
  }, [user, loading, filtroInicialAplicado, params, router, especialistas]);

  // Función para formatear fecha como DD/MM/YYYY
  const formatearFecha = (fechaStr: string) => {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr + 'T00:00:00');
    return fecha.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Filtrar especialidades para excluir Pilates
  const especialidadesFiltradas = especialidades?.filter((esp: any) => {
    if (!esp.nombre) return true;
    return !esp.nombre.toLowerCase().includes('pilates');
  }) || [];

  // Modificar tipos de filtro basándose en permisos
  const tiposFiltro = [
    { value: "", label: "Seleccionar filtro..." },
    { value: "fecha_desde", label: "Fecha desde" },
    { value: "fecha_hasta", label: "Fecha hasta" },
    { value: "especialista", label: "Especialista" },
    { value: "especialidad", label: "Especialidad" },
    { value: "estado", label: "Estado" },
  ];

  const estadosPosibles = [
    { value: "", label: "Todos los estados" },
    { value: "programado", label: "Programado" },
    { value: "atendido", label: "Atendido" },
    { value: "cancelado", label: "Cancelado" },
  ];

  const aplicarFiltro = (e: React.ChangeEvent<HTMLElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    if (!tipoFiltro || !target.value) return;

    const nuevosFiltros = { ...filter };

    switch (tipoFiltro) {
      case "fecha_desde":
        nuevosFiltros.fecha_desde = target.value;
        break;
      case "fecha_hasta":
        nuevosFiltros.fecha_hasta = target.value;
        break;
      case "especialista":
          nuevosFiltros.especialista_id = target.value;
        break;
      case "especialidad":
        nuevosFiltros.especialidad_id = target.value;
        break;
      case "estado":
        nuevosFiltros.estado = target.value;
        break;
    }

    setFilter(nuevosFiltros);
    aplicarFiltros(nuevosFiltros);
  };

  const aplicarFiltros = (filtros: any) => {
    const usp = new URLSearchParams();
    if (filtros.fecha_desde) usp.set("desde", filtros.fecha_desde);
    if (filtros.fecha_hasta) usp.set("hasta", filtros.fecha_hasta);
    if (filtros.especialista_id) usp.set("especialista", filtros.especialista_id);
    if (filtros.especialidad_id) usp.set("especialidad", filtros.especialidad_id);
    if (filtros.estado) usp.set("estado", filtros.estado);
    router.push(`/turnos?${usp.toString()}`);
  };

  const removerFiltro = (tipoFiltro: string) => {
    const nuevosFiltros = { ...filter };
    
    // Remover el filtro específico
    switch (tipoFiltro) {
      case 'fecha_desde':
        delete nuevosFiltros.fecha_desde;
        break;
      case 'fecha_hasta':
        delete nuevosFiltros.fecha_hasta;
        break;
      case 'especialista':
          delete nuevosFiltros.especialista_id;
        break;
      case 'especialidad':
        delete nuevosFiltros.especialidad_id;
        break;
      case 'estado':
        delete nuevosFiltros.estado;
        break;
    }
    
    setFilter(nuevosFiltros);
    aplicarFiltros(nuevosFiltros);
  };

  const limpiarFiltros = () => {
    // Limpiar todos los filtros (no mantener especialista automático)
    const filtrosBase = {};
    setFilter(filtrosBase);
    setTipoFiltro("");
    setValorFiltro("");
    
    // Determinar si el usuario necesita el parámetro ver_todos
    const esEspecialistaActivo = especialistas?.some((esp: any) => esp.id_usuario === user?.id_usuario);
    
    const necesitaVerTodos = !user?.puedeGestionarTurnos || (user?.puedeGestionarTurnos && esEspecialistaActivo);
    
    if (necesitaVerTodos) {
      router.push("/turnos?ver_todos=1");
    } else {
      router.push("/turnos");
    }
  };

  const renderCampoValor = () => {
    if (!tipoFiltro) return null;

    switch (tipoFiltro) {
      case "fecha_desde":
      case "fecha_hasta":
        return (
          <input
            type="date"
            value={tipoFiltro === "fecha_desde" ? filter.fecha_desde || "" : filter.fecha_hasta || ""}
            onChange={aplicarFiltro}
            className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      case "especialista":
        return (
          <select
            value={filter.especialista_id || ""}
            onChange={aplicarFiltro}
            className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los especialistas</option>
            {especialistas.map((esp: any) => (
              <option key={esp.id_usuario} value={esp.id_usuario}>
                {esp.apellido}, {esp.nombre}
              </option>
            ))}
          </select>
        );

      case "especialidad":
        return (
          <select
            value={valorFiltro}
            onChange={aplicarFiltro}
            className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Seleccionar especialidad...</option>
            {especialidadesFiltradas.map((esp: any) => (
              <option key={esp.id_especialidad} value={esp.id_especialidad}>
                {esp.nombre}
              </option>
            ))}
          </select>
        );

      case "estado":
        return (
          <select
            value={valorFiltro}
            onChange={aplicarFiltro}
            className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {estadosPosibles.map((estado) => (
              <option key={estado.value} value={estado.value}>
                {estado.label}
              </option>
            ))}
          </select>
        );

      default:
        return null;
    }
  };

  // Funciones para obtener los nombres de los filtros
  const getNombreEspecialista = (id: string) => {
    const esp = especialistas?.find((e: any) => e.id_usuario === id);
    return esp ? `${esp.apellido}, ${esp.nombre}` : 'Especialista filtrado';
  };

  const getNombreEspecialidad = (id: string) => {
    // Buscar en la lista filtrada también
    const esp = especialidadesFiltradas?.find((e: any) => e.id_especialidad === parseInt(id));
    return esp ? esp.nombre : 'Especialidad filtrada';
  };

  const filtrosActivos = Object.keys(filter).filter(key => filter[key as keyof typeof filter]).length;

 const getRolEspecialista = (id: string) => {
  const esp = especialistas?.find((e: any) => e.id_usuario === id);
  
  if (!esp) return 'Especialista';
  return esp.rol?.nombre || 'Especialista';
};

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
      {/* REEMPLAZAR completamente la lógica anterior */}
      {/* Encabezado siempre visible con contexto actual */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-blue-700 font-medium">Viendo turnos:</span>
          <span className="text-blue-900 font-semibold">
            {filter.especialista_id 
              ? `de ${getNombreEspecialista(filter.especialista_id)}` 
              : "de todos los especialistas"
            }
          </span>
          {/* Mostrar rol SIEMPRE que haya especialista filtrado */}
          {filter.especialista_id && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
              {getRolEspecialista(filter.especialista_id)}
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center ">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Selector de tipo de filtro */}
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-600" />
              <select
                value={tipoFiltro}
                onChange={(e) => {
                  setTipoFiltro(e.target.value);
                  setValorFiltro("");
                }}
                className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[180px]"
              >
                {tiposFiltro.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Campo de valor */}
            {renderCampoValor()}

            {/* Botones */}
            <div className="flex items-center gap-2">
              {filtrosActivos > 0 && (
                <Button
                  variant="secondary"
                  onClick={limpiarFiltros}
                  className="flex items-center gap-2"
                >
                  <X size={16} />
                  Limpiar ({filtrosActivos})
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => setOpenNew(true)}
              className="flex items-center gap-2"
            >
              Nuevo turno
            </Button>
        </div>
      </div>

      {/* Mostrar filtros activos */}
      {filtrosActivos > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 ">
          <div className="flex flex-wrap gap-2">
            {filter.fecha_desde && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center gap-1 group">
                Desde: {formatearFecha(filter.fecha_desde)}
                <button
                  onClick={() => removerFiltro('fecha_desde')}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors group-hover:bg-blue-200"
                  aria-label="Remover filtro de fecha desde"
                >
                  <X size={12} className="text-blue-600 hover:text-blue-800" />
                </button>
              </span>
            )}
            {filter.fecha_hasta && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center gap-1 group">
                Hasta: {formatearFecha(filter.fecha_hasta)}
                <button
                  onClick={() => removerFiltro('fecha_hasta')}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors group-hover:bg-blue-200"
                  aria-label="Remover filtro de fecha hasta"
                >
                  <X size={12} className="text-blue-600 hover:text-blue-800" />
                </button>
              </span>
            )}
            {/* Mostrar filtro de especialista para todos los usuarios */}
            {filter.especialista_id && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center gap-1 group">
                Especialista: {getNombreEspecialista(filter.especialista_id)}
                <button
                  onClick={() => removerFiltro('especialista')}
                  className="ml-1 hover:bg-green-200 rounded-full p-0.5 transition-colors group-hover:bg-green-200"
                  aria-label="Remover filtro de especialista"
                >
                  <X size={12} className="text-green-600 hover:text-green-800" />
                </button>
              </span>
            )}
            {filter.especialidad_id && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs flex items-center gap-1 group">
                Especialidad: {getNombreEspecialidad(filter.especialidad_id)}
                <button
                  onClick={() => removerFiltro('especialidad')}
                  className="ml-1 hover:bg-purple-200 rounded-full p-0.5 transition-colors group-hover:bg-purple-200"
                  aria-label="Remover filtro de especialidad"
                >
                  <X size={12} className="text-purple-600 hover:text-purple-800" />
                </button>
              </span>
            )}
            {filter.estado && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs flex items-center gap-1 group">
                Estado: {filter.estado}
                <button
                  onClick={() => removerFiltro('estado')}
                  className="ml-1 hover:bg-orange-200 rounded-full p-0.5 transition-colors group-hover:bg-orange-200"
                  aria-label="Remover filtro de estado"
                >
                  <X size={12} className="text-orange-600 hover:text-orange-800" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      <NuevoTurnoModal 
        isOpen={openNew} 
        onClose={() => setOpenNew(false)}
        onTurnoCreated={() => window.location.reload()}
      />
    </div>
  );
}