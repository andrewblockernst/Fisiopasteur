import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/componentes/ui";
import { obtenerEstadoNotificaciones } from "@/lib/actions/notificacion.action";
import { SeccionNotificaciones } from "@/componentes/notificaciones/seccion-notificaciones";
import { RefreshButton } from "./refresh-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Notificaciones - Fisiopasteur",
  description: "Estado de las notificaciones de WhatsApp",
};

function Tarjeta({ n, label, tono }: { n: number; label: string; tono: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className={`text-3xl font-bold leading-none ${tono}`}>{n}</div>
      <div className="mt-1.5 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export default async function NotificacionesPage() {
  const res = await obtenerEstadoNotificaciones();
  if (!res.ok) {
    if (res.error === "No autorizado") redirect("/login");
    return (
      <div className="mx-auto w-full bg-background p-3 sm:px-6 lg:px-8">
        <PageHeader title="Notificaciones" showTitle />
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Error: {res.error}
        </div>
      </div>
    );
  }

  const { data } = res;
  const { resumen } = data;

  return (
    <div className="h-[calc(100dvh-5rem)] lg:h-[100dvh] flex flex-col text-foreground overflow-hidden">
      {/* Header fijo */}
      <div className="shrink-0 mx-auto w-full bg-background px-3 pt-2 sm:px-6 lg:px-8">
        <PageHeader
          title="Notificaciones"
          description={
            data.esAdmin
              ? "Estado de las notificaciones de WhatsApp de todo el centro"
              : "Estado de las notificaciones de WhatsApp de tus turnos"
          }
          showTitle
          actions={<RefreshButton />}
        />
      </div>

      {/* Solo esta zona scrollea; overscroll-contain corta el bounce */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain mx-auto w-full bg-background px-3 pb-6 sm:px-6 lg:px-8">
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Tarjeta n={resumen.vencidas} label="Vencidas sin procesar" tono="text-destructive" />
          <Tarjeta n={resumen.proximas} label="Próximas a enviar" tono="text-info" />
          <Tarjeta n={resumen.enviadas_semana} label="Enviadas (7 días)" tono="text-success" />
          <Tarjeta n={resumen.fallidas_semana} label="Fallidas (7 días)" tono="text-destructive" />
          <Tarjeta n={resumen.pendientes_total} label="Pendientes total" tono="text-warning" />
        </div>

        <SeccionNotificaciones
          titulo="Vencidas sin procesar"
          variant="pendiente"
          rows={data.vencidas}
          defaultOpen
        />
        <SeccionNotificaciones
          titulo="Próximas a enviar"
          variant="pendiente"
          rows={data.proximas}
          defaultOpen
          vacio="Sin notificaciones próximas."
        />
        <SeccionNotificaciones
          titulo="Últimos 7 días"
          variant="reciente"
          rows={data.recientes}
          vacio="Sin envíos en los últimos 7 días."
        />
      </div>
    </div>
  );
}
