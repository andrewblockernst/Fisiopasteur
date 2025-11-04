"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  obtenerKPIsConHistorial,
  type PeriodoFiltro,
  type KPIHistorico,
  type KPIsDashboard,
} from "@/lib/actions/dashboard.action";

interface KPICardMetricsProps {
  titulo: string;
  valor: number;
  icono: React.ReactNode;
  color: string;
  datos: KPIHistorico[];
  dataKey: "turnosHoy" | "turnosAtendidos" | "cancelaciones" | "notificacionesEnviadas";
  descripcion: string;
  periodo: PeriodoFiltro;
}

function KPICardWithChart({
  titulo,
  valor,
  icono,
  color,
  datos,
  dataKey,
  descripcion,
  periodo,
}: KPICardMetricsProps) {
  // Determinar formato del eje X según período
  const tickFormatter = (value: string) => {
    if (periodo === "hoy") {
      // Para "hoy", mostrar la hora (ej: "14:00", "15:00")
      return `${value}:00`;
    } else {
      // Para semana y mes, mostrar fecha abreviada
      return new Date(value).toLocaleDateString("es-ES", { month: "short", day: "numeric" });
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">{titulo}</p>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-bold ${color}`}>{valor}</p>
            <p className="text-xs text-gray-500">{descripcion}</p>
          </div>
        </div>
        <div className={`${color} bg-opacity-10 rounded-lg p-3 flex-shrink-0`}>
          {icono}
        </div>
      </div>

      {/* Gráfico */}
      <div className="w-full h-48 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis
              dataKey="fecha"
              tick={{ fontSize: 12 }}
              tickFormatter={tickFormatter}
              interval={periodo === "hoy" ? 23 : periodo === "semana" ? 6 : 28} // Mostrar cada 24 horas para "hoy"
            />
            {/* <YAxis tick={{ fontSize: 12 }} /> */}
            <Tooltip
              contentStyle={{ backgroundColor: "#f3f4f6", border: "1px solid #e5e7eb" }}
              formatter={(value) => [value, titulo]}
              labelFormatter={(label) => `${label}${periodo === "hoy" ? ":00" : ""}`}
            />
            <Bar 
              dataKey={dataKey} 
              fill={
                color.includes("blue") ? "#2563eb" :
                color.includes("green") ? "#16a34a" :
                color.includes("orange") ? "#ea580c" :
                color.includes("purple") ? "#9333ea" :
                "#6b7280"
              } 
              radius={[4, 4, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface KPIsCardsConFiltroProps {
  loading?: boolean;
}

export function KPIsCardsConFiltro({ loading = false }: KPIsCardsConFiltroProps) {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("hoy");
  const [datos, setDatos] = useState<KPIHistorico[]>([]);
  const [totales, setTotales] = useState<KPIsDashboard>({
    turnosHoy: 0,
    turnosAtendidosSemana: 0,
    cancelacionesMes: 0,
    notificacionesEnviadas: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      setIsLoading(true);
      try {
        const resultado = await obtenerKPIsConHistorial(periodo);
        setDatos(resultado.datos);
        setTotales(resultado.total);
      } catch (error) {
        console.error("Error cargando KPIs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    cargarDatos();
  }, [periodo]);

  const filtros: { label: string; value: PeriodoFiltro }[] = [
    { label: "Hoy", value: "hoy" },
    { label: "Esta Semana", value: "semana" },
    { label: "Este Mes", value: "mes" },
  ];

  if (isLoading || loading) {
    return (
      <div className="space-y-4">
        {/* Filtros skeleton */}
        <div className="flex justify-end gap-2 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 h-96 animate-pulse">
              <div className="h-4 w-20 bg-gray-200 rounded mb-4" />
              <div className="h-8 w-16 bg-gray-200 rounded mb-4" />
              <div className="h-40 bg-gray-100 rounded mt-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Filtros - Arriba a la derecha */}
      <div className="flex justify-end gap-2 mb-6">
        {filtros.map((filtro) => (
          <button
            key={filtro.value}
            onClick={() => setPeriodo(filtro.value)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              periodo === filtro.value
                ? "bg-[#9C1838] text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {filtro.label}
          </button>
        ))}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICardWithChart
          titulo="Turnos"
          valor={totales.turnosHoy}
          icono={<Clock className="w-6 h-6 text-blue-600" />}
          color="text-blue-600"
          datos={datos}
          dataKey="turnosHoy"
          descripcion="Programados"
          periodo={periodo}
        />

        <KPICardWithChart
          titulo="Atendidos"
          valor={totales.turnosAtendidosSemana}
          icono={<CheckCircle className="w-6 h-6 text-green-600" />}
          color="text-green-600"
          datos={datos}
          dataKey="turnosAtendidos"
          descripcion="Atendidos"
          periodo={periodo}
        />

        <KPICardWithChart
          titulo="Cancelaciones"
          valor={totales.cancelacionesMes}
          icono={<XCircle className="w-6 h-6 text-orange-600" />}
          color="text-orange-600"
          datos={datos}
          dataKey="cancelaciones"
          descripcion="Cancelados"
          periodo={periodo}
        />

        <KPICardWithChart
          titulo="Notificaciones"
          valor={totales.notificacionesEnviadas}
          icono={<MessageSquare className="w-6 h-6 text-purple-600" />}
          color="text-purple-600"
          datos={datos}
          dataKey="notificacionesEnviadas"
          descripcion="Enviadas"
          periodo={periodo}
        />
      </div>
    </div>
  );
}
