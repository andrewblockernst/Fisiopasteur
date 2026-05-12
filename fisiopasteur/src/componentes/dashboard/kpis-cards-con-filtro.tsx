"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle, XCircle, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  obtenerKPIsConHistorial,
  type PeriodoFiltro,
  type KPIHistorico,
  type KPIsDashboard,
} from "@/lib/actions/dashboard.action";
import { getEspecialistas } from "@/lib/actions/especialista.action";
import { useAuth } from "@/hooks/AuthContext";

interface KPICardMetricsProps {
  titulo: string;
  valor: number;
  icono: React.ReactNode;
  color: string;
  datos: KPIHistorico[];
  dataKey: "Programados" | "Atendidos" | "Cancelaciones" | "Ingresos";
  descripcion: string;
  periodo: PeriodoFiltro;
  esMoneda?: boolean;
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
  esMoneda = false,
}: KPICardMetricsProps) {
  const tickFormatter = (value: string) => {
    if (periodo === "hoy") {
      return `${value}:00`;
    } else {
      return new Date(value + "T00:00:00").toLocaleDateString("es-ES", { month: "short", day: "numeric" });
    }
  };

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(valor);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">{titulo}</p>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-bold ${color}`}>{esMoneda ? formatearMoneda(valor) : valor}</p>
            <p className="text-xs text-gray-500">{descripcion}</p>
          </div>
        </div>
        <div className={`${color} bg-opacity-10 rounded-lg p-3 flex-shrink-0`}>
          {icono}
        </div>
      </div>

      <div className="w-full h-48 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} margin={{ top: 10, right: 15, left: 15, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis
              dataKey="fecha"
              tick={{ fontSize: 12 }}
              tickFormatter={tickFormatter}
              tickLine={false}
              tickCount={2}
              interval={periodo === "hoy" ? 22 : periodo === "semana" ? 5 : 28}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#f3f4f6", border: "1px solid #e5e7eb" }}
              formatter={(value) => [esMoneda ? formatearMoneda(value as number) : value, titulo]}
              labelFormatter={(label) => `${label}${periodo === "hoy" ? ":00" : ""}`}
            />
            <Bar
              dataKey={dataKey}
              fill={
                color.includes("blue") ? "#2563eb" :
                color.includes("green") ? "#16a34a" :
                color.includes("orange") ? "#ea580c" :
                color.includes("yellow") ? "#cb9610ff" :
                "#6b7280"
              }
              radius={[0, 0, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface EspecialistaSimple {
  id_usuario: string;
  nombre: string;
  apellido: string;
}

interface KPIsCardsConFiltroProps {
  loading?: boolean;
}

export function KPIsCardsConFiltro({ loading = false }: KPIsCardsConFiltroProps) {
  const { user, loading: authLoading } = useAuth();
  const puedeVerTodos = user?.puedeGestionarTurnos ?? false;

  const [periodo, setPeriodo] = useState<PeriodoFiltro>("hoy");
  const [especialistaId, setEspecialistaId] = useState<string>("");
  const [especialistas, setEspecialistas] = useState<EspecialistaSimple[]>([]);
  const [datos, setDatos] = useState<KPIHistorico[]>([]);
  const [totales, setTotales] = useState<KPIsDashboard>({
    Programados: 0,
    Atendidos: 0,
    Cancelaciones: 0,
    Ingresos: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Cargar lista de especialistas (solo para admin/programador)
  useEffect(() => {
    if (!puedeVerTodos) return;
    getEspecialistas({ status: "activos" }).then((res) => {
      if (res.success) {
        setEspecialistas(
          (res.data as any[]).map((e: any) => ({
            id_usuario: e.id_usuario,
            nombre: e.nombre,
            apellido: e.apellido,
          }))
        );
      }
    });
  }, [puedeVerTodos]);

  // Cargar KPIs — esperar a que la auth esté resuelta para no mostrar datos sin filtro
  useEffect(() => {
    if (authLoading) return;

    const cargarDatos = async () => {
      setIsLoading(true);
      try {
        // Para especialistas, el servidor fuerza su propio ID; para admin, pasamos el seleccionado
        const idAFiltrar = puedeVerTodos ? (especialistaId || undefined) : undefined;
        const resultado = await obtenerKPIsConHistorial(periodo, idAFiltrar);
        if (resultado.success) {
          setDatos(resultado.datos);
          setTotales(resultado.total);
        } else {
          console.error("Error cargando KPIs:", resultado.error);
        }
      } catch (error) {
        console.error("Error cargando KPIs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    cargarDatos();
  }, [periodo, especialistaId, puedeVerTodos, authLoading]);

  const filtrosPeriodo: { label: string; value: PeriodoFiltro }[] = [
    { label: "Hoy", value: "hoy" },
    { label: "Esta Semana", value: "semana" },
    { label: "Este Mes", value: "mes" },
  ];

  if (authLoading || isLoading || loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between gap-2 mb-6">
          <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
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
      {/* Barra de controles */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Selector de especialista — solo para admin/programador */}
        {puedeVerTodos ? (
          <select
            value={especialistaId}
            onChange={(e) => setEspecialistaId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
          >
            <option value="">Todos los especialistas</option>
            {especialistas.map((e) => (
              <option key={e.id_usuario} value={e.id_usuario}>
                {e.nombre} {e.apellido}
              </option>
            ))}
          </select>
        ) : (
          <div />
        )}

        {/* Filtros de período */}
        <div className="flex gap-2">
          {filtrosPeriodo.map((filtro) => (
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
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICardWithChart
          titulo="Programados"
          valor={totales.Programados}
          icono={<Clock className="w-6 h-6 text-blue-600" />}
          color="text-blue-600"
          datos={datos}
          dataKey="Programados"
          descripcion=""
          periodo={periodo}
        />

        <KPICardWithChart
          titulo="Atendidos"
          valor={totales.Atendidos}
          icono={<CheckCircle className="w-6 h-6 text-green-600" />}
          color="text-green-600"
          datos={datos}
          dataKey="Atendidos"
          descripcion=""
          periodo={periodo}
        />

        <KPICardWithChart
          titulo="Cancelaciones"
          valor={totales.Cancelaciones}
          icono={<XCircle className="w-6 h-6 text-orange-600" />}
          color="text-orange-600"
          datos={datos}
          dataKey="Cancelaciones"
          descripcion=""
          periodo={periodo}
        />

        <KPICardWithChart
          titulo="Ingresos"
          valor={totales.Ingresos}
          icono={<DollarSign className="w-6 h-6 text-yellow-600" />}
          color="text-yellow-600"
          datos={datos}
          dataKey="Ingresos"
          descripcion="Total"
          periodo={periodo}
          esMoneda={true}
        />
      </div>
    </div>
  );
}
