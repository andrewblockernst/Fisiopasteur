/**
 * ARCHIVO OBSOLETO - YA NO SE USA
 * 
 * Esta era una versión preliminar del formulario móvil.
 * Ahora se usa NuevoTurnoModal para crear turnos.
 * 
 * Se mantiene temporalmente para referencia,
 * pero debería eliminarse en futuras versiones.
 */

'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft, UserPlus2, Bell, Package, Repeat, ChevronDown,
} from 'lucide-react';
import type { SelectOption } from '@/types/database.types';

interface NuevoTurnoMobileProps {
  // Datos para poblar UI (pueden venir de tu store/api)
  nombrePaciente?: string;
  especialidades?: SelectOption[];
  cajas?: SelectOption[];                  // Boxes
  horarios?: SelectOption[];               // 10:00, 10:30, etc
  duraciones?: SelectOption[];             // 30m, 45m, 1h...
  recordatorios?: SelectOption[];          // 1h antes, 3h antes...
  repeticiones?: SelectOption[];           // Diario, Semanal...
  // Callbacks opcionales si querés enganchar lógica luego
  onBack?: () => void;
}

export default function NuevoTurnoMobile({
  nombrePaciente = '',
  especialidades = [
    { label: 'Kinesiología', value: 'kine' },
    { label: 'Acupuntura', value: 'acu' },
    { label: 'Pilates', value: 'pil' },
    { label: 'Osteopatía', value: 'ost' },
  ],
  cajas = [
    { label: 'BOX 1', value: '1' },
    { label: 'BOX 2', value: '2' },
    { label: 'BOX 3', value: '3' },
    { label: 'BOX 4', value: '4' },
  ],
  horarios = [
    { label: '09:00 AM', value: '09:00' },
    { label: '09:30 AM', value: '09:30' },
    { label: '10:00 AM', value: '10:00' },
    { label: '10:30 AM', value: '10:30' },
  ],
  duraciones = [
    { label: '30 MIN', value: '30' },
    { label: '45 MIN', value: '45' },
    { label: '1 HORA', value: '60' },
  ],
  recordatorios = [
    { label: '1 hora antes', value: '1h' },
    { label: '3 horas antes', value: '3h' },
    { label: '12 horas antes', value: '12h' },
    { label: '1 día antes', value: '1d' },
  ],
  repeticiones = [
    { label: 'Sin repetir', value: 'none' },
    { label: 'Diario', value: 'daily' },
    { label: 'Semanal', value: 'weekly' },
    { label: 'Quincenal', value: 'biweekly' },
    { label: 'Mensual', value: 'monthly' },
  ],
  onBack,
}: NuevoTurnoMobileProps) {
  // Estados UI puramente visuales
  const [mesBase, setMesBase] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(new Date());
  const [horaSel, setHoraSel] = useState(horarios[2]?.value || '');
  const [duracionSel, setDuracionSel] = useState(duraciones[2]?.value || '');
  const [espSel, setEspSel] = useState(especialidades[0]?.value || '');
  const [boxSel, setBoxSel] = useState<string | null>(null);
  const [recSel, setRecSel] = useState<string>('3h');
  const [repSel, setRepSel] = useState<string>('none');
  const [obs, setObs] = useState('');

  // Sheets (paneles) laterales/modales
  const [openBoxes, setOpenBoxes] = useState(false);
  const [openRecordatorio, setOpenRecordatorio] = useState(false);
  const [openRepetir, setOpenRepetir] = useState(false);

  // Calendario simple (grid del mes)
  const diasMes = useMemo(() => buildCalendar(mesBase), [mesBase]);

  const labelMes = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(mesBase);

  return (
    <section className="w-full max-w-md mx-auto min-h-screen bg-neutral-50 text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-neutral-50/95 backdrop-blur border-b border-neutral-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
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
        {/* Paciente */}
        <Field label="Paciente">
          <div className="flex gap-2">
            <input
              className="flex-1 h-11 px-3 rounded-xl border border-neutral-300 bg-white text-[15px] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#9C1838]"
              placeholder="Ej. Franco Ezequiel Uribe"
              defaultValue={nombrePaciente}
              readOnly
            />
            <button
              className="h-11 aspect-square grid place-items-center rounded-xl bg-[#9C1838] text-white"
              title="Agregar paciente"
              type="button"
            >
              <UserPlus2 className="w-5 h-5" />
            </button>
          </div>
        </Field>

        {/* Calendario */}
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
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, idx) => (
              <div key={`${d}-${idx}`} className="py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {diasMes.map((d, i) => {
              const inactive = d.getMonth() !== mesBase.getMonth();
              const isToday = isSameDay(d, new Date());
              const selected = diaSeleccionado && isSameDay(d, diaSeleccionado);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => !inactive && setDiaSeleccionado(d)}
                  className={[
                    "h-10 rounded-xl text-sm transition",
                    inactive ? "text-neutral-300" : "text-neutral-800",
                    selected
                      ? "bg-[#9C1838] text-white"
                      : isToday && !inactive
                        ? "ring-1 ring-[#9C1838] text-[#9C1838]"
                        : "hover:bg-neutral-100",
                  ].join(' ')}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Horario / Duración */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Horario">
            <SelectButton
              onClick={() => {}}
              display={horarios.find(h => h.value === horaSel)?.label || 'Seleccionar'}
              rightIcon={<ChevronDown className="w-4 h-4 opacity-70" />}
            />
          </Field>

          <Field label="Duración">
            <SelectButton
              onClick={() => {}}
              display={duraciones.find(d => d.value === duracionSel)?.label || 'Seleccionar'}
              rightIcon={<ChevronDown className="w-4 h-4 opacity-70" />}
            />
          </Field>
        </div>

        {/* Especialidad / Box */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Especialidad">
            <SelectButton
              onClick={() => {}}
              display={especialidades.find(e => e.value === espSel)?.label || 'Seleccionar'}
              rightIcon={<ChevronDown className="w-4 h-4 opacity-70" />}
            />
          </Field>

          <Field label="Box">
            <SelectButton
              onClick={() => setOpenBoxes(true)}
              display={boxSel ? (cajas.find(c => c.value === boxSel)?.label || '') : 'Elegir box'}
              leftIcon={<Package className="w-4 h-4" />}
            />
          </Field>
        </div>

        {/* Recordatorio / Repetir */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Recordatorio">
            <SelectButton
              onClick={() => setOpenRecordatorio(true)}
              display={recordatorios.find(r => r.value === recSel)?.label || 'Configurar'}
              leftIcon={<Bell className="w-4 h-4" />}
            />
          </Field>

          <Field label="Repetir">
            <SelectButton
              onClick={() => setOpenRepetir(true)}
              display={repeticiones.find(r => r.value === repSel)?.label || 'No repetir'}
              leftIcon={<Repeat className="w-4 h-4" />}
            />
          </Field>
        </div>

        {/* Observaciones */}
        <Field label="Observaciones">
          <textarea
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white text-[15px] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#9C1838] resize-none"
            placeholder="Ej. Información adicional para la consulta..."
            value={obs}
            onChange={(e) => setObs(e.target.value)}
          />
        </Field>

        {/* CTA primario */}
        <div className="pt-2">
          <button
            type="button"
            className="w-full h-12 rounded-xl bg-[#9C1838] text-white font-semibold hover:bg-[#9C1838]/90 active:scale-[.99] transition"
            title="Crear turno"
          >
            Crear turno
          </button>
        </div>
      </div>

      {/* SHEET: Boxes */}
      <Sheet title="Seleccionar Box" open={openBoxes} onClose={() => setOpenBoxes(false)}>
        <div className="space-y-2">
          {cajas.map((c) => (
            <button
              key={c.value}
              onClick={() => { setBoxSel(c.value); setOpenBoxes(false); }}
              className={[
                "w-full text-left px-4 py-3 rounded-xl border hover:bg-neutral-50",
                boxSel === c.value ? "border-[#9C1838] text-[#9C1838] font-medium" : "border-neutral-200",
              ].join(' ')}
            >
              {c.label}
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

      {/* SHEET: Repetir */}
      <Sheet title="Repetir" open={openRepetir} onClose={() => setOpenRepetir(false)}>
        <div className="space-y-2">
          {repeticiones.map((r) => (
            <button
              key={r.value}
              onClick={() => { setRepSel(r.value); setOpenRepetir(false); }}
              className={[
                "w-full text-left px-4 py-3 rounded-xl border hover:bg-neutral-50",
                repSel === r.value ? "border-[#9C1838] text-[#9C1838] font-medium" : "border-neutral-200",
              ].join(' ')}
            >
              {r.label}
            </button>
          ))}
        </div>
      </Sheet>
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
}: {
  display: string;
  onClick: () => void;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-11 w-full flex items-center justify-between gap-2 px-3 rounded-xl border border-neutral-300 bg-white text-[15px] hover:bg-neutral-50"
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
