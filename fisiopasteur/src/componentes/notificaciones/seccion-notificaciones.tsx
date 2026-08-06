"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/componentes/ui";
import { dayjs } from "@/lib/dayjs";
import type {
  NotificacionPendiente,
  NotificacionReciente,
} from "@/lib/actions/notificacion.action";

const PAGE_SIZE = 10;

const fmt = (iso: string | null) => (iso ? dayjs(iso).format("DD/MM HH:mm") : "—");

const enMinutos = (min: number | null) => {
  if (min == null) return "—";
  if (min <= 0) return "vencida";
  if (min < 60) return `en ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `en ${h} h` : `en ${Math.floor(h / 24)} d`;
};

type Variant = "pendiente" | "reciente";

interface Props {
  titulo: string;
  variant: Variant;
  rows: NotificacionPendiente[] | NotificacionReciente[];
  defaultOpen?: boolean;
  vacio?: string;
}

export function SeccionNotificaciones({
  titulo,
  variant,
  rows,
  defaultOpen = false,
  vacio = "Nada por acá 🎉",
}: Props) {
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(defaultOpen);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages - 1);
  const slice = rows.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="mb-4 rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 font-semibold"
      >
        <span className="flex items-center gap-2">
          {titulo}
          <Badge variant="brand-soft" size="sm" pill>{rows.length}</Badge>
        </span>
        <ChevronDown
          size={18}
          className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Fade + expand suave: grid-rows 0fr→1fr evita medir alturas. */}
      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-2 pb-3 pt-1 sm:px-4">
            {rows.length === 0 ? (
              <div className="py-3 text-sm text-muted-foreground">{vacio}</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  {variant === "pendiente" ? (
                    <TablaPendientes rows={slice as NotificacionPendiente[]} />
                  ) : (
                    <TablaRecientes rows={slice as NotificacionReciente[]} />
                  )}
                </div>

                {rows.length > PAGE_SIZE && (
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Página {pageSafe + 1} de {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={pageSafe === 0}
                        className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:bg-muted"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={pageSafe >= totalPages - 1}
                        className="rounded-md border border-border px-3 py-1 disabled:opacity-40 hover:bg-muted"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TablaPendientes({ rows }: { rows: NotificacionPendiente[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-xs uppercase tracking-wide text-muted-foreground">
        <tr>
          <th className="px-2 py-2 text-left font-semibold">Paciente</th>
          <th className="px-2 py-2 text-left font-semibold">Turno</th>
          <th className="px-2 py-2 text-left font-semibold">Especialista</th>
          <th className="px-2 py-2 text-left font-semibold">Teléfono</th>
          <th className="px-2 py-2 text-left font-semibold">Programado</th>
          <th className="px-2 py-2 text-left font-semibold">Estado</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-border">
            <td className="px-2 py-2">{r.paciente}</td>
            <td className="px-2 py-2 whitespace-nowrap">
              {r.turno_fecha ? `${dayjs(r.turno_fecha).format("DD/MM")} ${r.turno_hora ?? ""}` : "—"}
            </td>
            <td className="px-2 py-2">{r.especialista ?? "—"}</td>
            <td className="px-2 py-2 whitespace-nowrap">{r.telefono}</td>
            <td className="px-2 py-2 whitespace-nowrap">{fmt(r.programado_para)}</td>
            <td className="px-2 py-2">
              {r.vencida ? (
                <Badge variant="destructive" size="sm" pill>Vencida</Badge>
              ) : (
                <Badge variant="info" size="sm" pill>{enMinutos(r.minutos_restantes)}</Badge>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TablaRecientes({ rows }: { rows: NotificacionReciente[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-xs uppercase tracking-wide text-muted-foreground">
        <tr>
          <th className="px-2 py-2 text-left font-semibold">Estado</th>
          <th className="px-2 py-2 text-left font-semibold">Paciente</th>
          <th className="px-2 py-2 text-left font-semibold">Teléfono</th>
          <th className="px-2 py-2 text-left font-semibold">Programado</th>
          <th className="px-2 py-2 text-left font-semibold">Enviado</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-border">
            <td className="px-2 py-2">
              {r.estado === "enviado" ? (
                <Badge variant="success" size="sm" pill>Enviado</Badge>
              ) : (
                <Badge variant="destructive" size="sm" pill>Fallido</Badge>
              )}
            </td>
            <td className="px-2 py-2">{r.paciente}</td>
            <td className="px-2 py-2 whitespace-nowrap">{r.telefono}</td>
            <td className="px-2 py-2 whitespace-nowrap">{fmt(r.programado_para)}</td>
            <td className="px-2 py-2 whitespace-nowrap">{fmt(r.enviado_en)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
