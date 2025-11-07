"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Zap, AlertTriangle } from "lucide-react";

interface OcupacionBoxData {
  id_box: number;
  numeroBox: number;
  porcentajeUso: number;
  turnosHoy: number;
  maxTurnosEstimados: number;
}

interface OcupacionBoxesProps {
  boxes: OcupacionBoxData[];
  isLoading?: boolean;
}

function getColorPorcentaje(porcentaje: number): string {
  if (porcentaje >= 80) return "#ef4444"; // Rojo - Sobreutilizado
  if (porcentaje >= 60) return "#f59e0b"; // Naranja - Bien
  if (porcentaje >= 40) return "#3b82f6"; // Azul - Moderado
  return "#a3e635"; // Verde claro - Subutilizado
}

function getEtiquetaPorcentaje(porcentaje: number): {
  texto: string;
  color: string;
  icono: React.ReactNode;
} {
  if (porcentaje >= 80) {
    return {
      texto: "Sobreutilizado",
      color: "text-red-600",
      icono: <AlertTriangle className="w-4 h-4" />,
    };
  }
  if (porcentaje >= 60) {
    return {
      texto: "Bien ocupado",
      color: "text-amber-600",
      icono: <Zap className="w-4 h-4" />,
    };
  }
  return {
    texto: "Disponible",
    color: "text-green-600",
    icono: <Zap className="w-4 h-4" />,
  };
}

function BoxCard({ numeroBox, porcentajeUso, turnosHoy, maxTurnosEstimados }: OcupacionBoxData) {
  const etiqueta = getEtiquetaPorcentaje(porcentajeUso);
  const color = getColorPorcentaje(porcentajeUso);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-lg font-bold text-gray-900">Box {numeroBox}</p>
          <p className="text-xs text-gray-600">{turnosHoy} de {maxTurnosEstimados} turnos</p>
        </div>
        <div className={`flex items-center gap-1 ${etiqueta.color}`}>
          {etiqueta.icono}
          <span className="text-xs font-semibold">{etiqueta.texto}</span>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${porcentajeUso}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* Porcentaje */}
      <div className="mt-2 text-right">
        <span className="text-sm font-bold text-gray-900">{porcentajeUso.toFixed(0)}%</span>
      </div>
    </div>
  );
}

export function OcupacionBoxes({ boxes, isLoading = false }: OcupacionBoxesProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ocupación de Boxes - Hoy</h2>
        <div className="animate-pulse h-64 bg-gray-100 rounded" />
      </div>
    );
  }

  // Preparar datos para el gráfico
  const datosGrafico = boxes.map((box) => ({
    name: `Box ${box.numeroBox}`,
    ocupacion: box.porcentajeUso,
    disponible: 100 - box.porcentajeUso,
  }));

  const ocuactualGeneral = boxes.length > 0
    ? (boxes.reduce((sum, box) => sum + box.porcentajeUso, 0) / boxes.length).toFixed(1)
    : 0;

  const boxesSobreutilizados = boxes.filter((box) => box.porcentajeUso >= 80).length;
  const boxesDisponibles = boxes.filter((box) => box.porcentajeUso < 40).length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Ocupación de Boxes - Hoy</h2>

        {/* Indicadores de resumen */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-blue-50 rounded p-3 border border-blue-200">
            <p className="text-xs text-blue-600 font-medium">Ocupación Promedio</p>
            <p className="text-2xl font-bold text-blue-900">{ocuactualGeneral}%</p>
          </div>
          <div className="bg-red-50 rounded p-3 border border-red-200">
            <p className="text-xs text-red-600 font-medium">Sobreutilizados</p>
            <p className="text-2xl font-bold text-red-900">{boxesSobreutilizados}</p>
          </div>
          <div className="bg-green-50 rounded p-3 border border-green-200">
            <p className="text-xs text-green-600 font-medium">Disponibles</p>
            <p className="text-2xl font-bold text-green-900">{boxesDisponibles}</p>
          </div>
        </div>
      </div>

      {/* Gráfico de barras */}
      {boxes.length > 0 && (
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosGrafico} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value) => `${value.toFixed(1)}%`}
                contentStyle={{ backgroundColor: "#f3f4f6", border: "1px solid #e5e7eb" }}
              />
              <Bar dataKey="ocupacion" fill="#ef4444" name="Ocupación %" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Grid de tarjetas de boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {boxes.map((box) => (
          <BoxCard key={box.id_box} {...box} />
        ))}
      </div>

      {boxes.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600 font-medium">No hay boxes registrados</p>
        </div>
      )}
    </div>
  );
}
