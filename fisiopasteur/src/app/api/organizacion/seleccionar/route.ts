import { NextRequest, NextResponse } from "next/server";
import { setOrganizacionActual } from "@/lib/services/organizacion.service";

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await request.json();

    if (!orgId) {
      return NextResponse.json(
        { error: "orgId es requerido" },
        { status: 400 }
      );
    }

    const result = await setOrganizacionActual(orgId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Error al seleccionar organización" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en API seleccionar organización:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
