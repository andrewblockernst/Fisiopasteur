'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Pencil, X, Phone, CalendarDays,
} from 'lucide-react';

type Especialidad = { id: number; nombre: string };
type Precio = { id: number; titulo: string; monto: number };

export type PerfilData = {
  id_usuario: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento?: string; 
  telefono?: string;
  especialidades: Especialidad[];
  precios: Precio[];
};

type Props = {
  initialData?: PerfilData;
  onBack?: () => void;
  onEditPerfil?: () => void;
  onEditPrecio?: (precio: Precio) => void;
  onRemoveEspecialidad?: (esp: Especialidad) => void;
};

const BRAND = '#9C1838';

function formatARS(n: number) {
  try { return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }); }
  catch { return `$${n.toFixed(0)}`; }
}

export default function PerfilVista({
  initialData,
  onBack,
  onEditPerfil,
  onEditPrecio,
  onRemoveEspecialidad,
}: Props) {
  const router = useRouter();
  const [perfil, setPerfil] = useState<PerfilData>(
    initialData ?? {
      id_usuario: 'mock-1',
      nombre: 'Lic. Marlene Beatriz',
      apellido: 'Lavooy Cesán',
      fecha_nacimiento: '15/01/1975',
      telefono: '+5491166782051',
      especialidades: [
        { id: 1, nombre: 'Kinesiología' },
        { id: 2, nombre: 'Acupuntura' },
        { id: 3, nombre: 'Pilates' },
        { id: 4, nombre: 'Osteopatía' },
      ],
      precios: [
        { id: 1, titulo: 'Kinesiología', monto: 15000 },
        { id: 2, titulo: 'Acupuntura',  monto: 42500 },
        { id: 3, titulo: 'Pilates',      monto: 22500 },
      ],
    }
  );

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleRemoveEspecialidad = (esp: Especialidad) => {
    if (onRemoveEspecialidad) return onRemoveEspecialidad(esp);
    setPerfil(p => ({ ...p, especialidades: p.especialidades.filter(e => e.id !== esp.id) }));
  };

  const handleEditPrecio = (precio: Precio) => {
    if (onEditPrecio) return onEditPrecio(precio);
    console.log('Editar precio', precio);
  };

  return (
    <main className="min-h-[100svh] text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-neutral-50/90 backdrop-blur border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 rounded-md active:scale-95 transition"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Perfil</h1>
          <button
            onClick={onEditPerfil}
            className="p-2 rounded-4xl active:scale-95 transition hover:bg-red-800 border-2 border-red-900 text-white"
            style={{ backgroundColor: BRAND }}
            aria-label="Editar perfil"
            title="Editar perfil"
          >
            <Pencil className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-6 lg:py-10">
        {/* Grid responsive: 1 col mobile, 12 cols desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Col izquierda: card de datos del especialista */}
          <section className="lg:col-span-5">
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6 lg:sticky lg:top-20">
              {/* Nombre grande */}
              <div className="text-center">
                <h2 className="text-2xl lg:text-3xl font-extrabold leading-snug">
                  {perfil.nombre}<br />{perfil.apellido}
                </h2>

                {/* Datos básicos */}
                <div className="mt-4 space-y-2 text-neutral-700">
                  {perfil.fecha_nacimiento && (
                    <p className="flex items-center justify-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      <span>{perfil.fecha_nacimiento}</span>
                    </p>
                  )}
                  {perfil.telefono && (
                    <p className="flex items-center justify-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span className="select-all">{perfil.telefono}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Especialidades */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-neutral-800 mb-2">Especialidades</h3>
                <div className="flex flex-wrap gap-2">
                  {perfil.especialidades.map((esp) => (
                    <span
                      key={esp.id}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium text-white shadow-sm"
                      style={{ backgroundColor: BRAND }}
                    >
                      {esp.nombre}
                      <button
                        className="p-1 rounded-full hover:bg-white/15 transition"
                        onClick={() => handleRemoveEspecialidad(esp)}
                        aria-label={`Quitar ${esp.nombre}`}
                        title="Quitar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Col derecha: precios / acciones */}
          <section className="lg:col-span-7">
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-neutral-900">Precios</h3>
                {/* botón para agregar precio en un futuro */}
                {/* <button className="text-sm px-3 py-1.5 rounded-md border border-neutral-300 hover:bg-neutral-50">Agregar</button> */}
              </div>

              <div className="mt-4 space-y-4">
                {perfil.precios.map((p) => (
                  <article
                    key={p.id}
                    className="flex items-center justify-between rounded-2xl bg-white border border-neutral-200 px-4 py-3 shadow-sm"
                  >
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-neutral-900 truncate">{p.titulo}</p>
                      <p className="text-[15px] font-semibold" style={{ color: BRAND }}>
                        {formatARS(p.monto)}
                      </p>
                    </div>

                    <button
                      onClick={() => handleEditPrecio(p)}
                      className="p-2 rounded-4xl active:scale-95 transition hover:bg-red-800 border-2 border-red-900 text-white"
                      style={{ backgroundColor: BRAND }}
                      aria-label={`Editar precio ${p.titulo}`}
                      title="Editar"
                    >
                      <Pencil className="w-4.5 h-4.5" />
                    </button>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}