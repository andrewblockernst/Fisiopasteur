"use client";

import { useState, useTransition, useEffect, useCallback, useMemo, useRef } from "react";
import { actualizarTurno, obtenerEspecialistasParaTurnos, obtenerBoxes, obtenerSlotsOcupados, obtenerTurnosParaValidarBoxes, obtenerPrecioEspecialidad } from "@/lib/actions/turno.action";
import BaseDialog from "@/componentes/dialog/base-dialog";
import PacienteAutocomplete from "@/componentes/paciente/paciente-autocomplete";
import { Database } from "@/types/database.types";
import Image from "next/image";
import Loading from "../loading";
import { useToastStore } from '@/stores/toast-store';
import { formatoDNI, formatoNumeroTelefono } from "@/lib/utils";
import { useAuth } from "@/hooks/usePerfil";
import type { TurnoWithRelations } from "@/types";
import { dayjs, isPastDateTime, minutesToTime, timeToMinutes, todayYmd } from "@/lib/dayjs";

// Tipos basados en tu estructura de BD
type Turno = Database['public']['Tables']['turno']['Row'];
type PacienteCompleto = Database['public']['Tables']['paciente']['Row'];
type Usuario = Database['public']['Tables']['usuario']['Row'];
type Especialidad = Database['public']['Tables']['especialidad']['Row'];
type Box = Database['public']['Tables']['box']['Row'];

// Tipos que realmente devuelve tu API (más simples)
type PacienteAPI = {
  id_paciente: number;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string | null;
  email: string | null;
};

function esEspecialidadPilates(especialidad: any): boolean {
  return especialidad?.nombre?.toLowerCase().includes('pilates') ?? false;
}

type EspecialistaAPI = {
  id_usuario: string;
  nombre: string;
  apellido: string;
  color?: string;
  especialidad?: Especialidad;
  usuario_especialidad?: Array<{ especialidad: Especialidad }>;
};

interface EditarTurnoModalProps {
  turno: TurnoWithRelations;
  open: boolean;
  onClose: () => void;
  onSaved?: (updated?: TurnoWithRelations) => void;
}

let especialistasTurnoCache: EspecialistaAPI[] | null = null;
let boxesTurnoCache: Box[] | null = null;
let catalogoTurnoPromise: Promise<{ especialistas: EspecialistaAPI[]; boxes: Box[] }> | null = null;

const normalizarEspecialistas = (rows: any[]): EspecialistaAPI[] => {
  return rows.map((item: any) => ({
    ...item,
    color: item.color === null ? undefined : item.color,
  }));
};

const cargarCatalogosTurno = async (): Promise<{ especialistas: EspecialistaAPI[]; boxes: Box[] }> => {
  if (especialistasTurnoCache && boxesTurnoCache) {
    return { especialistas: especialistasTurnoCache, boxes: boxesTurnoCache };
  }

  if (!catalogoTurnoPromise) {
    catalogoTurnoPromise = Promise.all([
      obtenerEspecialistasParaTurnos(),
      obtenerBoxes(),
    ])
      .then(([e, b]) => {
        const especialistas = e.success ? normalizarEspecialistas(e.data || []) : [];
        const boxes = b.success ? (b.data || []) : [];

        especialistasTurnoCache = especialistas;
        boxesTurnoCache = boxes;

        return { especialistas, boxes };
      })
      .finally(() => {
        catalogoTurnoPromise = null;
      });
  }

  return catalogoTurnoPromise;
};

export default function EditarTurnoDialog({ turno, open, onClose, onSaved }: EditarTurnoModalProps) {
  const ultimaInicializacionRef = useRef<string | null>(null);
  const inicializacionCompletaRef = useRef(false);
  const [formData, setFormData] = useState({
    fecha: turno.fecha,
    hora: turno.hora.slice(0, 5), // Remover segundos para mostrar solo HH:MM
    id_especialista: turno.id_especialista || '',
    id_especialidad: turno.id_especialidad ? String(turno.id_especialidad) : '',
    tipo_plan: (turno.tipo_plan || 'particular') as 'particular' | 'obra_social',
    id_paciente: String(turno.id_paciente),
    id_box: turno.id_box ? String(turno.id_box) : '',
    observaciones: turno.observaciones || '',
    precio: turno.precio ? String(turno.precio) : ''
  });

  const { user, loading: authLoading } = useAuth();
  const [isPending, startTransition] = useTransition();

  // Estados con tipos que coinciden con lo que devuelve tu API
  const [especialistas, setEspecialistas] = useState<EspecialistaAPI[]>([]);
  // const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [boxesDisponibles, setBoxesDisponibles] = useState<Box[]>([]);
  const [especialidadesDisponibles, setEspecialidadesDisponibles] = useState<Especialidad[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [horasOcupadas, setHorasOcupadas] = useState<string[]>([]);
  const [verificandoDisponibilidad, setVerificandoDisponibilidad] = useState(false);
  const [verificandoBoxes, setVerificandoBoxes] = useState(false);
  const { addToast } = useToastStore();

  // Estados para el autocomplete de pacientes
  const [busquedaPaciente, setBusquedaPaciente] = useState('');
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<PacienteAPI | null>(null);

  // Dialog para mensajes (reemplaza los toasts)
  const [dialog, setDialog] = useState<{ open: boolean; type: 'success' | 'error'; message: string }>({
    open: false,
    type: 'success',
    message: ''
  });

  // Dialog de confirmación de notificación WhatsApp
  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; datos: any }>({ show: false, datos: null });

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (!open) {
      ultimaInicializacionRef.current = null;
      inicializacionCompletaRef.current = false;
      return;
    }

    const claveInicializacion = `${turno.id_turno}-${turno.updated_at ?? ''}`;
    if (ultimaInicializacionRef.current === claveInicializacion) {
      return;
    }
    ultimaInicializacionRef.current = claveInicializacion;
    
    const cargarDatos = async () => {
      setLoading(true);
      setIsInitializing(true);
      inicializacionCompletaRef.current = false;
      try {
        const formDataInicial = {
          fecha: turno.fecha,
          hora: turno.hora.slice(0, 5),
          id_especialista: turno.id_especialista || '',
          id_especialidad: turno.id_especialidad ? String(turno.id_especialidad) : '',
          tipo_plan: (turno.tipo_plan || 'particular') as 'particular' | 'obra_social',
          id_paciente: String(turno.id_paciente),
          id_box: turno.id_box ? String(turno.id_box) : '',
          observaciones: turno.observaciones || '',
          precio: turno.precio ? String(turno.precio) : ''
        };

        const { especialistas: especialistasData, boxes: boxesData } = await cargarCatalogosTurno();
        
        setFormData(formDataInicial);
        
        if (turno.paciente) {
          const pacienteActual: PacienteAPI = {
            id_paciente: turno.paciente.id_paciente,
            nombre: turno.paciente.nombre,
            apellido: turno.paciente.apellido,
            dni: turno.paciente.dni ?? "",
            telefono: turno.paciente.telefono,
            email: turno.paciente.email,
          };
          setPacienteSeleccionado(pacienteActual);
          setBusquedaPaciente(`${pacienteActual.nombre} ${pacienteActual.apellido}`);
        }
        
        setEspecialistas(especialistasData);
        setBoxes(boxesData);

        if (formDataInicial.id_especialista) {
          const especialista = especialistasData.find(
            (esp) => String(esp.id_usuario) === String(formDataInicial.id_especialista)
          );

          if (especialista) {
            const lista: Especialidad[] = [];
            if (especialista.especialidad) lista.push(especialista.especialidad);
            if (Array.isArray(especialista.usuario_especialidad)) {
              especialista.usuario_especialidad.forEach((ue) => {
                if (ue.especialidad) lista.push(ue.especialidad);
              });
            }

            const unicas = lista
              .filter((esp) => !esEspecialidadPilates(esp))
              .filter((esp, i, arr) => i === arr.findIndex((e) => e.id_especialidad === esp.id_especialidad));

            setEspecialidadesDisponibles(unicas);

            if (
              formDataInicial.id_especialidad &&
              !unicas.some((esp) => String(esp.id_especialidad) === String(formDataInicial.id_especialidad))
            ) {
              setFormData((prev) => ({ ...prev, id_especialidad: '' }));
            }
          }
        }

        if (formDataInicial.id_especialista && formDataInicial.fecha) {
          const pacienteSeleccionadoId = formDataInicial.id_paciente ? Number(formDataInicial.id_paciente) : undefined;
          const slotsRes = await obtenerSlotsOcupados(formDataInicial.id_especialista, formDataInicial.fecha, turno.id_turno, pacienteSeleccionadoId);
          if (slotsRes.success && slotsRes.data) {
            setHorasOcupadas(slotsRes.data);
          }
        } else {
          setHorasOcupadas([]);
        }

        if (formDataInicial.fecha && formDataInicial.hora) {
          const turnosRes = await obtenerTurnosParaValidarBoxes(formDataInicial.fecha, {
            hora: formDataInicial.hora,
            turnoIdExcluir: turno.id_turno,
          });
          if (turnosRes.success && turnosRes.data) {
            const disponibles = boxesData.filter((box) => turnosRes.data.includes(box.id_box));

            if (formDataInicial.id_box && !disponibles.some((box) => String(box.id_box) === formDataInicial.id_box)) {
              const boxActual = boxesData.find((box) => String(box.id_box) === formDataInicial.id_box);
              if (boxActual) {
                setBoxesDisponibles([...disponibles, boxActual]);
              } else {
                setBoxesDisponibles(disponibles);
              }
            } else {
              setBoxesDisponibles(disponibles);
            }
          } else {
            setBoxesDisponibles(boxesData);
          }
        } else {
          setBoxesDisponibles(boxesData);
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        inicializacionCompletaRef.current = true;
        setIsInitializing(false);
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, [open, turno.id_turno, turno.updated_at]);

  // Filtrar especialidades según especialista seleccionado
  useEffect(() => {
    if (!formData.id_especialista) {
      setEspecialidadesDisponibles([]);
      return;
    }
    
    const especialista = especialistas.find(e => e.id_usuario === formData.id_especialista);
    if (!especialista) {
      setEspecialidadesDisponibles([]);
      return;
    }
    
    const lista: Especialidad[] = [];
    if (especialista.especialidad) lista.push(especialista.especialidad);
    if (Array.isArray(especialista.usuario_especialidad)) {
      especialista.usuario_especialidad.forEach((ue) => {
        if (ue.especialidad) lista.push(ue.especialidad);
      });
    }
    
    const unicas = lista
      .filter((esp) => !esEspecialidadPilates(esp))
      .filter((esp, i, arr) => i === arr.findIndex(e => e.id_especialidad === esp.id_especialidad));
    setEspecialidadesDisponibles(unicas);
    
    // Si la especialidad seleccionada ya no existe, limpiar
    if (formData.id_especialidad && !unicas.some(e => 
      String(e.id_especialidad) === String(formData.id_especialidad)
    )) {
      setFormData(prev => ({ ...prev, id_especialidad: '' }));
    }
  }, [formData.id_especialista, especialistas, formData.id_especialidad]);

  // Autocompletar precio según especialista + especialidad + plan
  useEffect(() => {
    (async () => {
      if (!formData.id_especialista || !formData.id_especialidad || !formData.tipo_plan) return;
      try {
        const res = await obtenerPrecioEspecialidad(
          String(formData.id_especialista),
          Number(formData.id_especialidad),
          formData.tipo_plan
        );
        if (res.success && res.precio !== null) {
          // Solo actualizar si el precio actual está vacío o es diferente
          if (!formData.precio || Number(formData.precio) !== res.precio) {
            setFormData(prev => ({ ...prev, precio: String(res.precio) }));
          }
        }
      } catch {}
    })();
  }, [formData.id_especialista, formData.id_especialidad, formData.tipo_plan]);

  // Verificar horarios ocupados cuando cambia especialista o fecha
  useEffect(() => {
    if (!open || isInitializing || !inicializacionCompletaRef.current) return;

    const verificarHorariosOcupados = async () => {
      if (!formData.id_especialista || !formData.fecha) {
        setHorasOcupadas([]);
        return;
      }

      setVerificandoDisponibilidad(true);
      try {
        const pacienteSeleccionadoId = formData.id_paciente ? Number(formData.id_paciente) : undefined;
        const res = await obtenerSlotsOcupados(formData.id_especialista, formData.fecha, turno.id_turno, pacienteSeleccionadoId);
        if (res.success && res.data) {
          setHorasOcupadas(res.data);
        }
      } catch (error) {
        console.error('Error verificando horarios:', error);
      } finally {
        setVerificandoDisponibilidad(false);
      }
    };

    verificarHorariosOcupados();
  }, [open, formData.id_especialista, formData.fecha, formData.id_paciente, turno.id_turno]);

  // Verificar boxes disponibles cuando cambia fecha y hora
  useEffect(() => {
    if (!open || isInitializing || !inicializacionCompletaRef.current) return;

    const verificarBoxesDisponibles = async () => {
      if (!formData.fecha || !formData.hora) {
        setBoxesDisponibles(boxes);
        return;
      }

      setVerificandoBoxes(true);
      try {
        const res = await obtenerTurnosParaValidarBoxes(formData.fecha, {
          hora: formData.hora,
          turnoIdExcluir: turno.id_turno,
        });
        
        if (res.success && res.data) {
          const disponibles = boxes.filter(box => res.data.includes(box.id_box));
          setBoxesDisponibles(disponibles);

          if (formData.id_box && !disponibles.some(b => String(b.id_box) === formData.id_box)) {
            const boxActual = boxes.find(b => String(b.id_box) === formData.id_box);
            if (boxActual) {
              setBoxesDisponibles([...disponibles, boxActual]);
            }
          }
        } else {
          setBoxesDisponibles(boxes);
        }
      } catch (error) {
        console.error('Error verificando boxes:', error);
        setBoxesDisponibles(boxes);
      } finally {
        setVerificandoBoxes(false);
      }
    };

    verificarBoxesDisponibles();
  }, [open, formData.fecha, formData.hora, boxes, turno.id_turno]);

  // Función para verificar si una hora específica está disponible
  const esHoraDisponible = (hora: string): boolean => {
    if (!hora || horasOcupadas.length === 0) return true;

    return !horasOcupadas.includes(hora);
  };

  // Generar opciones de hora disponibles
  const generarOpcionesHora = (): { value: string; label: string; disponible: boolean }[] => {
    const opciones = [];
    
    // Horarios de 6:00 a 22:00 en intervalos de 15 minutos
    for (let h = 6; h <= 22; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hora = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const disponible = esHoraDisponible(hora);
        
        // Si es hora pasada (solo para fecha de hoy), no mostrar
        if (formData.fecha === todayYmd()) {
          if (isPastDateTime(formData.fecha, hora) || dayjs(`${formData.fecha} ${hora}`, 'YYYY-MM-DD HH:mm').isSame(dayjs(), 'minute')) {
            continue; // Saltar horas pasadas
          }
        }
        
        opciones.push({
          value: hora,
          label: hora,
          disponible
        });
      }
    }
    
    return opciones;
  };

  // Manejar selección de paciente
  const seleccionarPaciente = useCallback((paciente: PacienteAPI) => {
    setPacienteSeleccionado(paciente);
    setBusquedaPaciente(`${paciente.nombre} ${paciente.apellido}`);
    setFormData(prev => ({ ...prev, id_paciente: String(paciente.id_paciente) }));
  }, []);

  // Manejar cambio en input de búsqueda
  const handleBusquedaPacienteChange = useCallback((valor: string) => {
    setBusquedaPaciente(valor);
    
    if (!valor.trim()) {
      setPacienteSeleccionado(null);
      setFormData(prev => ({ ...prev, id_paciente: '' }));
      return;
    }

    if (pacienteSeleccionado && valor !== `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellido}`) {
      setPacienteSeleccionado(null);
      setFormData(prev => ({ ...prev, id_paciente: '' }));
    }
  }, [pacienteSeleccionado]);

  const hayCambios = useMemo(() => {
    const normalizarTexto = (valor: string | null | undefined) => (valor ?? "").trim();
    const normalizarNumeroNullable = (valor: string | number | null | undefined) => {
      if (valor === null || valor === undefined || valor === "") return 0;
      const numero = Number(valor);
      return Number.isFinite(numero) ? numero : null;
    };

    const original = {
      fecha: turno.fecha,
      hora: turno.hora.slice(0, 5),
      id_especialista: normalizarTexto(turno.id_especialista),
      id_especialidad: normalizarNumeroNullable(turno.id_especialidad),
      tipo_plan: normalizarTexto(turno.tipo_plan || "particular"),
      id_paciente: normalizarNumeroNullable(turno.id_paciente),
      id_box: normalizarNumeroNullable(turno.id_box),
      observaciones: normalizarTexto(turno.observaciones),
      precio: normalizarNumeroNullable(turno.precio),
    };

    const actual = {
      fecha: formData.fecha,
      hora: formData.hora,
      id_especialista: normalizarTexto(formData.id_especialista),
      id_especialidad: normalizarNumeroNullable(formData.id_especialidad),
      tipo_plan: normalizarTexto(formData.tipo_plan),
      id_paciente: normalizarNumeroNullable(formData.id_paciente),
      id_box: normalizarNumeroNullable(formData.id_box),
      observaciones: normalizarTexto(formData.observaciones),
      precio: normalizarNumeroNullable(formData.precio),
    };

    return JSON.stringify(original) !== JSON.stringify(actual);
  }, [formData, turno]);

  // Cambios que son visibles para el paciente (fecha, hora, especialista, box, especialidad)
  const hayCambiosVisiblesPaciente = useMemo(() => {
    if (!pacienteSeleccionado?.telefono) return false;
    const normNum = (v: string | number | null | undefined) => {
      if (v === null || v === undefined || v === "") return 0;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    return (
      formData.fecha !== turno.fecha ||
      formData.hora !== turno.hora.slice(0, 5) ||
      (formData.id_especialista || "") !== (turno.id_especialista || "") ||
      normNum(formData.id_box) !== normNum(turno.id_box) ||
      normNum(formData.id_especialidad) !== normNum(turno.id_especialidad)
    );
  }, [formData, turno, pacienteSeleccionado]);

  const ejecutarActualizacion = (datos: any, notificar: boolean) => {
    startTransition(async () => {
      try {
        const res = await actualizarTurno(turno.id_turno, datos, { notificar });
        if (res.success) {
          addToast({
            variant: 'success',
            message: 'Turno actualizado',
            description: 'Los cambios se guardaron correctamente',
          });
          onSaved?.(res.data as any);
          onClose();
        } else {
          addToast({
            variant: 'error',
            message: 'Error al actualizar',
            description: res.error || 'No se pudo actualizar el turno',
          });
        }
      } catch (error) {
        console.error('Error al actualizar turno:', error);
        addToast({
          variant: 'error',
          message: 'Error inesperado',
          description: 'Ocurrió un problema al actualizar el turno',
        });
      }
    });
  };

const handleSubmit = async () => {
  if (!formData.fecha || !formData.hora || !formData.id_especialista || !formData.id_especialidad || !formData.id_paciente) {
    addToast({
      variant: 'error',
      message: 'Campos requeridos',
      description: 'Por favor completa fecha, hora, especialista, especialidad y paciente',
    });
    return;
  }

  const datosActualizacion: Partial<Database['public']['Tables']['turno']['Update']> = {
    id_paciente: Number(formData.id_paciente),
    id_especialista: formData.id_especialista,
    id_especialidad: Number(formData.id_especialidad),
    id_box: formData.id_box ? Number(formData.id_box) : null,
    fecha: formData.fecha,
    hora: formData.hora + ':00',
    observaciones: formData.observaciones || null,
    tipo_plan: formData.tipo_plan,
    precio: formData.precio ? Number(formData.precio) : null,
  };

  // Si hay cambios visibles para el paciente y tiene teléfono, preguntar si notificar
  if (hayCambiosVisiblesPaciente) {
    setConfirmDialog({ show: true, datos: datosActualizacion });
    return;
  }

  ejecutarActualizacion(datosActualizacion, false);
};

  // Mostrar loading mientras carga datos
  if (loading || authLoading) {
    return (
      <BaseDialog
        type="custom"
        size="md"
        title="Editar Turno"
        customIcon={
          <Image
            src="/favicon.svg"
            alt="Logo Fisiopasteur"
            width={24}
            height={24}
            className="w-6 h-6"
          />
        }
        isOpen={open}
        onClose={onClose}
        customColor="#9C1838"
        message={<Loading size={48} text="Cargando datos..." />}
      />
    );
  }

  return (
    <>
      <BaseDialog
        type="custom"
        size="lg"
        title="Editar Turno"
        customIcon={
          <Image
            src="/favicon.svg"
            alt="Logo Fisiopasteur"
            width={24}
            height={24}
            className="w-6 h-6"
          />
        }
        isOpen={open}
        onClose={onClose}
        showCloseButton
        customColor="#9C1838"
        message={
          <form
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
            className="space-y-4 text-left"
          >
            {/* Especialista */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especialista*
              </label>

              {user?.puedeGestionarTurnos ? (
                //Usuario con permisos: habilitado
                <select
                  value={formData.id_especialista}
                  onChange={(e) => setFormData(prev => ({ ...prev, id_especialista: e.target.value, hora: '', id_box: '' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                  required
                >
                  <option value="">Seleccionar especialista</option>
                  {especialistas.map((especialista) => (
                    <option key={especialista.id_usuario} value={especialista.id_usuario}>
                      {especialista.apellido}, {especialista.nombre} 
                    </option>
                  ))}
                </select>
              ) : (
                // Usuario sin permisos: actual, deshabilitado
                <select
                  value={formData.id_especialista}
                  disabled
                  className="w-full px-2 md:px-3 py-2 text-sm bg-gray-100 border border-gray-300 rounded-lg cursor-not-allowed opacity-75"
                  required
                >
                  {(() => {
                    const userId = user?.id_usuario || user?.id; // ✅ Usar user.id como fallback
                    const especialistaActual = especialistas.find(e => 
                      String(e.id_usuario) === String(userId)
                    );
                    
                    return (
                      <option value={userId || ''}>
                        {especialistaActual 
                          ? `${especialistaActual.nombre} ${especialistaActual.apellido}`
                          : `${user?.nombre || ''} ${user?.apellido || ''}`.trim() || 'Especialista actual'
                        }
                      </option>
                    );
                  })()}
                </select>
              )}
            </div>

            {/* Especialidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especialidad*
              </label>
              <select
                value={formData.id_especialidad}
                onChange={(e) => setFormData(prev => ({ ...prev, id_especialidad: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                required
                disabled={!formData.id_especialista}
              >
                <option value="">Seleccionar especialidad</option>
                {especialidadesDisponibles.map((esp) => (
                  <option key={esp.id_especialidad} value={esp.id_especialidad}>
                    {esp.nombre}
                  </option>
                ))}
              </select>
              {formData.id_especialista && especialidadesDisponibles.length === 0 && (
                <p className="text-red-500 text-xs mt-1">
                  Este especialista no tiene especialidades asignadas
                </p>
              )}
            </div>

            {/* Paciente con Autocomplete */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paciente*
              </label>
              <PacienteAutocomplete
                value={busquedaPaciente}
                onChange={handleBusquedaPacienteChange}
                onSelect={seleccionarPaciente}
                selectedDisplayValue={pacienteSeleccionado ? `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellido}` : ""}
                required
                placeholder="Buscar paciente por nombre, apellido o DNI..."
                containerClassName="relative"
                inputClassName="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                dropdownClassName="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
              />
            </div>

            {/* Fecha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha*
              </label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData(prev => ({ ...prev, fecha: e.target.value, hora: '', id_box: '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                required
                min={todayYmd()}
              />
            </div>

            {/* Hora */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora* {verificandoDisponibilidad && <span className="text-xs text-gray-500">(Verificando disponibilidad...)</span>}
              </label>
              <select
                value={formData.hora}
                onChange={(e) => setFormData(prev => ({ ...prev, hora: e.target.value, id_box: '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                required
                disabled={!formData.id_especialista || !formData.fecha || verificandoDisponibilidad}
              >
                <option value="">
                  {!formData.id_especialista ? "Primero selecciona un especialista" : 
                   !formData.fecha ? "Primero selecciona una fecha" : 
                   "Seleccionar hora"}
                </option>
                {generarOpcionesHora().map(({ value, label, disponible }) => (
                  <option 
                    key={value} 
                    value={value}
                    disabled={!disponible && value !== formData.hora} // Permitir la hora actual aunque esté "ocupada"
                    style={{ 
                      color: (disponible || value === formData.hora) ? 'black' : '#ccc',
                      backgroundColor: (disponible || value === formData.hora) ? 'white' : '#f5f5f5'
                    }}
                  >
                    {label} {!disponible && value !== formData.hora && '(Ocupado)'}
                  </option>
                ))}
              </select>
              {/* {formData.id_especialista && formData.fecha && horasOcupadas.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {generarOpcionesHora().filter(h => h.disponible || h.value === formData.hora).length} horarios disponibles
                </p>
              )} */}
            </div>

            {/* Box/Consultorio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Box/Consultorio {verificandoBoxes && <span className="text-xs text-gray-500">(Verificando disponibilidad...)</span>}
              </label>
              <select
                value={formData.id_box}
                onChange={(e) => setFormData(prev => ({ ...prev, id_box: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                disabled={!formData.fecha || !formData.hora || verificandoBoxes}
              >
                <option value="">
                  {!formData.fecha || !formData.hora ? "Selecciona fecha y hora primero" : "Seleccionar box (opcional)"}
                </option>
                {boxesDisponibles.map((box) => {
                  const esBoxActual = String(box.id_box) === formData.id_box;
                  
                  return (
                    <option key={box.id_box} value={box.id_box}>
                      Box {box.numero} {esBoxActual && '(actual)'}
                    </option>
                  );
                })}
              </select>
              {formData.fecha && formData.hora && (
                <p className="text-xs text-gray-500 mt-1">
                  {boxesDisponibles.length} de {boxes.length} boxes disponibles
                </p>
              )}
            </div>

            {/* Plan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plan
              </label>
              <select
                value={formData.tipo_plan}
                onChange={(e) => setFormData(prev => ({ ...prev, tipo_plan: e.target.value as 'particular' | 'obra_social' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
              >
                <option value="particular">Particular</option>
                <option value="obra_social">Obra Social</option>
              </select>
            </div>

            {/* Precio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio (ARS)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg select-none">$</span>
                <input
                  type="text"
                  value={
                    formData.precio
                      ? Number(formData.precio).toLocaleString('es-AR')
                      : ''
                  }
                  onChange={(e) => {
                    // Remover todo excepto números
                    const raw = e.target.value.replace(/[^\d]/g, '');
                    setFormData(prev => ({ ...prev, precio: raw }));
                  }}
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                  placeholder="..."
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9C1838] focus:border-transparent"
                rows={3}
                placeholder="Información adicional sobre el turno..."
              />
            </div>
          </form>
        }
        primaryButton={{
          text: isPending ? "Guardando..." : "Guardar Cambios",
          onClick: handleSubmit,
          disabled: isPending || !hayCambios || (!esHoraDisponible(formData.hora) && formData.hora !== turno.hora.slice(0, 5)),
        }}
        secondaryButton={{
          text: "Cancelar",
          onClick: onClose,
        }}
      />

      {/* Modal para mostrar mensajes */}
      <BaseDialog
        type={dialog.type}
        size="sm"
        title={dialog.type === 'success' ? "Éxito" : "Error"}
        message={dialog.message}
        isOpen={dialog.open}
        onClose={() => setDialog({ ...dialog, open: false })}
        showCloseButton
        primaryButton={{
          text: "Aceptar",
          onClick: () => setDialog({ ...dialog, open: false }),
        }}
      />

      {/* Confirmación de notificación WhatsApp */}
      <BaseDialog
        type="warning"
        size="sm"
        title="¿Notificar al paciente?"
        message={
          <span>
            Se detectaron cambios en la fecha, hora o profesional del turno.
            <br /><br />
            ¿Querés enviar una notificación por WhatsApp al paciente con la información actualizada?
          </span>
        }
        isOpen={confirmDialog.show}
        onClose={() => setConfirmDialog({ show: false, datos: null })}
        primaryButton={{
          text: "Sí, notificar",
          onClick: () => {
            const datos = confirmDialog.datos;
            setConfirmDialog({ show: false, datos: null });
            ejecutarActualizacion(datos, true);
          },
        }}
        secondaryButton={{
          text: "No notificar",
          onClick: () => {
            const datos = confirmDialog.datos;
            setConfirmDialog({ show: false, datos: null });
            ejecutarActualizacion(datos, false);
          },
        }}
      />
    </>
  );
}