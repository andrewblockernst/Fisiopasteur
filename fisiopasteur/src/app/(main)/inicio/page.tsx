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

export default async function Inicio() {
  const [usuario, turnos, ocupacionRes] = await Promise.all([
    obtenerUsuarioActual(),
    obtenerProximosTurnos(),
    obtenerOcupacionBoxes("semana"),
  ]);

  const nombreUsuario = usuario?.nombre?.trim() || "usuario";
  const ocupacionInitial = ocupacionRes.success
    ? { boxes: ocupacionRes.boxes, turnos: ocupacionRes.turnos, rango: ocupacionRes.rango }
    : null;

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
          <ProximosTurnosWidget initial={turnos} />
          {ocupacionInitial && <OcupacionBoxesWidget initial={ocupacionInitial} />}
        </div>
      </div>
    </div>
  );
}
