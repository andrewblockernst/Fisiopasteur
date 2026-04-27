"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Filter, X, Plus, ChevronDown } from "lucide-react";
import Button from "@/componentes/boton";
import NuevoTurnoModal from "../calendario/nuevo-turno-dialog";
import PacienteAutocomplete from "@/componentes/paciente/paciente-autocomplete";
import { useAuth } from "@/hooks/AuthContext";

interface FiltrosTurnosProps {
  especialistas: any[];
  especialidades: any[];
  boxes: any[];
  initial: any;
  onTurnoCreated?: () => void;
}

export default function FiltrosTurnos({
  especialistas,
  especialidades,
  boxes,
  initial,
  onTurnoCreated
}: FiltrosTurnosProps) {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  
  const [filter, setFilter] = useState(() => {
    // Inicializar filter desde initial y convertir arrays
    const filterBase = initial || {};
    return {
      ...filterBase,
      especialista_ids: Array.isArray(filterBase.especialista_ids) ? filterBase.especialista_ids : [],
      especialidad_ids: Array.isArray(filterBase.especialidad_ids) ? filterBase.especialidad_ids : [],
      estados: Array.isArray(filterBase.estados) ? filterBase.estados : [],
    };
  });
  const [openNew, setOpenNew] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null); // Estado para dropdowns abiertos

  // ============= ESTADO PARA BÚSQUEDA DE PACIENTE =============
  const [busquedaPaciente, setBusquedaPaciente] = useState('');
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<{ id_paciente: number; nombre: string; apellido: string, dni: string, telefono: string } | null>(null);

  useEffect(() => {
    const filterBase = initial || {};
    const especialistasFromUrl = params.getAll('especialistas');
    const especialidadesFromUrl = params.getAll('especialidades');
    const estadosFromUrl = params.getAll('estados');

    // Si el paciente fue removido de la URL, limpiar el estado local
    const pacienteIdFromUrl = params.get('paciente_id');
    if (!pacienteIdFromUrl) {
      setPacienteSeleccionado(null);
      setBusquedaPaciente('');
    }
    
    setFilter({
      ...filterBase,
      especialista_ids: especialistasFromUrl.length > 0 ? especialistasFromUrl : (Array.isArray(filterBase.especialista_ids) ? filterBase.especialista_ids : []),
      especialidad_ids: especialidadesFromUrl.length > 0 ? especialidadesFromUrl : (Array.isArray(filterBase.especialidad_ids) ? filterBase.especialidad_ids : []),
      estados: estadosFromUrl.length > 0 ? estadosFromUrl : (Array.isArray(filterBase.estados) ? filterBase.estados : []),
      paciente_id: pacienteIdFromUrl ? parseInt(pacienteIdFromUrl) : filterBase.paciente_id,
    });

  }, [params]);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (openDropdown && !target.closest('[data-dropdown-trigger]') && !target.closest('[data-dropdown-content]')) {
        setOpenDropdown(null);
      }
    };
    
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  // Función para formatear fecha como DD/MM/YYYY - Memoizada
  const formatearFecha = useCallback((fechaStr: string) => {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr + 'T00:00:00');
    return fecha.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, []);

  // Filtrar especialidades para excluir Pilates - Memoizado
  const especialidadesFiltradas = useMemo(() => {
    return especialidades?.filter((esp: any) => {
      if (!esp.nombre) return true;
      return !esp.nombre.toLowerCase().includes('pilates');
    }) || [];
  }, [especialidades]);
  // const especialidadesFiltradas = especialidades;

  const estadosPosibles = useMemo(() => [
    { value: "", label: "Todos los estados" },
    { value: "programado", label: "Programado" },
    { value: "atendido", label: "Atendido" },
    { value: "cancelado", label: "Cancelado" },
    { value: "pendiente", label: "Pendiente" },
  ], []);

  const aplicarFiltros = useCallback((filtros: any) => {
    const usp = new URLSearchParams();
    const pageSizeActual = params.get("page_size");
    if (filtros.fecha_desde) usp.set("desde", filtros.fecha_desde);
    if (filtros.fecha_hasta) usp.set("hasta", filtros.fecha_hasta);
    
    // Manejar arrays de especialistas
    if (filtros.especialista_ids && Array.isArray(filtros.especialista_ids) && filtros.especialista_ids.length > 0) {
      filtros.especialista_ids.forEach((id: string) => usp.append("especialistas", id));
    } else {
      // Intención explícita: ver todos los especialistas aunque el usuario no gestione turnos.
      usp.set("ver_todos", "1");
    }
    
    // Manejar arrays de especialidades
    if (filtros.especialidad_ids && Array.isArray(filtros.especialidad_ids) && filtros.especialidad_ids.length > 0) {
      filtros.especialidad_ids.forEach((id: string) => usp.append("especialidades", id));
    }
    
    // Manejar arrays de estados
    if (filtros.estados && Array.isArray(filtros.estados) && filtros.estados.length > 0) {
      filtros.estados.forEach((estado: string) => usp.append("estados", estado));
    }

    // Manejar paciente seleccionado
    if (filtros.paciente_id) {
      usp.set("paciente_id", filtros.paciente_id.toString());
    }

    usp.set("page", "1");
    if (pageSizeActual && ["10", "20", "30", "50"].includes(pageSizeActual)) {
      usp.set("page_size", pageSizeActual);
    }
    
    router.push(`/turnos?${usp.toString()}`);
  }, [router, params]);

  const handleFechaDesdeChange = useCallback((fecha: string) => {
    let fechaDesde = fecha || undefined;

    if (fechaDesde && filter.fecha_hasta && fechaDesde > filter.fecha_hasta) {
      fechaDesde = filter.fecha_hasta;
    }

    const nuevosFiltros = { ...filter, fecha_desde: fechaDesde };
    setFilter(nuevosFiltros);
    aplicarFiltros(nuevosFiltros);
  }, [filter, aplicarFiltros]);

  const handleFechaHastaChange = useCallback((fecha: string) => {
    let fechaHasta = fecha || undefined;

    if (fechaHasta && filter.fecha_desde && fechaHasta < filter.fecha_desde) {
      fechaHasta = filter.fecha_desde;
    }

    const nuevosFiltros = { ...filter, fecha_hasta: fechaHasta };
    setFilter(nuevosFiltros);
    aplicarFiltros(nuevosFiltros);
  }, [filter, aplicarFiltros]);

  // Callbacks para actualizar filtros individuales (multi-select)
  const handleEspecialistaToggle = useCallback((id: string) => {
    const actualistas = Array.isArray(filter.especialista_ids) ? [...filter.especialista_ids] : [];
    const index = actualistas.indexOf(id);
    
    if (index > -1) {
      actualistas.splice(index, 1);
    } else {
      actualistas.push(id);
    }
    
    const nuevosFiltros = { ...filter, especialista_ids: actualistas };
    setFilter(nuevosFiltros);
    aplicarFiltros(nuevosFiltros);
  }, [filter, aplicarFiltros]);

  const handleEspecialidadToggle = useCallback((id: string) => {
    const actualidades = Array.isArray(filter.especialidad_ids) ? [...filter.especialidad_ids] : [];
    const index = actualidades.indexOf(id);
    
    if (index > -1) {
      actualidades.splice(index, 1);
    } else {
      actualidades.push(id);
    }
    
    const nuevosFiltros = { ...filter, especialidad_ids: actualidades };
    setFilter(nuevosFiltros);
    aplicarFiltros(nuevosFiltros);
  }, [filter, aplicarFiltros]);

  const handleEstadoToggle = useCallback((estado: string) => {
    const estadosActuales = Array.isArray(filter.estados) ? [...filter.estados] : [];
    const index = estadosActuales.indexOf(estado);
    
    if (index > -1) {
      estadosActuales.splice(index, 1);
    } else {
      estadosActuales.push(estado);
    }
    
    const nuevosFiltros = { ...filter, estados: estadosActuales };
    setFilter(nuevosFiltros);
    aplicarFiltros(nuevosFiltros);
  }, [filter, aplicarFiltros]);

  const limpiarFiltros = useCallback(() => {

    const fechaActual = new Date();
    const fechaHoy = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires'
    }).format(fechaActual);
    const userId = user?.id_usuario && !user.puedeGestionarTurnos ? String(user.id_usuario) : "";
    
    setOpenDropdown(null);
    setPacienteSeleccionado(null);
    setBusquedaPaciente('');

    const filtrosBase = {
      fecha_desde: fechaHoy,
      fecha_hasta: fechaHoy,
      especialista_ids: [userId],
      especialidad_ids: [],
      estados: [],
    };
    setFilter(filtrosBase);
    aplicarFiltros({ ...filtrosBase, page: 1 });
  }, [aplicarFiltros, user]);

  const filtrosActivos = useMemo(() => {
    let count = 0;
    if (filter.fecha_desde) count++;
    if (filter.fecha_hasta) count++;
    if (Array.isArray(filter.especialista_ids) && filter.especialista_ids.length > 0) count++;
    if (Array.isArray(filter.especialidad_ids) && filter.especialidad_ids.length > 0) count++;
    if (Array.isArray(filter.estados) && filter.estados.length > 0) count++;
    if (pacienteSeleccionado) count++;
    return count;
  }, [filter, pacienteSeleccionado]);

  const handleSeleccionarPaciente = useCallback((paciente: { id_paciente: number; nombre: string; apellido: string, dni: string, telefono: string }) => {
    setPacienteSeleccionado(paciente);
    setBusquedaPaciente(`${paciente.nombre} ${paciente.apellido}`);
    const nuevosFiltros = { ...filter, paciente_id: paciente.id_paciente };
    setFilter(nuevosFiltros);
    aplicarFiltros(nuevosFiltros);
  }, [filter, aplicarFiltros]);

  const handleLimpiarPaciente = useCallback(() => {
    setPacienteSeleccionado(null);
    setBusquedaPaciente('');
    const nuevosFiltros = { ...filter, paciente_id: undefined };
    setFilter(nuevosFiltros);
    aplicarFiltros(nuevosFiltros);
  }, [filter, aplicarFiltros]);

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-0">

      {/* Fila 1: Título + Botón */}
      <div className="flex items-center justify-between mb-3">
          <div className="flex flex-wrap items-end gap-x-2 gap-y-2">
            {/* Filtro Fecha Desde */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">Desde</label>
              <input
                type="date"
                value={filter.fecha_desde || ""}
                max={filter.fecha_hasta || undefined}
                onChange={(e) => handleFechaDesdeChange(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-[138px]"
              />
            </div>

            {/* Filtro Fecha Hasta */}
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-600 mb-1">Hasta</label>
              <input
                type="date"
                value={filter.fecha_hasta || ""}
                min={filter.fecha_desde || undefined}
                onChange={(e) => handleFechaHastaChange(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-[138px]"
              />
            </div>

            {/* Filtro Especialista */}
            <div className="flex flex-col relative">
              <label className="text-xs font-medium text-gray-600 mb-1">Especialista</label>
              <button
                data-dropdown-trigger
                onClick={() => setOpenDropdown(openDropdown === 'especialista' ? null : 'especialista')}
                className="border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white flex items-center justify-between gap-1.5 w-[130px]"
              >
                <span className="truncate">
                  {(!Array.isArray(filter.especialista_ids) || filter.especialista_ids.length === 0 || filter.especialista_ids.length === especialistas.length)
                    ? 'Todos'
                    : `${filter.especialista_ids.length} selec.`}
                </span>
                <ChevronDown size={14} className={`shrink-0 transition-transform ${openDropdown === 'especialista' ? 'rotate-180' : ''}`} />
              </button>
              
              {openDropdown === 'especialista' && (
                <div data-dropdown-content className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[200px] max-h-60 overflow-y-auto">
                  {especialistas.map((esp: any) => (
                    <label key={esp.id_usuario} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Array.isArray(filter.especialista_ids) && filter.especialista_ids.includes(esp.id_usuario)}
                        onChange={() => handleEspecialistaToggle(esp.id_usuario)}
                        className="rounded"
                      />
                      <span className="text-sm">{esp.apellido}, {esp.nombre}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Filtro Especialidad */}
            <div className="flex flex-col relative">
              <label className="text-xs font-medium text-gray-600 mb-1">Especialidad</label>
              <button
                data-dropdown-trigger
                onClick={() => setOpenDropdown(openDropdown === 'especialidad' ? null : 'especialidad')}
                className="border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white flex items-center justify-between gap-1.5 w-[130px]"
              >
                <span className="truncate">
                  {(!Array.isArray(filter.especialidad_ids) || filter.especialidad_ids.length === 0 || filter.especialidad_ids.length === especialidadesFiltradas.length)
                    ? 'Todas'
                    : `${filter.especialidad_ids.length} selec.`}
                </span>
                <ChevronDown size={14} className={`shrink-0 transition-transform ${openDropdown === 'especialidad' ? 'rotate-180' : ''}`} />
              </button>
              
              {openDropdown === 'especialidad' && (
                <div data-dropdown-content className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[200px] max-h-60 overflow-y-auto">
                  {especialidadesFiltradas.map((esp: any) => (
                    <label key={esp.id_especialidad} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Array.isArray(filter.especialidad_ids) && filter.especialidad_ids.includes(esp.id_especialidad.toString())}
                        onChange={() => handleEspecialidadToggle(esp.id_especialidad.toString())}
                        className="rounded"
                      />
                      <span className="text-sm">{esp.nombre}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Filtro Estado */}
            <div className="flex flex-col relative">
              <label className="text-xs font-medium text-gray-600 mb-1">Estado</label>
              <button
                data-dropdown-trigger
                onClick={() => setOpenDropdown(openDropdown === 'estado' ? null : 'estado')}
                className="border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white flex items-center justify-between gap-1.5 w-[120px]"
              >
                <span className="truncate">
                  {(!Array.isArray(filter.estados) || filter.estados.length === 0 || filter.estados.length === estadosPosibles.filter(e => e.value).length)
                    ? 'Todos'
                    : `${filter.estados.length} selec.`}
                </span>
                <ChevronDown size={14} className={`shrink-0 transition-transform ${openDropdown === 'estado' ? 'rotate-180' : ''}`} />
              </button>
              
              {openDropdown === 'estado' && (
                <div data-dropdown-content className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[180px]">
                  {estadosPosibles.filter(e => e.value).map((estado) => (
                    <label key={estado.value} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Array.isArray(filter.estados) && filter.estados.includes(estado.value)}
                        onChange={() => handleEstadoToggle(estado.value)}
                        className="rounded"
                      />
                      <span className="text-sm">{estado.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Filtro Paciente */}
            <div className="flex flex-col relative">
              <label className="text-xs font-medium text-gray-600 mb-1">Paciente</label>
              <PacienteAutocomplete
                value={busquedaPaciente}
                onChange={(valor) => {
                  setBusquedaPaciente(valor);
                  if (pacienteSeleccionado && valor !== `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellido}`) {
                    setPacienteSeleccionado(null);
                    const nuevosFiltros = { ...filter, paciente_id: undefined };
                    setFilter(nuevosFiltros);
                    aplicarFiltros(nuevosFiltros);
                  }
                }}
                onSelect={handleSeleccionarPaciente}
                onClear={handleLimpiarPaciente}
                showClearButton
                limit={5}
                showMinCharsHint={false}
                placeholder="Buscar paciente..."
                inputClassName="border rounded pl-6 pr-6 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-[170px]"
                dropdownClassName="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[220px] max-h-60 overflow-y-auto"
                optionClassName="px-3 py-2 hover:bg-blue-50 text-sm flex flex-col"
                renderOption={(pac) => (
                  <>
                    <span className="font-medium">{pac.apellido}, {pac.nombre}</span>
                    <span className="text-xs text-gray-500">
                      {pac.dni && <span className="mr-2">{pac.dni}</span>}
                      {pac.dni && pac.telefono && <span className="mr-2">•</span>}
                      {pac.telefono && <span>{pac.telefono}</span>}
                    </span>
                  </>
                )}
              />
            </div>

            {/* Botón Limpiar */}
            {filtrosActivos > 0 && (
              <Button
                variant="secondary"
                onClick={limpiarFiltros}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm h-[34px] self-end"
              >
                <X size={14} />
                <span>Limpiar ({filtrosActivos})</span>
              </Button>
            )}
      </div>
        <Button
          variant="primary"
          onClick={() => setOpenNew(true)}
          className="flex items-center gap-1.5 h-[34px] shrink-0 text-sm px-3"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">Nuevo turno</span>
          <span className="sm:hidden">Turno</span>
        </Button>
      </div>

      <NuevoTurnoModal 
        isOpen={openNew} 
        onClose={() => setOpenNew(false)}
        onTurnoCreated={onTurnoCreated}
        especialistaPreseleccionado={Array.isArray(filter.especialista_ids) && filter.especialista_ids.length === 1 ? String(filter.especialista_ids[0]) : null}
        especialistas={especialistas}
        // pacientes={[]}
      />
    </div>
  );
}