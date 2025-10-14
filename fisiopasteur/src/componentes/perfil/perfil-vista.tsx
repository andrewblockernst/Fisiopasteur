'use client';

import { useEffect, useState, useTransition } from 'react';
import { PerfilCompleto, actualizarPerfil, obtenerPreciosUsuarioEspecialidades, guardarPrecioUsuarioEspecialidad } from '@/lib/actions/perfil.action';
import { useToastStore } from '@/stores/toast-store';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Pencil, X, Phone, CalendarDays, Mail, User, CircleDollarSign, ChevronDown, LogOut,
  Palette, Stethoscope, Award, Briefcase
} from 'lucide-react';
import Button from '../boton';
import { handleCerrarSesion } from '@/lib/actions/logOut.action';
import EditarPerfilDialog from './editarperfil-dialog';
import { formatoNumeroTelefono, formatARS } from '@/lib/utils';
import UnifiedSkeletonLoader from '@/componentes/unified-skeleton-loader';

interface PerfilClienteProps {
  perfil: PerfilCompleto;
}

const BRAND = '#9C1838';

export default function PerfilCliente({ perfil }: PerfilClienteProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { addToast } = useToastStore();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Estado de precios reales por especialidad
  const [precios, setPrecios] = useState<Record<number, { precio_particular: number; precio_obra_social: number; activo: boolean }>>({});
  const [cargandoPrecios, setCargandoPrecios] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [planSeleccionado, setPlanSeleccionado] = useState<Record<number, 'particular' | 'obra_social'>>({});

  const todasEspecialidades = [
    ...(perfil.especialidad_principal ? [perfil.especialidad_principal] : []),
    ...perfil.especialidades_adicionales
  ];

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

  // Estado de expansión por especialidad
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const result = await actualizarPerfil(formData);
      addToast({
        variant: result.success ? 'success' : 'error',
        message: result.success ? 'Perfil actualizado' : 'No se pudo actualizar el perfil',
        description: result.message,
      });
      if (result.success) {
        router.refresh();
      }
    });
  };

  const handleEditPrecio = (precio: { id: number; titulo: string; monto: number }) => {
  };

  const handleBack = () => router.push('/inicio');

  const onCerrarSesion = () => {
    handleCerrarSesion(router);
  };

  // Mostrar skeleton loader mientras cargan los precios
  if (cargandoPrecios) {
    return (
      <UnifiedSkeletonLoader 
        type="form" 
        showHeader={true} 
        showFilters={false}
      />
    );
  }

  {/*VISTA PERFIL*/}
  return (
    <div className="min-h-screen text-black">
      {/* Mobile Header - Solo móvil */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 sm:hidden">
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

      {/* Contenido Principal */}
  <div className="max-w-[1500px] mx-auto p-4 sm:p-6 lg:px-6 lg:pt-8">
        {/* Desktop Header */}
        <div className="hidden sm:flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold">Perfil</h2>
          <Button
            type="button"
            onClick={() => setEditDialogOpen(true)}
            variant="secondary"
          >
            Editar Perfil
          </Button>
        </div>

        {/* Grid: 1 col mobile / 2 cols desktop (izq info + der precios) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* IZQUIERDA */}
          <div className="lg:col-span-7">
            {/* Card de información profesional - Solo desktop */}
            <div className="hidden lg:block bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-sm p-8">
              <div className="text-center">
                <h2 className="text-[32px] leading-tight font-bold text-gray-900 lg:text-[38px]">
                  {perfil.nombre} {perfil.apellido}
                </h2>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-center gap-3 text-gray-700 hover:text-gray-900 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span className="select-all text-base">{perfil.email}</span>
                  </div>

                  <div className="flex items-center justify-center gap-3 text-gray-700 hover:text-gray-900 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                      <Phone className="w-4 h-4" />
                    </div>
                    <span className="select-all text-base">{formatoNumeroTelefono(perfil.telefono || '—')}</span>
                  </div>

                  <div className='flex items-center justify-center gap-3 text-gray-700'>
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                      <Palette className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-5 h-5 rounded-full border-2 border-gray-300 shadow-sm" 
                        style={{ backgroundColor: perfil.color ?? '' }} 
                        title={perfil.color ?? ''}
                      />
                      <span className="text-sm text-gray-600">{perfil.color}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Especialidades */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-500 tracking-wide mb-4 text-center">
                  Especialidades
                </h3>
                <div className="flex flex-wrap gap-1 justify-center">
                  {perfil.especialidad_principal && (
                    <span
                      className="inline-flex items-center gap-1 rounded-2xl px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
                      style={{ backgroundColor: BRAND }}
                    >
                      {perfil.especialidad_principal.nombre}
                      <span className="ml-1 text-[10px] opacity-80 bg-white/20 rounded px-1 py-0.5">Principal</span>
                    </span>
                  )}

                  {perfil.especialidades_adicionales.map((esp) => (
                    <span
                      key={esp.id_especialidad}
                      className="inline-flex items-center gap-1 rounded-2xl px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
                      style={{ backgroundColor: `${BRAND}CC` }}
                    >
                      {esp.nombre}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile view - Sin cambios */}
            <div className="lg:hidden text-center mt-4">
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
                  <span style={{ backgroundColor: perfil.color ?? '', borderRadius: '50%', display: 'inline-block', width: 18, height: 18, border: '1px solid #ccc' }} title={perfil.color ?? ''}></span>
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3 justify-center">
                {perfil.especialidad_principal && (
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm"
                    style={{ backgroundColor: BRAND }}
                  >
                    {perfil.especialidad_principal.nombre}
                    <span className="ml-1 text-xs opacity-75">(Principal)</span>
                  </span>
                )}

                {perfil.especialidades_adicionales.map((esp) => (
                  <span
                    key={esp.id_especialidad}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm"
                    style={{ backgroundColor: `${BRAND}B3` }}
                  >
                    {esp.nombre}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/*GESTIÓN DE PRECIOS*/}
          <div className="lg:col-span-5">
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#9C1838] to-[#7D1329] flex items-center justify-center shadow-md">
                    <CircleDollarSign className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Gestión de Precios</h3>
                    <p className="text-sm text-gray-500">Configure sus tarifas por especialidad</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {cargandoPrecios && (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">Cargando precios…</p>
                  </div>
                )}

                {!cargandoPrecios && todasEspecialidades.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">No tiene especialidades asignadas.</p>
                  </div>
                )}

                {!cargandoPrecios && todasEspecialidades.map((esp) => {
                  const valores = precios[esp.id_especialidad] || { precio_particular: 0, precio_obra_social: 0, activo: true };
                  const plan = planSeleccionado[esp.id_especialidad] || 'particular';
                  const valorActual = plan === 'particular' ? valores.precio_particular : valores.precio_obra_social;
                  const isExpanded = expanded[esp.id_especialidad];
                  
                  return (
                    <article 
                      key={esp.id_especialidad} 
                      className={`rounded-xl bg-white border-2 transition-all duration-200 ${
                        isExpanded 
                          ? 'border-[#9C1838] shadow-lg' 
                          : 'border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
                      }`}
                    >
                      {/* Header colapsable */}
                      <button
                        type="button"
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-t-xl"
                        onClick={() => setExpanded(prev => ({ ...prev, [esp.id_especialidad]: !prev[esp.id_especialidad] }))}
                        aria-expanded={!!isExpanded}
                        aria-controls={`esp-controls-${esp.id_especialidad}`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-sm shadow-sm"
                            style={{ backgroundColor: BRAND }}
                          >
                            {esp.nombre.charAt(0)}
                          </div>
                          <div className="text-left">
                            <p className="text-base font-bold text-gray-900">
                              {esp.nombre}
                            </p>
                            {perfil.especialidad_principal && esp.id_especialidad === perfil.especialidad_principal.id_especialidad && (
                              <span className="text-xs text-gray-500 font-medium">Principal</span>
                            )}
                          </div>
                        </div>
                        <ChevronDown 
                          className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : 'rotate-0'
                          }`} 
                        />
                      </button>

                      {/* Contenido expandible */}
                      {isExpanded && (
                        <div 
                          id={`esp-controls-${esp.id_especialidad}`} 
                          className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50"
                        >
                          <div className="space-y-4">
                            {/* Selector de plan */}
                            <div className="flex flex-col">
                              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                                Tipo de Plan
                              </label>
                              <select
                                className="border-2 border-gray-200 rounded-lg px-4 py-2.5 bg-white hover:border-gray-300 focus:border-[#9C1838] focus:ring-2 focus:ring-[#9C1838]/20 transition-colors text-sm font-medium"
                                value={plan}
                                onChange={(e) => setPlanSeleccionado(prev => ({ ...prev, [esp.id_especialidad]: e.target.value as 'particular' | 'obra_social' }))}
                              >
                                <option value="particular">Particular</option>
                                <option value="obra_social">Obra Social</option>
                              </select>
                            </div>

                            {/* Input de precio */}
                            <div className="flex flex-col">
                              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
                                Monto
                              </label>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">
                                  $
                                </span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  pattern="[0-9.,]*"
                                  className="border-2 border-gray-200 rounded-lg pl-10 pr-4 py-2.5 w-full bg-white hover:border-gray-300 focus:border-[#9C1838] focus:ring-2 focus:ring-[#9C1838]/20 transition-colors text-base font-semibold"
                                  placeholder="0,00"
                                  value={valorActual
                                    .toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                                    .replace(/\./g, '.')
                                    .replace(/,/g, ',')}
                                  onChange={(e) => {
                                    let val = e.target.value.replace(/[^0-9.,]/g, '');
                                    const normalized = val
                                      .replace(/\./g, '') 
                                      .replace(',', '.'); 
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

                            {/* Botón guardar */}
                            <Button
                              type="button"
                              className="w-full font-semibold py-2.5 bg-[#9C1838] hover:bg-[#7D1329] text-black active:scale-[0.98] transition-all shadow-md hover:shadow-lg"
                              disabled={savingId === esp.id_especialidad}
                              onClick={async () => {
                                setSavingId(esp.id_especialidad);
                                const payload = precios[esp.id_especialidad] || { precio_particular: 0, precio_obra_social: 0, activo: true };
                                const res = await guardarPrecioUsuarioEspecialidad(esp.id_especialidad, payload);
                                setSavingId(null);
                                addToast({
                                  variant: res.success ? 'success' : 'error',
                                  message: res.success ? 'Precios guardados exitosamente' : 'Error al guardar precios',
                                  description: res.success ? undefined : (res.error || undefined),
                                });
                              }}
                            >
                              {savingId === esp.id_especialidad ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
            {/* Botón cerrar sesión SOLO en mobile */}
            <div className="sm:hidden mt-8 flex justify-center">
              <Button
                type="button"
                onClick={onCerrarSesion}
                variant="danger"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Cerrar sesión
              </Button>
            </div>
          </div>
        </div>

        {/* Dialog de edición */}
        <EditarPerfilDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          perfil={perfil}
        />
      </div>
    </div>
  );
}