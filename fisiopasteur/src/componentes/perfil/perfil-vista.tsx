'use client';

import { useEffect, useState, useTransition } from 'react';
import { PerfilCompleto, actualizarPerfil, obtenerPreciosUsuarioEspecialidades, guardarPrecioUsuarioEspecialidad } from '@/lib/actions/perfil.action';
import { useToastStore } from '@/stores/toast-store';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Pencil, X, Phone, CalendarDays, Mail, User, CircleDollarSign, ChevronDown
} from 'lucide-react';
import Button from '../boton';

interface PerfilClienteProps {
  perfil: PerfilCompleto;
}

const BRAND = '#9C1838';

function formatARS(n: number) {
  try {
    return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  } catch {
    return `$${n.toFixed(0)}`;
  }
}

export default function PerfilCliente({ perfil }: PerfilClienteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { addToast } = useToastStore();

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
        setIsEditing(false);
        router.refresh();
      }
    });
  };

  const handleEditPrecio = (precio: { id: number; titulo: string; monto: number }) => {
    console.log('Editar precio', precio);
  };

  const handleBack = () => router.push('/inicio');

  /* ============ VISTA DE EDICIÓN ============ */
  if (isEditing) {
    return (
      <div className="min-h-screen">
        {/* Mobile Header - Solo móvil */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 sm:hidden">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsEditing(false)}
              className="p-2 -ml-2 rounded-md active:scale-95 transition hover:bg-gray-100"
              aria-label="Cancelar"
            >
              <X className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">Editar Perfil</h1>
            <div className="w-10" />
          </div>
        </header>

        {/* Contenido Principal */}
        <div className="container mx-auto p-4 sm:p-6 lg:pr-6 lg:pt-8">
          {/* Desktop Header */}
          <div className="hidden sm:flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold">Editar Perfil</h2>
          </div>

          <form action={handleSubmit} className="max-w-2xl mx-auto space-y-6">
            {/* feedback solo via toast */}

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Nombre</label>
                  <input
                    type="text"
                    name="nombre"
                    defaultValue={perfil.nombre}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[--brand] focus:border-[--brand] transition"
                    style={{ ['--brand' as any]: BRAND }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Apellido</label>
                  <input
                    type="text"
                    name="apellido"
                    defaultValue={perfil.apellido}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[--brand] focus:border-[--brand] transition"
                    style={{ ['--brand' as any]: BRAND }}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={perfil.email}
                    readOnly
                    className="w-full px-4 py-3 border border-neutral-200 bg-neutral-50 rounded-xl text-neutral-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    defaultValue={perfil.telefono || ''}
                    placeholder="+54911..."
                    className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[--brand] focus:border-[--brand] transition"
                    style={{ ['--brand' as any]: BRAND }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Color</label>
                  <input
                    type="color"
                    name="color"
                    defaultValue={perfil.color || BRAND}
                    className="h-12 cursor-pointer "
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6 sm:hidden">
              <Button
                type="button"
                onClick={() => setIsEditing(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                variant="primary"
                className="flex-1"
              >
                {isPending ? 'Guardando…' : 'Guardar Cambios'}
              </Button>
            </div>

            {/* Botón desktop */}
            <div className="hidden sm:block pt-6">
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  variant="secondary"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  variant="primary"
                >
                  {isPending ? 'Guardando…' : 'Guardar Cambios'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  {/*VISTA PERFIL*/}
  return (
    <div className="min-h-screen">
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
          <h1 className="text-lg font-semibold">Perfil</h1>
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 rounded-4xl active:scale-95 transition hover:bg-red-800 border-2 border-red-900 text-white"
            style={{ backgroundColor: BRAND }}
            aria-label="Editar perfil"
            title="Editar perfil"
          >
            <Pencil className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <div className="container mx-auto p-4 sm:p-6 lg:pr-6 lg:pt-8">
        {/* Desktop Header */}
        <div className="hidden sm:flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold">Perfil</h2>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 border border-neutral-300 rounded-xl font-medium text-neutral-700 hover:bg-neutral-50 active:scale-95 transition"
          >
            Editar Perfil
          </button>
        </div>

        {/* feedback solo via toast */}

        {/* Grid: 1 col mobile / 2 cols desktop (izq info + der precios) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* IZQUIERDA */}
          <div className="lg:col-span-7">
            <div className="text-center">
              <h2 className="text-[28px] leading-tight font-extrabold lg:text-[34px]">
                {perfil.nombre}<br />{perfil.apellido}
              </h2>

              <div className="mt-4 space-y-1 text-neutral-700">
                <p className="flex items-center justify-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span className="select-all">{perfil.email}</span>
                </p>

                <p className="flex items-center justify-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span className="select-all">{perfil.telefono || '—'}</span>
                </p>
              </div>
            </div>

            {/* Chips (igual al mock) */}
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
                  style={{ backgroundColor: `${BRAND}B3` }} // 70% opacity
                >
                  {esp.nombre}
                </span>
              ))}
            </div>
          </div>

          {/*PRECIOS PIBE*/}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
              <div className="px-6 pt-5 pb-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${BRAND}1A` }}>
                  <CircleDollarSign className="w-5 h-5" style={{ color: BRAND }} />
                </div>
                <h3 className="text-base font-semibold text-neutral-800">Precios</h3>
              </div>

              <div className="px-4 pb-5 space-y-4">
                {cargandoPrecios && (
                  <p className="text-sm text-neutral-500">Cargando precios…</p>
                )}

                {!cargandoPrecios && todasEspecialidades.length === 0 && (
                  <p className="text-sm text-neutral-500">No tenés especialidades asignadas.</p>
                )}

                {!cargandoPrecios && todasEspecialidades.map((esp) => {
                  const valores = precios[esp.id_especialidad] || { precio_particular: 0, precio_obra_social: 0, activo: true };
                  const plan = planSeleccionado[esp.id_especialidad] || 'particular';
                  const valorActual = plan === 'particular' ? valores.precio_particular : valores.precio_obra_social;
                  return (
                    <article key={esp.id_especialidad} className="rounded-2xl bg-white border border-neutral-200 px-4 py-4 shadow-sm">
                      {/* Header colapsable: nombre + flecha */}
                      <button
                        type="button"
                        className="w-full flex items-center justify-between mb-2"
                        onClick={() => setExpanded(prev => ({ ...prev, [esp.id_especialidad]: !prev[esp.id_especialidad] }))}
                        aria-expanded={!!expanded[esp.id_especialidad]}
                        aria-controls={`esp-controls-${esp.id_especialidad}`}
                      >
                        <p className="text-[15px] font-semibold text-neutral-900 truncate text-left">
                          {esp.nombre}
                          {perfil.especialidad_principal && esp.id_especialidad === perfil.especialidad_principal.id_especialidad && (
                            <span className="ml-2 text-xs text-neutral-500">(Principal)</span>
                          )}
                        </p>
                        <ChevronDown className={`w-5 h-5 text-neutral-600 transition-transform ${expanded[esp.id_especialidad] ? 'rotate-0' : '-rotate-90'}`} />
                      </button>

                      {/* tipo_plan + agregar precio + guardar */}
                      {expanded[esp.id_especialidad] && (
                      <div id={`esp-controls-${esp.id_especialidad}`} className="grid grid-cols-1 sm:grid-cols-[180px_1fr_auto] gap-2 items-end">
                        <div className="flex flex-col">
                          <label className="text-xs mb-1">Seleccionar plan</label>
                          <select
                            className="border rounded px-3 py-2"
                            value={plan}
                            onChange={(e) => setPlanSeleccionado(prev => ({ ...prev, [esp.id_especialidad]: e.target.value as 'particular' | 'obra_social' }))}
                          >
                            <option value="particular">Particular</option>
                            <option value="obra_social">Obra Social</option>
                          </select>
                        </div>

                        <div className="flex flex-col">
                          <label className="text-xs mb-1">Precio</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                              $
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              pattern="[0-9.,]*"
                              className="border rounded pl-6 pr-3 py-2 w-full"
                              value={valorActual
                                .toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                                .replace(/\./g, '.')
                                .replace(/,/g, ',')}
                              onChange={(e) => {
                                // Permitir solo números, puntos y comas,
                                let val = e.target.value.replace(/[^0-9.,]/g, '');

                                // Reemplazar puntos por nada (separador de miles), comas por punto (decimal)
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

                        <div className="flex">
                            <Button
                            type="button"
                            className="font-medium text-black active:scale-95 transition "
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
                            {savingId === esp.id_especialidad ? 'Guardando' : 'Guardar'}
                            </Button>
                        </div>
                      </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
