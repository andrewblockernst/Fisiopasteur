"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, Filter, X } from "lucide-react";
import Button from "@/componentes/boton";

export default function FiltrosTurnos({ especialistas, especialidades, boxes, initial }: any) {
  const router = useRouter();
  const params = useSearchParams();
  const [f, setF] = useState(initial);
  const [tipoFiltro, setTipoFiltro] = useState<string>("");
  const [valorFiltro, setValorFiltro] = useState<string>("");

  useEffect(() => setF(initial), [params]);

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

  const aplicarFiltro = () => {
    if (!tipoFiltro || !valorFiltro) return;

    const nuevosFiltros = { ...f };

    switch (tipoFiltro) {
      case "fecha_desde":
        nuevosFiltros.fecha_desde = valorFiltro;
        break;
      case "fecha_hasta":
        nuevosFiltros.fecha_hasta = valorFiltro;
        break;
      case "especialista":
        nuevosFiltros.especialista_id = valorFiltro;
        break;
      case "especialidad":
        nuevosFiltros.especialidad_id = valorFiltro;
        break;
      case "estado":
        nuevosFiltros.estado = valorFiltro;
        break;
    }

    setF(nuevosFiltros);
    aplicarFiltros(nuevosFiltros);
    setTipoFiltro("");
    setValorFiltro("");
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

  const limpiarFiltros = () => {
    setF({});
    setTipoFiltro("");
    setValorFiltro("");
    router.push("/turnos");
  };

  const renderCampoValor = () => {
    if (!tipoFiltro) return null;

    switch (tipoFiltro) {
      case "fecha_desde":
      case "fecha_hasta":
        return (
          <input
            type="date"
            value={valorFiltro}
            onChange={(e) => setValorFiltro(e.target.value)}
            className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      case "especialista":
        return (
          <select
            value={valorFiltro}
            onChange={(e) => setValorFiltro(e.target.value)}
            className="border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Seleccionar especialista...</option>
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
            onChange={(e) => setValorFiltro(e.target.value)}
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
            onChange={(e) => setValorFiltro(e.target.value)}
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

  const filtrosActivos = Object.keys(f).filter(key => f[key as keyof typeof f]).length;

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
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
          <Button
            variant="primary"
            onClick={aplicarFiltro}
            disabled={!tipoFiltro || !valorFiltro}
            className="flex items-center gap-2"
          >
            <Search size={16} />
            Filtrar
          </Button>

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

      {/* Mostrar filtros activos */}
      {filtrosActivos > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {f.fecha_desde && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                Desde: {formatearFecha(f.fecha_desde)}
              </span>
            )}
            {f.fecha_hasta && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                Hasta: {formatearFecha(f.fecha_hasta)}
              </span>
            )}
            {f.especialista_id && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                Especialista: {getNombreEspecialista(f.especialista_id)}
              </span>
            )}
            {f.especialidad_id && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                Especialidad: {getNombreEspecialidad(f.especialidad_id)}
              </span>
            )}
            {f.estado && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                Estado: {f.estado}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}