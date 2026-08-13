'use client';

import { useEffect, useState, useTransition } from 'react';
import { PerfilCompleto, actualizarPerfil, obtenerPreciosUsuarioEspecialidades, guardarPrecioUsuarioEspecialidad } from '@/lib/actions/perfil.action';
import { getEstadisticasEspecialista, EstadisticasEspecialista } from '@/lib/actions/especialista.action';
import { useToastStore } from '@/stores/toast-store';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Pencil, Phone, Mail, CircleDollarSign, ChevronDown, LogOut,
  Palette, HelpCircle
} from 'lucide-react';
import Button from '../boton';
import { getSupabaseClient } from '@/lib/supabase/client';
import EditarPerfilDialog from './editarperfil-dialog';
import { formatoNumeroTelefono } from '@/lib/utils';
import { useAuth } from '@/hooks/usePerfil';
import { useReportNavigationLoading } from '@/hooks/useReportNavigationLoading';
import { PerfilEspecialistaDesktop, ResumenActividad } from '@/componentes/especialista/perfil-especialista-desktop';

interface PerfilClienteProps {
  perfil: PerfilCompleto;
}

const BRAND = '#9C1838';

export default function PerfilCliente({ perfil }: PerfilClienteProps) {
  const [, startTransition] = useTransition();
  const router = useRouter();
  const { addToast } = useToastStore();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !authLoading && !user) {
      window.location.href = '/login';
    }
  }, [isAuthenticated, authLoading, user]);

  // Precios reales por especialidad
  const [precios, setPrecios] = useState<Record<number, { precio_particular: number; precio_obra_social: number; activo: boolean }>>({});
  const [cargandoPrecios, setCargandoPrecios] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [planSeleccionado, setPlanSeleccionado] = useState<Record<number, 'particular' | 'obra_social'>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const [estadisticas, setEstadisticas] = useState<EstadisticasEspecialista | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await obtenerPreciosUsuarioEspecialidades();
      if (res.success && Array.isArray(res.data)) {
        const dict: Record<number, { precio_particular: number; precio_obra_social: number; activo: boolean }> = {};
        for (const r of res.data as any[]) {
          const id = r.especialidad?.id_especialidad ?? r.id_especialidad;
          if (id != null) {
            dict[id] = {
              precio_particular: Number(r.precio_particular || 0),
              precio_obra_social: Number(r.precio_obra_social || 0),
              activo: r.activo ?? true,
            };
          }
        }
        setPrecios(dict);
      }
      setCargandoPrecios(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingStats(true);
      const res = await getEstadisticasEspecialista(perfil.id_usuario);
      if (res.success) setEstadisticas(res.data ?? null);
      setLoadingStats(false);
    })();
  }, [perfil.id_usuario]);

  const handleBack = () => router.push('/inicio');

  const onCerrarSesion = async () => {
    try {
      // Ver nota en herramientas.tsx: signOut desde el cliente evita la
      // invalidación automática del Router Cache que produce Next cuando
      // se mutan cookies dentro de un Server Action.
      await getSupabaseClient().auth.signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      window.location.replace('/login');
    }
  };

  useReportNavigationLoading(cargandoPrecios);

  if (cargandoPrecios) {
    return null;
  }

  const preciosBody = (
    <div className="space-y-3">
      {perfil.especialidades.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No tiene especialidades asignadas.
        </p>
      )}

      {perfil.especialidades.map((esp) => {
        const valores = precios[esp.id_especialidad] || { precio_particular: 0, precio_obra_social: 0, activo: true };
        const plan = planSeleccionado[esp.id_especialidad] || 'particular';
        const valorActual = plan === 'particular' ? valores.precio_particular : valores.precio_obra_social;
        const isExpanded = expanded[esp.id_especialidad];

        return (
          <article
            key={esp.id_especialidad}
            className={`rounded-xl bg-card border-2 transition-all ${
              isExpanded ? 'border-brand shadow-md' : 'border-border hover:border-brand/40'
            }`}
          >
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors rounded-t-xl"
              onClick={() => setExpanded(prev => ({ ...prev, [esp.id_especialidad]: !prev[esp.id_especialidad] }))}
              aria-expanded={!!isExpanded}
              aria-controls={`esp-controls-${esp.id_especialidad}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-sm shrink-0"
                  style={{ backgroundColor: BRAND }}
                >
                  {esp.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-base font-semibold text-foreground truncate">{esp.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    Particular ${valores.precio_particular || 0} · Obra social ${valores.precio_obra_social || 0}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-muted-foreground transition-transform ${
                  isExpanded ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </button>

            {isExpanded && (
              <div
                id={`esp-controls-${esp.id_especialidad}`}
                className="px-4 pb-4 pt-2 border-t border-border bg-muted/30"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                      Tipo de plan
                    </label>
                    <select
                      className="border border-input rounded-lg px-3 py-2 bg-background hover:border-brand/40 focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors text-sm w-full"
                      value={plan}
                      onChange={(e) => setPlanSeleccionado(prev => ({ ...prev, [esp.id_especialidad]: e.target.value as 'particular' | 'obra_social' }))}
                    >
                      <option value="particular">Particular</option>
                      <option value="obra_social">Obra Social</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                      Monto
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                        $
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9.,]*"
                        className="border border-input rounded-lg pl-7 pr-3 py-2 w-full bg-background hover:border-brand/40 focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors text-sm font-semibold"
                        placeholder="0,00"
                        value={valorActual.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.,]/g, '');
                          const normalized = val.replace(/\./g, '').replace(',', '.');
                          const enteros = normalized.split('.')[0] || '';
                          if (enteros.length > 6) return;
                          const nuevo = Number(normalized);

                          setPrecios(prev => ({
                            ...prev,
                            [esp.id_especialidad]: {
                              ...valores,
                              precio_particular: plan === 'particular' ? nuevo : valores.precio_particular,
                              precio_obra_social: plan === 'obra_social' ? nuevo : valores.precio_obra_social,
                            }
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  className="mt-3 w-full"
                  disabled={savingId === esp.id_especialidad}
                  onClick={async () => {
                    setSavingId(esp.id_especialidad);
                    const payload = precios[esp.id_especialidad] || { precio_particular: 0, precio_obra_social: 0, activo: true };
                    const res = await guardarPrecioUsuarioEspecialidad(esp.id_especialidad, payload);
                    setSavingId(null);
                    addToast({
                      variant: res.success ? 'success' : 'error',
                      message: res.success ? 'Precios guardados' : 'Error al guardar precios',
                      description: res.success ? undefined : (res.error || undefined),
                    });
                  }}
                >
                  {savingId === esp.id_especialidad ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );

  const desktopFooter = (
    <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <header className="px-6 py-4 border-b border-border">
        <h3 className="text-base font-semibold text-foreground">Cuenta</h3>
        <p className="text-sm text-muted-foreground">Ayuda y sesión</p>
      </header>
      <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => router.push('/centro-de-ayuda')}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border-2 border-border hover:border-brand hover:bg-brand-soft/40 transition-colors text-sm font-semibold text-foreground"
        >
          <HelpCircle className="w-5 h-5" />
          Centro de ayuda
        </button>
        <button
          type="button"
          onClick={onCerrarSesion}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border-2 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors text-sm font-semibold"
        >
          <LogOut className="w-5 h-5" />
          Cerrar sesión
        </button>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen text-foreground">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-md active:scale-95 transition hover:bg-gray-100"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold text-center flex-1">Perfil</h1>
          <button
            onClick={() => setEditDialogOpen(true)}
            className="p-2 rounded-4xl active:scale-95 transition hover:bg-red-800 border-2 border-red-900 text-white ml-auto"
            style={{ backgroundColor: BRAND }}
            aria-label="Editar perfil"
            title="Editar perfil"
          >
            <Pencil className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile view */}
      <div className="lg:hidden bg-background p-4">
        <div className="text-center mt-4">
          <h2 className="text-[28px] leading-tight font-extrabold">
            {perfil.nombre}<br />{perfil.apellido}
          </h2>

          <div className="mt-4 space-y-1 text-neutral-700">
            <p className="flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />
              <span className="select-all">{perfil.email}</span>
            </p>
            <p className="flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" />
              <span className="select-all">{formatoNumeroTelefono(perfil.telefono || '—')}</span>
            </p>
            <p className='flex items-center justify-center gap-2'>
              <Palette className="w-4 h-4" />
              <span
                style={{ backgroundColor: perfil.color ?? '', borderRadius: '50%', display: 'inline-block', width: 18, height: 18, border: '1px solid #ccc' }}
                title={perfil.color ?? ''}
              />
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {perfil.especialidades.map((esp) => (
              <span
                key={esp.id_especialidad}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm"
                style={{ backgroundColor: BRAND }}
              >
                {esp.nombre}
              </span>
            ))}
          </div>
        </div>

        {/* Precios mobile */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-white border-b border-gray-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center shadow-md">
                <CircleDollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Gestión de precios</h3>
                <p className="text-sm text-muted-foreground">Configure sus tarifas por especialidad</p>
              </div>
            </div>
          </div>
          <div className="p-4">{preciosBody}</div>
        </div>

        {/* Resumen de actividad mobile */}
        <div className="mt-6">
          <ResumenActividad estadisticas={estadisticas} loading={loadingStats} />
        </div>

        {/* Cuenta mobile */}
        <div className="mt-6 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="bg-white border-b border-border px-6 py-4">
            <h3 className="text-base font-bold text-gray-900">Cuenta</h3>
            <p className="text-sm text-muted-foreground">Ayuda y sesión</p>
          </div>
          <div className="p-4 grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => router.push('/centro-de-ayuda')}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border-2 border-border hover:border-brand hover:bg-brand-soft/40 transition-colors text-sm font-semibold text-gray-800"
            >
              <HelpCircle className="w-5 h-5" />
              Centro de ayuda
            </button>
            <button
              type="button"
              onClick={onCerrarSesion}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border-2 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors text-sm font-semibold"
            >
              <LogOut className="w-5 h-5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* Desktop view */}
      <PerfilEspecialistaDesktop
        perfil={perfil}
        estadisticas={estadisticas}
        loadingEstadisticas={loadingStats}
        title="Mi perfil"
        description="Información personal, especialidades y tarifas."
        actions={
          <Button type="button" onClick={() => setEditDialogOpen(true)} variant="secondary">
            Editar perfil
          </Button>
        }
        preciosTitle="Gestión de precios"
        preciosDescription="Configurá tus tarifas particulares y de obra social."
        preciosBody={preciosBody}
        footer={desktopFooter}
      />

      <EditarPerfilDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        perfil={perfil}
      />
    </div>
  );
}
