import { Suspense } from "react";
import { KPIsCardsConFiltro } from "@/componentes/dashboard/kpis-cards-con-filtro";
import { ProximosTurnosWidget } from "@/componentes/dashboard/proximos-turnos-widget";
import { OcupacionBoxesWidget } from "@/componentes/dashboard/ocupacion-boxes-widget";
import { DashboardRealtimeBridge } from "@/componentes/dashboard/dashboard-realtime-bridge";
import {
  obtenerProximosTurnos,
  obtenerOcupacionBoxes,
} from "@/lib/actions/dashboard.action";
import { obtenerUsuarioActual } from "@/lib/auth/usuario-actual";
import { PageHeader } from "@/componentes/ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

 
// cambio

async function ProximosTurnosSection() {
  const turnos = await obtenerProximosTurnos();
  return <ProximosTurnosWidget initial={turnos} />;
}

async function OcupacionBoxesSection() {
  const res = await obtenerOcupacionBoxes("semana");
  if (!res.success) return null;
  return (
    <OcupacionBoxesWidget
      initial={{ boxes: res.boxes, turnos: res.turnos, rango: res.rango }}
    />
  );
}

function SeccionSkeleton({ alto = "h-96" }: { alto?: string }) {
  return <div className={cn("rounded-md bg-muted/40 animate-pulse", alto)} />;
}

export default async function Inicio() {
  const usuario = await obtenerUsuarioActual();
  const nombreUsuario = usuario?.nombre?.trim() || "usuario";

  return (
    <div className="min-h-screen text-foreground">
      <DashboardRealtimeBridge />
      <div className="mx-auto w-full bg-background p-3 sm:p-6 lg:px-8 lg:pt-6">
        <PageHeader
          title={`Bienvenido ${nombreUsuario}`}
          description="Panel de control para especialistas y administradores"
        />

        <div className="mb-6 sm:mb-8">
          <KPIsCardsConFiltro />
        </div>

        <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8")}>
          <Suspense fallback={<SeccionSkeleton />}>
            <ProximosTurnosSection />
          </Suspense>

          <Suspense fallback={<SeccionSkeleton />}>
            <OcupacionBoxesSection />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
