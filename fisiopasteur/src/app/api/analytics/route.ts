import { NextRequest, NextResponse } from "next/server";
import {
    getAnalisisNoShows,
    getNoShowsPorEspecialista,
    getNoShowsPorHorario,
    getNoShowsPorDia,
    getTendenciaNoShows,
} from "@/lib/actions/analytics.action";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const fechaInicio = searchParams.get("inicio");
        const fechaFin = searchParams.get("fin");

        if (!fechaInicio || !fechaFin) {
            return NextResponse.json(
                { success: false, message: "Faltan parámetros de fecha" },
                { status: 400 }
            );
        }

        console.log("🌐 API /analytics llamada", fechaInicio, fechaFin);
        const inicio = performance.now();

        // 🔥 Cargar TODO en paralelo
        const [general, especialistas, horarios, dias, tendencia] = await Promise.all([
            getAnalisisNoShows(fechaInicio, fechaFin),
            getNoShowsPorEspecialista(fechaInicio, fechaFin),
            getNoShowsPorHorario(fechaInicio, fechaFin),
            getNoShowsPorDia(fechaInicio, fechaFin),
            getTendenciaNoShows(fechaInicio, fechaFin),
        ]);

        const duracion = performance.now() - inicio;
        console.log(`⏱️ API tardó ${duracion.toFixed(2)}ms`);

        // ✅ HTTP CACHE HEADERS (esto SÍ funciona)
        return NextResponse.json(
            {
                success: true,
                data: {
                    general,
                    especialistas,
                    horarios,
                    dias,
                    tendencia,
                },
            },
            {
                headers: {
                    // 🚀 Navegador cachea 5 minutos
                    "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
                    // 🔐 Validar con servidor si es necesario
                    "ETag": `"${fechaInicio}-${fechaFin}"`, // -${Date.now()}
                },
            }
        );
    } catch (error) {
        console.error("❌ Error en API analytics:", error);
        return NextResponse.json(
            {
                success: false,
                message: "Error obteniendo datos de analytics",
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}