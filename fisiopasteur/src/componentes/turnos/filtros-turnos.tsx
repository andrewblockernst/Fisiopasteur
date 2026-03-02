"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Search, Filter, X, Plus, ChevronDown } from "lucide-react";
import Button from "@/componentes/boton";
import NuevoTurnoModal from "../calendario/nuevo-turno-dialog";
import { useAuth } from "@/hooks/usePerfil"; // Agregar el hook
import { obtenerPacientes } from "@/lib/actions/turno.action";

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
  const { user, loading } = useAuth(); // Obtener usuario actual y loading
  
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
  const [filtroInicialAplicado, setFiltroInicialAplicado] = useState(false); // ✅ Control de primera carga
  const [openDropdown, setOpenDropdown] = useState<string | null>(null); // Estado para dropdowns abiertos

  // ============= ESTADO PARA BÚSQUEDA DE PACIENTE =============
  const [busquedaPaciente, setBusquedaPaciente] = useState('');
  const [pacientesSugeridos, setPacientesSugeridos] = useState<any[]>([]);
  const [buscandoPacientes, setBuscandoPacientes] = useState(false);
  const [mostrarListaPacientes, setMostrarListaPacientes] = useState(false);
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

  useEffect(() => {
    if (!loading && user && !filtroInicialAplicado) {
      const currentEspecialistaParam = params.get('especialista');
      const verTodosParam = params.get('ver_todos');
      
      // ✅ LÓGICA CORREGIDA:
      // Solo aplicar filtro automático si el usuario NO puede gestionar turnos (es solo especialista)
      // Los Admin y Programadores SIEMPRE pueden ver "Todos los especialistas"
      const esEspecialistaActivo = especialistas?.some((esp: any) => esp.id_usuario === user.id_usuario);
      
      const debeAplicarFiltro = !user.puedeGestionarTurnos && esEspecialistaActivo;
      
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

  // Tipos de filtro - Ya no necesario para la UI pero lo dejamos por compatibilidad
  // const tiposFiltro = useMemo(() => [
  //   { value: "", label: "Seleccionar filtro..." },
  //   { value: "fecha_desde", label: "Fecha desde" },
  //   { value: "fecha_hasta", label: "Fecha hasta" },
  //   { value: "especialista", label: "Especialista" },
  //   { value: "especialidad", label: "Especialidad" },
  //   { value: "estado", label: "Estado" },
  // ], []);

  const estadosPosibles = useMemo(() => [
    { value: "", label: "Todos los estados" },
    { value: "programado", label: "Programado" },
    { value: "atendido", label: "Atendido" },
    { value: "cancelado", label: "Cancelado" },
    { value: "pendiente", label: "Pendiente" },
  ], []);

  const aplicarFiltros = useCallback((filtros: any) => {
    const usp = new URLSearchParams();
    if (filtros.fecha_desde) usp.set("desde", filtros.fecha_desde);
    if (filtros.fecha_hasta) usp.set("hasta", filtros.fecha_hasta);
    
    // Manejar arrays de especialistas
    if (filtros.especialista_ids && Array.isArray(filtros.especialista_ids) && filtros.especialista_ids.length > 0) {
      filtros.especialista_ids.forEach((id: string) => usp.append("especialistas", id));
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
    
    router.push(`/turnos?${usp.toString()}`);
  }, [router]);

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

  // Callback para remover filtros individuales
  // const handleRemoverFiltro = useCallback((tipoFiltro: string) => {
  //   const nuevosFiltros = { ...filter };
  //   // const fechaHoy = new Date().toISOString().split('T')[0];
  //   const fechaActual = new Date();
  //   const fechaHoy = new Intl.DateTimeFormat('en-CA', {
  //     timeZone: 'America/Argentina/Buenos_Aires',
  //     year: 'numeric', 
  //     month: '2-digit', 
  //     day: '2-digit'
  //   }).format(fechaActual);
    
  //   switch (tipoFiltro) {
  //     case 'fecha_desde':
  //       nuevosFiltros.fecha_desde = fechaHoy;
  //       break;
  //     case 'fecha_hasta':
  //       nuevosFiltros.fecha_hasta = fechaHoy;
  //       break;
  //     case 'especialistas':
  //       nuevosFiltros.especialista_ids = [];
  //       break;
  //     case 'especialidades':
  //       nuevosFiltros.especialidad_ids = [];
  //       break;
  //     case 'estados':
  //       nuevosFiltros.estados = [];
  //       break;
  //     case 'paciente':
  //       setPacienteSeleccionado(null);
  //       setBusquedaPaciente('');
  //       nuevosFiltros.paciente_id = undefined;
  //       break;
  //   }
    
  //   setFilter(nuevosFiltros);
  //   aplicarFiltros(nuevosFiltros);
  // }, [filter, aplicarFiltros]);

  const limpiarFiltros = useCallback(() => {

    const fechaActual = new Date();
    const fechaHoy = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires'
    }).format(fechaActual);
    
    setOpenDropdown(null);
    setPacienteSeleccionado(null);
    setBusquedaPaciente('');
    router.push(`/turnos`);

    const filtrosBase = {
      fecha_desde: fechaHoy,
      fecha_hasta: fechaHoy,
      especialista_ids: [],
      especialidad_ids: [],
      estados: [],
    };
    setFilter(filtrosBase);
    aplicarFiltros(filtrosBase);
  }, [aplicarFiltros]);

  // Funciones para obtener los nombres de los filtros - Memoizadas
  // const getNombreEspecialista = useCallback((id: string) => {
  //   const esp = especialistas?.find((e: any) => e.id_usuario === id);
  //   return esp ? `${esp.apellido}, ${esp.nombre}` : 'Especialista filtrado';
  // }, [especialistas]);

  // const getNombreEspecialidad = useCallback((id: string) => {
  //   // Buscar en la lista filtrada también
  //   const esp = especialidadesFiltradas?.find((e: any) => e.id_especialidad === parseInt(id));
  //   return esp ? esp.nombre : 'Especialidad filtrada';
  // }, [especialidadesFiltradas]);

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

//  const getRolEspecialista = useCallback((id: string) => {
//   const esp = especialistas?.find((e: any) => e.id_usuario === id);
  
//   if (!esp) return 'Especialista';
//   return esp.rol?.nombre || 'Especialista';
// }, [especialistas]);


  // ============= BÚSQUEDA DE PACIENTES =============
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleBusquedaPacienteChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setBusquedaPaciente(valor);

    // Si se modificó el texto y había un paciente seleccionado, limpiar selección
    if (pacienteSeleccionado && valor !== `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellido}`) {
      setPacienteSeleccionado(null);
    }

    if (!valor.trim() || valor.trim().length < 2) {
      setPacientesSugeridos([]);
      setMostrarListaPacientes(false);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      return;
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setBuscandoPacientes(true);
    setMostrarListaPacientes(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const resultados = await obtenerPacientes(valor.trim(), 5);
        if (resultados.success && resultados.data) {
          setPacientesSugeridos(resultados.data);
        }
      } catch (e) {
        setPacientesSugeridos([]);
        setMostrarListaPacientes(false);
        console.error('Error buscando pacientes:', e);
      } finally {
        setBuscandoPacientes(false);
      }
    }, 300);
  }, [pacienteSeleccionado]);

  const handleSeleccionarPaciente = useCallback((paciente: { id_paciente: number; nombre: string; apellido: string, dni: string, telefono: string }) => {
    setPacienteSeleccionado(paciente);
    setBusquedaPaciente(`${paciente.nombre} ${paciente.apellido}`);
    setMostrarListaPacientes(false);
    const nuevosFiltros = { ...filter, paciente_id: paciente.id_paciente };
    setFilter(nuevosFiltros);
    aplicarFiltros(nuevosFiltros);
  }, [filter, aplicarFiltros]);

  const handleLimpiarPaciente = useCallback(() => {
    setPacienteSeleccionado(null);
    setBusquedaPaciente('');
    setPacientesSugeridos([]);
    setMostrarListaPacientes(false);
    const nuevosFiltros = { ...filter, paciente_id: undefined };
    setFilter(nuevosFiltros);
    aplicarFiltros(nuevosFiltros);
  }, [filter, aplicarFiltros]);

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-0">

      {/* Fila 1: Título + Botón */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-2xl sm:text-3xl font-bold shrink-0">Turnos</h3>
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

      {/* Fila 2: Filtros */}
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
              <div className="relative flex items-center">
                <Search size={13} className="absolute left-2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={busquedaPaciente}
                  onChange={handleBusquedaPacienteChange}
                  onFocus={() => pacientesSugeridos.length > 0 && setMostrarListaPacientes(true)}
                  onBlur={() => setTimeout(() => setMostrarListaPacientes(false), 200)}
                  placeholder="Buscar paciente..."
                  className="border rounded pl-6 pr-6 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-[170px]"
                />
                {busquedaPaciente && (
                  <button
                    onClick={handleLimpiarPaciente}
                    className="absolute right-1.5 text-gray-400 hover:text-gray-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
              {mostrarListaPacientes && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-[220px] max-h-60 overflow-y-auto">
                  {buscandoPacientes ? (
                    <div className="px-3 py-2 text-sm text-gray-500">Buscando...</div>
                  ) : pacientesSugeridos.length > 0 ? (
                    pacientesSugeridos.map((pac: any) => (
                      <button
                        key={pac.id_paciente}
                        onMouseDown={() => handleSeleccionarPaciente(pac)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex flex-col"
                      >
                        <span className="font-medium">{pac.apellido}, {pac.nombre}</span>
                        <span className="text-xs text-gray-500">
                          {pac.dni && <span className="mr-2">{pac.dni}</span>}
                          {pac.dni && pac.telefono && <span className="mr-2">•</span>}
                          {pac.telefono && <span>{pac.telefono}</span>}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">Sin resultados</div>
                  )}
                </div>
              )}
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

      {/* Mostrar filtros activos - Panel resumen */}
      {/* {filtrosActivos > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm font-medium text-gray-700 mb-2">Filtros Aplicados:</div> 
          <div className="flex flex-wrap gap-2">
            Filtros aplicados:
            {filter.fecha_desde && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center gap-1">
                Desde: {formatearFecha(filter.fecha_desde)}
                <button
                  onClick={() => handleRemoverFiltro('fecha_desde')}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  aria-label="Remover filtro de fecha desde"
                >
                  <X size={12} className="text-blue-600 hover:text-blue-800" />
                </button>
              </span>
            )}
            {filter.fecha_hasta && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center gap-1">
                Hasta: {formatearFecha(filter.fecha_hasta)}
                <button
                  onClick={() => handleRemoverFiltro('fecha_hasta')}
                  className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  aria-label="Remover filtro de fecha hasta"
                >
                  <X size={12} className="text-blue-600 hover:text-blue-800" />
                </button>
              </span>
            )}
            {Array.isArray(filter.especialista_ids) && ( // && filter.especialista_ids.length > 0 
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center gap-1">
                Especialistas: {
                filter.especialista_ids.length === especialistas.length || filter.especialista_ids.length === 0
                  ? 'Todos'
                  : filter.especialista_ids.map((id: string) => {
                  const especialista = especialistas.find(e => e.id_usuario === id);
                  return especialista ? especialista.apellido : id;
                }).join(', ')} 
                <button
                  onClick={() => handleRemoverFiltro('especialistas')}
                  className="ml-1 hover:bg-green-200 rounded-full p-0.5 transition-colors"
                  aria-label="Remover filtro de especialista"
                >
                  <X size={12} className="text-green-600 hover:text-green-800" />
                </button>
              </span>
            )}
            {Array.isArray(filter.especialidad_ids) && ( // filter.especialidad_ids.length > 0
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs flex items-center gap-1">
                Especialidades: {  filter.especialidad_ids.length === especialidadesFiltradas.length || filter.especialidad_ids.length === 0
                  ? 'Todas'
                  : filter.especialidad_ids.map((id: string) => {
                  const especialidad = especialidadesFiltradas.find(e => e.id_especialidad.toString() === id);
                  return especialidad ? especialidad.nombre : id;
                }).join(', ')}
                <button
                  onClick={() => handleRemoverFiltro('especialidades')}
                  className="ml-1 hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                  aria-label="Remover filtro de especialidad"
                >
                  <X size={12} className="text-purple-600 hover:text-purple-800" />
                </button>
              </span>
            )}
            {Array.isArray(filter.estados) && ( //  && filter.estados.length > 0
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs flex items-center gap-1">
                Estados: {filter.estados.length === estadosPosibles.filter(e => e.value).length || filter.estados.length === 0
                  ? 'Todos'
                  : filter.estados.map((estado: string) => {
                      const estadoInfo = estadosPosibles.find(e => e.value === estado);
                      return estadoInfo ? estadoInfo.label : estado;
                    }).join(', ')}
                <button
                  onClick={() => handleRemoverFiltro('estados')}
                  className="ml-1 hover:bg-orange-200 rounded-full p-0.5 transition-colors"
                  aria-label="Remover filtro de estado"
                >
                  <X size={12} className="text-orange-600 hover:text-orange-800" />
                </button>
              </span>
            )}
            {pacienteSeleccionado && (
              <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded-full text-xs flex items-center gap-1">
                Paciente: {pacienteSeleccionado.apellido}, {pacienteSeleccionado.nombre}
                <button
                  onClick={() => handleRemoverFiltro('paciente')}
                  className="ml-1 hover:bg-teal-200 rounded-full p-0.5 transition-colors"
                  aria-label="Remover filtro de paciente"
                >
                  <X size={12} className="text-teal-600 hover:text-teal-800" />
                </button>
              </span>
            )}
          </div>
        </div>
      )} */}

      <NuevoTurnoModal 
        isOpen={openNew} 
        onClose={() => setOpenNew(false)}
        onTurnoCreated={onTurnoCreated}
        especialistas={especialistas}
        pacientes={[]}
      />
    </div>
  );
}