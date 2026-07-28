'use client';

import { ReactNode } from 'react';
import {
  Mail,
  Phone,
  Palette,
  Stethoscope,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/componentes/ui';
import { cn, formatoNumeroTelefono } from '@/lib/utils';
import type { PerfilCompleto } from '@/lib/actions/perfil.action';
import type { EstadisticasEspecialista } from '@/lib/actions/especialista.action';

interface Props {
  perfil: PerfilCompleto;
  estadisticas: EstadisticasEspecialista | null;
  loadingEstadisticas?: boolean;
  title: string;
  description?: string;
  actions?: ReactNode;
  preciosTitle?: string;
  preciosDescription?: string;
  preciosBody?: ReactNode;
  footer?: ReactNode;
}

export function PerfilEspecialistaDesktop({
  perfil,
  estadisticas,
  loadingEstadisticas = false,
  title,
  description,
  actions,
  preciosTitle = 'Precios',
  preciosDescription,
  preciosBody,
  footer,
}: Props) {
  const colorBadge = perfil.color || '#9C1838';
  const iniciales = `${perfil.nombre?.[0] ?? ''}${perfil.apellido?.[0] ?? ''}`.toUpperCase();
  const rolNombre = perfil.rol?.nombre || 'Usuario';

  return (
    <div className="hidden lg:block">
      <PageHeader title={title} description={description} />

      <div className="mx-auto w-full px-4 sm:px-6 lg:px-8 pb-10 space-y-6 max-w-[1500px]">
        {/* Hero card */}
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="relative">
            <div
              className="h-24 w-full"
              style={{
                background: `linear-gradient(135deg, ${colorBadge} 0%, ${colorBadge}cc 100%)`,
              }}
              aria-hidden
            />
            <div className="px-6 sm:px-8 pb-6 -mt-12">
              <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
                <div className="flex items-end gap-4">
                  <div
                    className="w-24 h-24 rounded-2xl border-4 border-card shadow-md flex items-center justify-center text-2xl font-bold text-white shrink-0"
                    style={{ backgroundColor: colorBadge }}
                    aria-hidden
                  >
                    {iniciales || '?'}
                  </div>
                  <div className="min-w-0 pb-1">
                    <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground truncate">
                      {perfil.nombre} {perfil.apellido}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft/60 text-brand px-2.5 py-0.5 text-xs font-medium">
                        <Stethoscope className="w-3 h-3" />
                        {rolNombre}
                      </span>
                      {perfil.color && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted text-muted-foreground px-2.5 py-0.5 text-xs font-medium">
                          <Palette className="w-3 h-3" />
                          <span
                            className="inline-block w-3 h-3 rounded-full border border-border"
                            style={{ backgroundColor: perfil.color }}
                          />
                          <span className="font-mono">{perfil.color}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {actions && (
                  <div className="flex flex-wrap items-center gap-2 lg:shrink-0 pb-1">
                    {actions}
                  </div>
                )}
              </div>

              {/* Contact + especialidades */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Contacto
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="truncate select-all">{perfil.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-foreground">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="select-all">
                      {perfil.telefono ? formatoNumeroTelefono(perfil.telefono) : '—'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Especialidades
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {perfil.especialidades.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin especialidades asignadas.</p>
                    ) : (
                      perfil.especialidades.map((esp) => (
                        <span
                          key={esp.id_especialidad}
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm"
                          style={{ backgroundColor: colorBadge }}
                        >
                          {esp.nombre}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <ResumenActividad estadisticas={estadisticas} loading={loadingEstadisticas} />

        {/* Precios */}
        {preciosBody && (
          <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <header className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">{preciosTitle}</h3>
                {preciosDescription && (
                  <p className="text-sm text-muted-foreground mt-0.5">{preciosDescription}</p>
                )}
              </div>
            </header>
            <div className="p-4 sm:p-6">{preciosBody}</div>
          </section>
        )}

        {footer}
      </div>
    </div>
  );
}

interface ResumenActividadProps {
  estadisticas: EstadisticasEspecialista | null;
  loading?: boolean;
  className?: string;
}

export function ResumenActividad({ estadisticas, loading, className }: ResumenActividadProps) {
  return (
    <section className={className}>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
        Resumen de actividad
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Turnos atendidos"
          value={estadisticas?.turnos_atendidos_total}
          icon={<CalendarCheck className="w-5 h-5" />}
          tone="success"
          loading={loading}
        />
        <StatCard
          label="Atendidos este mes"
          value={estadisticas?.turnos_atendidos_mes}
          icon={<CalendarDays className="w-5 h-5" />}
          tone="brand"
          loading={loading}
        />
        <StatCard
          label="Próximos turnos"
          value={estadisticas?.turnos_proximos}
          icon={<CalendarClock className="w-5 h-5" />}
          tone="info"
          loading={loading}
        />
        <StatCard
          label="Pacientes únicos"
          value={estadisticas?.pacientes_unicos}
          icon={<Users className="w-5 h-5" />}
          tone="warning"
          loading={loading}
        />
      </div>
    </section>
  );
}

interface StatCardProps {
  label: string;
  value: number | undefined;
  icon: ReactNode;
  tone: 'brand' | 'info' | 'success' | 'warning';
  loading?: boolean;
}

const toneStyles: Record<StatCardProps['tone'], { bg: string; text: string; border: string }> = {
  brand: { bg: 'bg-brand-soft/60', text: 'text-brand', border: 'border-brand-soft' },
  info: { bg: 'bg-info/10', text: 'text-info', border: 'border-info/30' },
  success: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/30' },
  warning: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30' },
};

function StatCard({ label, value, icon, tone, loading }: StatCardProps) {
  const s = toneStyles[tone];
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center gap-3">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', s.bg, s.text)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
          {label}
        </p>
        {loading ? (
          <div className="mt-1 h-7 w-12 bg-muted animate-pulse rounded" />
        ) : (
          <p className="text-2xl font-bold text-foreground leading-tight">
            {value ?? '—'}
          </p>
        )}
      </div>
    </div>
  );
}
