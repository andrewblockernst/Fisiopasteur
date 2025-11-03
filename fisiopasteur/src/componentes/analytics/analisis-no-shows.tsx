    "use client";

    import { useState, useEffect, useCallback } from "react";
    import {
        BarChart,
        Bar,
        LineChart,
        Line,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        Legend,
        ResponsiveContainer,
        PieChart,
        Pie,
        Cell,
    } from "recharts";
    import {
        AnalisisNoShows,
        NoShowsPorEspecialista,
        NoShowsPorHorario,
        NoShowsPorDia,
        TendenciaNoShows,
        getAnalisisNoShows,
        getTendenciaNoShows,
        getNoShowsPorDia,
        getNoShowsPorHorario,
        getNoShowsPorEspecialista,
} from "@/lib/actions/analytics.action";


    export function AnalisisNoShowsComponent() {
    const [analisisGeneral, setAnalisisGeneral] = useState<AnalisisNoShows | null>(null);
    const [noShowsPorEspecialista, setNoShowsPorEspecialista] = useState<NoShowsPorEspecialista[]>([]);
    const [noShowsPorHorario, setNoShowsPorHorario] = useState<NoShowsPorHorario[]>([]);
    const [noShowsPorDia, setNoShowsPorDia] = useState<NoShowsPorDia[]>([]);
    const [tendencia, setTendencia] = useState<TendenciaNoShows[]>([]);
    const [loading, setLoading] = useState(true);
    const [periodo, setPeriodo] = useState<"dia" | "semana" | "mes">("mes");
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [fechaReferencia, setFechaReferencia] = useState(new Date());

    // ✅ Función para calcular fechas según período y referencia
    const calcularFechas = useCallback(() => {
        const referencia = new Date(fechaReferencia);
        let inicio = new Date();
        let fin = new Date();

        if (periodo === "dia") {
            // Día específico
            inicio = new Date(referencia);
            fin = new Date(referencia);
        } else if (periodo === "semana") {
            // Semana específica (lunes a domingo)
            inicio = new Date(referencia);
            const dia = referencia.getDay();
            const diferencia = referencia.getDate() - dia + (dia === 0 ? -6 : 1);
            inicio.setDate(diferencia);
            fin = new Date(inicio);
            fin.setDate(fin.getDate() + 6);
        } else if (periodo === "mes") {
            // Mes específico (del 1 al último día del mes)
            inicio = new Date(referencia.getFullYear(), referencia.getMonth(), 1);
            fin = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0);
        }

        return {
        inicio: inicio.toISOString().split("T")[0],
        fin: fin.toISOString().split("T")[0],
        };
    }, [periodo, fechaReferencia]);

    // ✅ Función para llamar al API
    const cargarDatos = useCallback(async () => {
        setLoading(true);
        try {
            // Si no hay fechas personalizadas, usar el período seleccionado
            let inicio = fechaInicio;
            let fin = fechaFin;

            console.log("fechas del estado:", inicio, fin);

            if (!inicio || !fin) {
                const fechas = calcularFechas();
                console.log("fechas calculadas:", fechas);

                inicio = fechas.inicio;
                fin = fechas.fin;
            }

            console.log("📡 Llamando a /api/analytics", inicio, fin);

            const response = await fetch(`/api/analytics?inicio=${inicio}&fin=${fin}`, {
                method: "GET",
                headers: {
                "Content-Type": "application/json",
                },
                cache: "default",
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                const { data } = result;
                
                // ✅ Actualizar todos los estados con los datos del API
                setAnalisisGeneral(data.general);
                setNoShowsPorEspecialista(data.especialistas);
                setNoShowsPorHorario(data.horarios);
                setNoShowsPorDia(data.dias);
                setTendencia(data.tendencia);
                
                console.log("✅ Datos cargados correctamente");
            } else {
            throw new Error(result.message);
            }
        } catch (error) {
            console.error("❌ Error cargando análisis:", error);
        } finally {
            setLoading(false);
        }
    }, [fechaInicio, fechaFin, calcularFechas]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    const handlePeriodoChange = (nuevoPeriodo: "dia" | "semana" | "mes") => {
        setPeriodo(nuevoPeriodo);
        setFechaInicio("");
        setFechaFin("");
        setFechaReferencia(new Date());
    };

    const navegar = (direccion: "anterior" | "siguiente") => {
        const nueva = new Date(fechaReferencia);
        if (periodo === "dia") {
        nueva.setDate(nueva.getDate() + (direccion === "siguiente" ? 1 : -1));
        } else if (periodo === "semana") {
        nueva.setDate(nueva.getDate() + (direccion === "siguiente" ? 7 : -7));
        } else if (periodo === "mes") {
        nueva.setMonth(nueva.getMonth() + (direccion === "siguiente" ? 1 : -1));
        }
        setFechaReferencia(nueva);
    };

    const obtenerEtiquetaPeriodo = () => {
        const ref = new Date(fechaReferencia);
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

        if (periodo === "dia") {
        return ref.toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        } else if (periodo === "semana") {
        const inicio = new Date(ref);
        const dia = ref.getDay();
        const diferencia = ref.getDate() - dia + (dia === 0 ? -6 : 1);
        inicio.setDate(diferencia);
        const fin = new Date(inicio);
        fin.setDate(fin.getDate() + 6);
        return `${inicio.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} - ${fin.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}`;
        } else if (periodo === "mes") {
        return `${meses[ref.getMonth()]} ${ref.getFullYear()}`;
        }
        return "";
    };

    useEffect(() => {
        if (!fechaInicio && !fechaFin) {
        cargarDatos();
        }
    }, [periodo, fechaReferencia, cargarDatos]);

    
    // const cargarDatos = async () => {
    //     setLoading(true);
    //     try {
    //     // Si no hay fechas personalizadas, usar el período seleccionado
    //     let inicio = fechaInicio;
    //     let fin = fechaFin;

    //     if (!inicio || !fin) {
    //         const fechas = calcularFechas();
    //         inicio = fechas.inicio;
    //         fin = fechas.fin;
    //     }

    //     const [general, especialistas, horarios, dias, tend] = await Promise.all([
    //         getAnalisisNoShows(inicio, fin),
    //         getNoShowsPorEspecialista(inicio, fin),
    //         getNoShowsPorHorario(inicio, fin),
    //         getNoShowsPorDia(inicio, fin),
    //         getTendenciaNoShows(inicio, fin),
    //     ]);

    //     setAnalisisGeneral(general);
    //     setNoShowsPorEspecialista(especialistas);
    //     setNoShowsPorHorario(horarios);
    //     setNoShowsPorDia(dias);
    //     setTendencia(tend);
    //     } catch (error) {
    //     console.error("Error cargando análisis:", error);
    //     } finally {
    //     setLoading(false);
    //     }
    // };

    const COLORES = ["#9C1838", "#82ca9d", "#ffc658", "#8884d8"];

    if (loading) {
        return (
        <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9C1838]"></div>
        </div>
        );
    }

    return (
        <div className="space-y-6 p-6 bg-gray-50 rounded-lg">
        {/* Filtros */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Período</h3>
            
            {/* Botones de período */}
            <div className="flex gap-2 mb-4">
            <button
                onClick={() => handlePeriodoChange("dia")}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                periodo === "dia"
                    ? "bg-[#9C1838] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
                Día
            </button>
            <button
                onClick={() => handlePeriodoChange("semana")}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                periodo === "semana"
                    ? "bg-[#9C1838] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
                Semana
            </button>
            <button
                onClick={() => handlePeriodoChange("mes")}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                periodo === "mes"
                    ? "bg-[#9C1838] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
            >
                Mes
            </button>
            </div>

            {/* Navegación de fechas */}
            <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200 mb-4">
            <button
                onClick={() => navegar("anterior")}
                className="p-2 hover:bg-white rounded-lg transition-colors border border-gray-300 hover:border-[#9C1838]"
                title="Período anterior"
            >
                <svg className="w-5 h-5 text-[#9C1838]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            
            <div className="text-center flex-1 px-4">
                <p className="text-sm font-semibold text-gray-600">
                {obtenerEtiquetaPeriodo().charAt(0).toUpperCase() + obtenerEtiquetaPeriodo().slice(1)}
                </p>
            </div>
            
            <button
                onClick={() => navegar("siguiente")}
                className="p-2 hover:bg-white rounded-lg transition-colors border border-gray-300 hover:border-[#9C1838]"
                title="Período siguiente"
            >
                <svg className="w-5 h-5 text-[#9C1838]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </button>
            </div>

            {/* Separador visual */}
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent my-4"></div>

            {/* Filtros personalizados */}
            <div>
            <p className="text-xs font-medium text-gray-600 mb-3">O selecciona un rango personalizado:</p>
            <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                    Fecha Inicio
                </label>
                <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => {
                    setFechaInicio(e.target.value);
                    setPeriodo("mes");
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                />
                </div>
                <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                    Fecha Fin
                </label>
                <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                />
                </div>
                <div className="flex items-end">
                <button
                    onClick={cargarDatos}
                    className="w-full md:w-auto px-4 py-2 bg-[#9C1838] text-white rounded-md text-sm font-medium hover:bg-[#7D1329] transition-colors"
                >
                    Aplicar
                </button>
                </div>
            </div>
            </div>
        </div>

        {/* KPIs Generales */}
        {analisisGeneral && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-xs font-medium text-gray-600 mb-1">Total Turnos</div>
                <div className="text-2xl font-bold text-gray-900">{analisisGeneral.totalTurnos}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-xs font-medium text-gray-600 mb-1">Atendidos</div>
                <div className="text-2xl font-bold text-green-600">{analisisGeneral.turnosAtendidos}</div>
                <div className="text-xs text-gray-500 mt-1">{analisisGeneral.tasaAsistencia.toFixed(1)}%</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-xs font-medium text-gray-600 mb-1">Programados</div>
                <div className="text-2xl font-bold text-blue-600">{analisisGeneral.turnosProgramados}</div>
                <div className="text-xs text-gray-500 mt-1">{((analisisGeneral.turnosProgramados / analisisGeneral.totalTurnos) * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-xs font-medium text-gray-600 mb-1">Cancelados</div>
                <div className="text-2xl font-bold text-orange-600">{analisisGeneral.turnosCancelados}</div>
                <div className="text-xs text-gray-500 mt-1">{analisisGeneral.tasaCancelacion.toFixed(1)}%</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="text-xs font-medium text-gray-600 mb-1">Tasa Cancelación</div>
                <div className="text-2xl font-bold text-[#9C1838]">{analisisGeneral.tasaCancelacion.toFixed(1)}%</div>
            </div>
            </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tendencia de No-Shows */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia - Últimas 4 Semanas</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={tendencia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="semana" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="atendidos" stroke="#82ca9d" name="Atendidos" />
                <Line type="monotone" dataKey="programados" stroke="#8884d8" name="Programados" />
                <Line type="monotone" dataKey="cancelaciones" stroke="#ffc658" name="Cancelaciones" />
                </LineChart>
            </ResponsiveContainer>
            </div>

            {/* Distribución de Estados */}
            {analisisGeneral && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Estados</h3>
                <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                    data={[
                        { name: "Atendidos", value: analisisGeneral.turnosAtendidos },
                        { name: "Programados", value: analisisGeneral.turnosProgramados },
                        { name: "Cancelados", value: analisisGeneral.turnosCancelados },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }: any) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    >
                    {COLORES.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                    ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
                </ResponsiveContainer>
            </div>
            )}

            {/* No-Shows por Horario */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Horario</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={noShowsPorHorario}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="horario" angle={-45} textAnchor="end" height={80} interval={0} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="atendidos" fill="#82ca9d" name="Atendidos" />
                <Bar dataKey="cancelaciones" fill="#ffc658" name="Cancelados" />
                <Bar dataKey="programados" fill="#8884d8" name="Programados" />
                </BarChart>
            </ResponsiveContainer>
            </div>

            {/* No-Shows por Día de la Semana */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Día</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={noShowsPorDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="atendidos" fill="#82ca9d" name="Atendidos" />
                <Bar dataKey="cancelaciones" fill="#ffc658" name="Cancelados" />
                <Bar dataKey="programados" fill="#8884d8" name="Programados" />
                </BarChart>
            </ResponsiveContainer>
            </div>
        </div>

        {/* Tabla de No-Shows por Especialista */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rendimiento por Especialista</h3>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-700">Especialista</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Total Turnos</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Atendidos</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Programados</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">% Asistencia</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">Cancelaciones</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700">% Cancelación</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                {noShowsPorEspecialista.map((especialista) => (
                    <tr key={especialista.id_especialista} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-900 font-medium">
                        {especialista.nombre} {especialista.apellido}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{especialista.totalTurnos}</td>
                    <td className="px-4 py-3 text-center text-green-600 font-medium">{especialista.atendidos}</td>
                    <td className="px-4 py-3 text-center text-blue-600 font-medium">{especialista.programados}</td>
                    <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        ((especialista.atendidos / especialista.totalTurnos) * 100) > 80 ? "bg-green-100 text-green-800" :
                        ((especialista.atendidos / especialista.totalTurnos) * 100) > 60 ? "bg-orange-100 text-orange-800" :
                        "bg-red-100 text-red-800"
                        }`}>
                        {((especialista.atendidos / especialista.totalTurnos) * 100).toFixed(1)}%
                        </span>
                    </td>
                    <td className="px-4 py-3 text-center text-orange-600 font-medium">{especialista.cancelados}</td>
                    <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        especialista.tasaCancelacion > 20 ? "bg-red-100 text-red-800" :
                        especialista.tasaCancelacion > 10 ? "bg-orange-100 text-orange-800" :
                        "bg-green-100 text-green-800"
                        }`}>
                        {especialista.tasaCancelacion.toFixed(1)}%
                        </span>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>
        </div>
    );
    }
