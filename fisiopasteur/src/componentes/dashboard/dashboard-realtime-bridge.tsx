"use client";

import { useTurnoRealtime } from "@/hooks/useTurnoRealtime";
import { useInvalidateDashboard } from "@/hooks/useDashboardQuery";

/**
 * Mantiene una única suscripción Realtime al canal de `turno` y, en cada
 * cambio, invalida las queries del dashboard. Reemplaza las suscripciones
 * individuales que tenían los widgets.
 *
 * Mount-once en /inicio (RSC monta este client component).
 */
export function DashboardRealtimeBridge() {
  const invalidate = useInvalidateDashboard();
  useTurnoRealtime(invalidate);
  return null;
}
