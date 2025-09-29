/**
 * ARCHIVO OBSOLETO - YA NO SE USA
 * 
 * El formulario de crear turnos ahora es un modal (NuevoTurnoModal) 
 * en lugar de una página separada.
 * 
 * Se mantiene temporalmente para evitar errores de compilación,
 * pero debería eliminarse en futuras versiones.
 */

"use client";

import { useMemo, useState, useEffect } from 'react';
import {
  ArrowLeft, UserPlus2, Bell, Package, Repeat, ChevronDown,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTurnoForm } from '@/hooks/useTurnoForm';
import SkeletonLoader from '@/componentes/skeleton-loader';
import { NuevoPacienteDialog } from '@/componentes/paciente/nuevo-paciente-dialog';
import { useToastStore } from '@/stores/toast-store';
import type { SelectOption } from '@/types/database.types';

export default function NuevoTurnoMobilePage() {
  const router = useRouter();
  const toast = useToastStore();
  
  // Usar el hook consolidado para la lógica de turnos
  const {
    formData,
    updateFormData,
    especialistas,
    pacientes,
    especialidadesDisponibles,
    boxesDisponibles,
    loading,
    isSubmitting,
    cargarDatos,
    crearNuevoTurno,
    isHoraDisponible
  } = useTurnoForm();

  // Estados específicos de la UI móvil
  const [mesBase, setMesBase] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(new Date());
  const [recSel, setRecSel] = useState<string>('3h');
  const [repSel, setRepSel] = useState<string>('none');

  // Sheets (paneles) laterales/modales
  const [openPacientes, setOpenPacientes] = useState(false);
  const [openHorarios, setOpenHorarios] = useState(false);
  const [openEspecialidades, setOpenEspecialidades] = useState(false);
  const [openEspecialistas, setOpenEspecialistas] = useState(false);
  const [openBoxes, setOpenBoxes] = useState(false);
  const [openRecordatorio, setOpenRecordatorio] = useState(false);
  const [openRepetir, setOpenRepetir] = useState(false);
  const [showNuevoPacienteDialog, setShowNuevoPacienteDialog] = useState(false);

  // Opciones de horarios - cada 15 minutos de 6:00 a 23:00
  const horarios = useMemo(() => {
    const slots = [];
    for (let hour = 6; hour <= 23; hour++) {
      for (let minutes = 0; minutes < 60; minutes += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const label = new Date(2000, 0, 1, hour, minutes).toLocaleTimeString('es-AR', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        });
        slots.push({ label, value: time });
      }
    }
    return slots;
  }, []);

  const recordatorios = [
    { label: '15 minutos antes', value: '15m' },
    { label: '1 hora antes', value: '1h' },
    { label: '3 horas antes', value: '3h' },
    { label: '12 horas antes', value: '12h' },
    { label: '1 día antes', value: '1d' },
  ];

  const repeticiones = [
    { label: 'Sin repetir', value: 'none' },
    { label: 'Diario', value: 'daily' },
    { label: 'Semanal', value: 'weekly' },
    { label: 'Quincenal', value: 'biweekly' },
    { label: 'Mensual', value: 'monthly' },
  ];

  // Calendario simple (grid del mes)
  const diasMes = useMemo(() => buildCalendar(mesBase), [mesBase]);
  const labelMes = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(mesBase);

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Sincronizar la fecha seleccionada con el formulario
  useEffect(() => {
    if (diaSeleccionado) {
      updateFormData('fecha', diaSeleccionado.toISOString().split('T')[0]);
    }
  }, [diaSeleccionado, updateFormData]);

  // Obtener datos seleccionados para mostrar
  const pacienteSeleccionado = pacientes.find(p => p.id_paciente.toString() === formData.id_paciente);
  const especialistaSeleccionado = especialistas.find(e => e.id_usuario === formData.id_especialista);
  const especialidadSeleccionada = especialidadesDisponibles.find(e => e.id_especialidad.toString() === formData.id_especialidad);
  const boxSeleccionado = boxesDisponibles.find(b => b.id_box.toString() === formData.id_box);

  const handleSubmit = async () => {
    const result = await crearNuevoTurno();
    
    if (result.success) {
      // Redirigir de vuelta a turnos después de un momento
      setTimeout(() => {
        router.push('/turnos');
      }, 1500);
    }
  };

  const handleNuevoPacienteClose = () => {
    setShowNuevoPacienteDialog(false);
  };

  const handlePatientCreated = () => {
    // Solo recargar datos cuando efectivamente se haya creado un paciente
    cargarDatos();
  };

  // Mostrar carga si aún se están cargando los datos
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <SkeletonLoader />
      </div>
    );
  }

  return (
    <section className="w-full max-w-md mx-auto min-h-screen bg-neutral-50 text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-neutral-50/95 backdrop-blur border-b border-neutral-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-md hover:bg-neutral-100 active:scale-95 transition"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Nuevo Turno</h1>
          <div className="w-6" />
        </div>
      </header>

      {/* Form visual */}
      <div className="px-4 pb-28 pt-2 space-y-5">
        {/* 1. Especialista */}
        <Field label="Especialista *">
          <SelectButton
            onClick={() => setOpenEspecialistas(true)}
            display={especialistaSeleccionado ? `${especialistaSeleccionado.nombre} ${especialistaSeleccionado.apellido}` : 'Seleccionar'}
            rightIcon={<ChevronDown className="w-4 h-4 opacity-70" />}
          />
        </Field>

        {/* 2. Especialidad */}
        <Field label="Especialidad">
          <SelectButton
            onClick={() => setOpenEspecialidades(true)}
            display={especialidadSeleccionada?.nombre || 'Seleccionar'}
            rightIcon={<ChevronDown className="w-4 h-4 opacity-70" />}
          />
        </Field>

        {/* 3. Paciente */}
        <Field label="Paciente *">
          <div className="flex gap-2">
            <SelectButton
              onClick={() => setOpenPacientes(true)}
              display={pacienteSeleccionado ? `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellido}` : 'Seleccionar paciente'}
              className="flex-1"
            />
            <button
              className="h-11 aspect-square grid place-items-center rounded-full bg-[#9C1838] text-white"
              title="Agregar paciente"
              type="button"
              onClick={() => setShowNuevoPacienteDialog(true)}
            >
              <UserPlus2 className="w-5 h-5" />
            </button>
          </div>
        </Field>

        {/* 4. Fecha */}
        <Field label="Fecha *">
          <div className="rounded-2xl border border-neutral-200 bg-white p-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                className="px-2 py-1 rounded hover:bg-neutral-100"
                onClick={() => setMesBase(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              >
                ‹
              </button>
              <p className="font-semibold capitalize">{capitalize(labelMes)}</p>
              <button
                className="px-2 py-1 rounded hover:bg-neutral-100"
                onClick={() => setMesBase(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 text-center text-xs text-neutral-500 mb-1">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, index) => (
                <div key={`day-${index}`} className="py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {/* Permitir selección de días de otros meses (próximo/anterior) */}
              {diasMes.map((d, i) => {
                const isCurrentMonth = d.getMonth() === mesBase.getMonth();
                const isToday = isSameDay(d, new Date());
                const selected = diaSeleccionado && isSameDay(d, diaSeleccionado);
                const isPast = d < new Date(new Date().setHours(0, 0, 0, 0));
                
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => !isPast && setDiaSeleccionado(d)}
                    disabled={isPast}
                    className={[
                      "h-10 rounded-xl text-sm transition",
                      isPast 
                        ? "text-neutral-300 cursor-not-allowed" 
                        : !isCurrentMonth 
                          ? "text-neutral-400" 
                          : "text-neutral-800",
                      selected
                        ? "bg-[#9C1838] text-white"
                        : isToday && !isPast
                          ? "ring-1 ring-[#9C1838] text-[#9C1838]"
                          : !isPast
                            ? "hover:bg-neutral-100"
                            : "",
                    ].join(' ')}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </Field>

        {/* 5. Hora */}
        <Field label="Horario *">
          <SelectButton
            onClick={() => setOpenHorarios(true)}
            display={horarios.find(h => h.value === formData.hora)?.label || 'Seleccionar'}
            rightIcon={<ChevronDown className="w-4 h-4 opacity-70" />}
          />
        </Field>

        {/* 6. Recordatorio */}
        <Field label="Recordatorio">
          <SelectButton
            onClick={() => setOpenRecordatorio(true)}
            display={recordatorios.find(r => r.value === recSel)?.label || 'Configurar'}
            leftIcon={<Bell className="w-4 h-4" />}
          />
        </Field>

        {/* 7. Box/Consultorio */}
        <Field label="Box/Consultorio">
          <SelectButton
            onClick={() => setOpenBoxes(true)}
            display={boxSeleccionado ? `Box ${boxSeleccionado.numero}` : 'Elegir box'}
            leftIcon={<Package className="w-4 h-4" />}
          />
        </Field>

        {/* 8. Plan */}
        <Field label="Plan">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateFormData('tipo_plan', 'particular')}
              className={[
                "h-11 px-3 rounded-xl border text-[15px] font-medium transition",
                formData.tipo_plan === 'particular'
                  ? "bg-[#9C1838] text-white border-[#9C1838]"
                  : "bg-white text-neutral-700 border-neutral-300 hover:border-[#9C1838]"
              ].join(' ')}
            >
              Particular
            </button>
            <button
              type="button"
              onClick={() => updateFormData('tipo_plan', 'obra_social')}
              className={[
                "h-11 px-3 rounded-xl border text-[15px] font-medium transition",
                formData.tipo_plan === 'obra_social'
                  ? "bg-[#9C1838] text-white border-[#9C1838]"
                  : "bg-white text-neutral-700 border-neutral-300 hover:border-[#9C1838]"
              ].join(' ')}
            >
              Obra Social
            </button>
          </div>
        </Field>

        {/* 9. Precio $ARS */}
        <Field label="Precio $ARS">
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 text-[15px]">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={formData.precio}
              onChange={(e) => updateFormData('precio', e.target.value)}
              className="w-full h-11 pl-8 pr-3 rounded-xl border border-neutral-300 bg-white text-[15px] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#9C1838]"
            />
          </div>
        </Field>

        {/* 10. Observaciones */}
        <Field label="Observaciones">
          <textarea
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white text-[15px] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#9C1838] resize-none"
            placeholder="Información adicional para la consulta..."
            value={formData.observaciones}
            onChange={(e) => updateFormData('observaciones', e.target.value)}
          />
        </Field>

        {/* CTA primario */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-12 rounded-xl bg-[#9C1838] text-white font-semibold hover:bg-[#9C1838]/90 active:scale-[.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Crear turno"
          >
            {isSubmitting ? 'Creando turno...' : 'Crear turno'}
          </button>
        </div>
      </div>

      {/* SHEET: Pacientes */}
      <Sheet title="Seleccionar Paciente" open={openPacientes} onClose={() => setOpenPacientes(false)}>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {pacientes.map((paciente) => (
            <button
              key={paciente.id_paciente}
              onClick={() => { updateFormData('id_paciente', paciente.id_paciente.toString()); setOpenPacientes(false); }}
              className={[
                "w-full text-left px-4 py-3 rounded-xl border hover:bg-neutral-50",
                formData.id_paciente === paciente.id_paciente.toString() ? "border-[#9C1838] text-[#9C1838] font-medium" : "border-neutral-200",
              ].join(' ')}
            >
              <div className="font-medium">{paciente.nombre} {paciente.apellido}</div>
              <div className="text-sm text-neutral-500">DNI: {paciente.dni}</div>
            </button>
          ))}
        </div>
      </Sheet>

      {/* SHEET: Horarios */}
      <Sheet title="Seleccionar Horario" open={openHorarios} onClose={() => setOpenHorarios(false)}>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {horarios.map((horario) => (
            <button
              key={horario.value}
              onClick={() => { 
                if (isHoraDisponible(horario.value)) {
                  updateFormData('hora', horario.value); 
                  setOpenHorarios(false); 
                }
              }}
              disabled={!isHoraDisponible(horario.value)}
              className={[
                "w-full text-left px-4 py-3 rounded-xl border hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed",
                !isHoraDisponible(horario.value) ? "bg-red-50 border-red-200 text-red-500" :
                formData.hora === horario.value ? "border-[#9C1838] text-[#9C1838] font-medium" : "border-neutral-200",
              ].join(' ')}
            >
              <div className="flex justify-between items-center">
                <span>{horario.label}</span>
                {!isHoraDisponible(horario.value) && (
                  <span className="text-xs text-red-400">Ocupado</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </Sheet>



      {/* SHEET: Especialistas */}
      <Sheet title="Seleccionar Especialista" open={openEspecialistas} onClose={() => setOpenEspecialistas(false)}>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {especialistas.map((especialista) => (
            <button
              key={especialista.id_usuario}
              onClick={() => { updateFormData('id_especialista', especialista.id_usuario); setOpenEspecialistas(false); }}
              className={[
                "w-full text-left px-4 py-3 rounded-xl border hover:bg-neutral-50",
                formData.id_especialista === especialista.id_usuario ? "border-[#9C1838] text-[#9C1838] font-medium" : "border-neutral-200",
              ].join(' ')}
            >
              <div className="font-medium">{especialista.nombre} {especialista.apellido}</div>
              {especialista.especialidad && (
                <div className="text-sm text-neutral-500">{especialista.especialidad.nombre}</div>
              )}
            </button>
          ))}
        </div>
      </Sheet>

      {/* SHEET: Especialidades */}
      <Sheet title="Seleccionar Especialidad" open={openEspecialidades} onClose={() => setOpenEspecialidades(false)}>
        <div className="space-y-2">
          {especialidadesDisponibles.map((especialidad) => (
            <button
              key={especialidad.id_especialidad}
              onClick={() => { updateFormData('id_especialidad', especialidad.id_especialidad.toString()); setOpenEspecialidades(false); }}
              className={[
                "w-full text-left px-4 py-3 rounded-xl border hover:bg-neutral-50",
                formData.id_especialidad === especialidad.id_especialidad.toString() ? "border-[#9C1838] text-[#9C1838] font-medium" : "border-neutral-200",
              ].join(' ')}
            >
              {especialidad.nombre}
            </button>
          ))}
        </div>
      </Sheet>

      {/* SHEET: Boxes */}
      <Sheet title="Seleccionar Box" open={openBoxes} onClose={() => setOpenBoxes(false)}>
        <div className="space-y-2">
          {boxesDisponibles.map((box) => (
            <button
              key={box.id_box}
              onClick={() => { updateFormData('id_box', box.id_box.toString()); setOpenBoxes(false); }}
              className={[
                "w-full text-left px-4 py-3 rounded-xl border hover:bg-neutral-50",
                formData.id_box === box.id_box.toString() ? "border-[#9C1838] text-[#9C1838] font-medium" : "border-neutral-200",
              ].join(' ')}
            >
              Box {box.numero}
            </button>
          ))}
        </div>
      </Sheet>

      {/* SHEET: Recordatorio */}
      <Sheet title="Recordatorio" open={openRecordatorio} onClose={() => setOpenRecordatorio(false)}>
        <div className="space-y-2">
          {recordatorios.map((r) => (
            <button
              key={r.value}
              onClick={() => { setRecSel(r.value); setOpenRecordatorio(false); }}
              className={[
                "w-full text-left px-4 py-3 rounded-xl border hover:bg-neutral-50",
                recSel === r.value ? "border-[#9C1838] text-[#9C1838] font-medium" : "border-neutral-200",
              ].join(' ')}
            >
              {r.label}
            </button>
          ))}
        </div>
      </Sheet>

      {/* Modal de Nuevo Paciente */}
      <NuevoPacienteDialog
        isOpen={showNuevoPacienteDialog}
        onClose={handleNuevoPacienteClose}
        handleToast={toast.addToast}
        onPatientCreated={handlePatientCreated}
      />
    </section>
  );
}

/* ---------- UI helpers ---------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-neutral-700">{label}</label>
      {children}
    </div>
  );
}

function SelectButton({
  display,
  onClick,
  leftIcon,
  rightIcon,
  className = ""
}: {
  display: string;
  onClick: () => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-11 w-full flex items-center justify-between gap-2 px-3 rounded-xl border border-neutral-300 bg-white text-[15px] hover:bg-neutral-50",
        className
      ].join(' ')}
    >
      <span className="flex items-center gap-2">
        {leftIcon && <span className="text-[#9C1838]">{leftIcon}</span>}
        <span className="truncate text-neutral-800">{display}</span>
      </span>
      {rightIcon ?? <ChevronDown className="w-4 h-4 opacity-70" />}
    </button>
  );
}

function Sheet({
  title, open, onClose, children,
}: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-black/40 animate-fadeIn"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 shadow-2xl animate-slideUp">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neutral-200" />
        <h3 className="text-base font-semibold mb-4">{title}</h3>
        {children}
        <div className="mt-5">
          <button
            className="w-full h-11 rounded-xl border border-neutral-300 hover:bg-neutral-50"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        .animate-fadeIn { animation: fadeIn .18s ease-out; }
        .animate-slideUp { animation: slideUp .22s ease-out; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{transform:translateY(24px);opacity:.7} to{transform:translateY(0);opacity:1} }
      `}</style>
    </div>
  );
}

/* ---------- Calendar helpers ---------- */

function buildCalendar(base: Date): Date[] {
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay()); // domingo anterior

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}