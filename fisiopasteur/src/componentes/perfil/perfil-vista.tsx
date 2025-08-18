'use client';

import { useState, useTransition } from 'react';
import { PerfilCompleto, actualizarPerfil } from '@/lib/actions/perfil.action';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Pencil, X, Phone, CalendarDays, Mail, User
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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  // Simulación de precios por especialidad (hasta tener tabla real)
  const preciosSimulados = [
    { id: 1, titulo: perfil.especialidad_principal?.nombre || 'Consulta General', monto: 15000 },
    ...perfil.especialidades_adicionales.map((esp, index) => ({
      id: index + 2,
      titulo: esp.nombre,
      monto: 20000 + (index * 2500)
    }))
  ];

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
      const result = await actualizarPerfil(formData);
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
      if (result.success) {
        setIsEditing(false);
        router.refresh();
      }
      setTimeout(() => setMessage(null), 2800);
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
            {message && (
              <div
                className={`p-4 rounded-xl ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {message.text}
              </div>
            )}

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

        {message && (
          <div
            className={`mb-6 p-4 rounded-xl max-w-2xl mx-auto ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

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

          {/* DERECHA – PRECIOS (card como en la captura) */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
              <div className="px-6 pt-5 pb-3">
                <h3 className="text-base font-semibold text-neutral-800">Precios</h3>
              </div>

              <div className="px-3 pb-5 space-y-3">
                {preciosSimulados.map((precio) => (
                  <article
                    key={precio.id}
                    className="flex items-center justify-between rounded-2xl bg-white border border-neutral-200 px-4 py-4 shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-neutral-900">{precio.titulo}</p>
                      <p className="text-[15px] font-semibold" style={{ color: BRAND }}>
                        {formatARS(precio.monto)}
                      </p>
                    </div>

                    <button
                      onClick={() => handleEditPrecio(precio)}
                      className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 active:scale-95 transition"
                      aria-label={`Editar precio ${precio.titulo}`}
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}