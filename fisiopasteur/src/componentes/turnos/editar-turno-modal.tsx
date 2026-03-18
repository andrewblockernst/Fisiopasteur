"use client";

import { useState, useTransition, useEffect, useCallback, useMemo } from "react";
import { actualizarTurno, obtenerEspecialistas, obtenerBoxes, obtenerAgendaEspecialista, obtenerTurnos, obtenerPrecioEspecialidad } from "@/lib/actions/turno.action";
import BaseDialog from "@/componentes/dialog/base-dialog";
import PacienteAutocomplete from "@/componentes/paciente/paciente-autocomplete";
import { Database } from "@/types/database.types";
import Image from "next/image";
import Loading from "../loading";
import { useToastStore } from '@/stores/toast-store';
import { formatoDNI, formatoNumeroTelefono } from "@/lib/utils";
import { useAuth } from "@/hooks/usePerfil";

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

// Tipo para el turno con relaciones incluidas (como viene del JOIN)
type TurnoConRelaciones = Turno & {
  paciente?: PacienteCompleto;
  especialista?: Usuario;
  especialidad?: Especialidad;
  box?: Box;
};

interface EditarTurnoModalProps {
  turno: TurnoConRelaciones;
  open: boolean;
  onClose: () => void;
  onSaved?: (updated?: TurnoConRelaciones) => void;
}

export default function EditarTurnoDialog({ turno, open, onClose, onSaved }: EditarTurnoModalProps) {
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

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (!open) return;
    
    const cargarDatos = async () => {
      setLoading(true);
      setIsInitializing(true);
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

        const [e, b] = await Promise.all([
          obtenerEspecialistas(),
          obtenerBoxes()
        ]);
        
        setFormData(formDataInicial);
        
        // Establecer los especialistas si vienen en el resultado
        if (e.success && e.data) {
          // Handle especialistas if needed
        }
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
        
        if (e.success) setEspecialistas(
          (e.data || []).map((item: any) => ({
            ...item,
            color: item.color === null ? undefined : item.color
          }))
        );

        const especialistasData: EspecialistaAPI[] = e.success
          ? (e.data || []).map((item: any) => ({
              ...item,
              color: item.color === null ? undefined : item.color
            }))
          : [];

        const boxesData: Box[] = b.success ? (b.data || []) : [];
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
          const agendaRes = await obtenerAgendaEspecialista(formDataInicial.id_especialista, formDataInicial.fecha);
          if (agendaRes.success && agendaRes.data) {
            const ocupadas: string[] = [];
            agendaRes.data.forEach((turnoAgenda: Turno) => {
              if (turnoAgenda.id_turno === turno.id_turno || turnoAgenda.estado === 'cancelado') {
                return;
              }

              const [horas, minutos] = turnoAgenda.hora.split(':').map(Number);
              const inicioTurno = new Date();
              inicioTurno.setHours(horas, minutos, 0, 0);
              const finTurno = new Date(inicioTurno.getTime() + (60 * 60000));

              const inicioSlot = new Date(inicioTurno);
              while (inicioSlot < finTurno) {
                ocupadas.push(inicioSlot.toTimeString().slice(0, 5));
                inicioSlot.setMinutes(inicioSlot.getMinutes() + 15);
              }
            });
            setHorasOcupadas(ocupadas);
          }
        } else {
          setHorasOcupadas([]);
        }

        if (formDataInicial.fecha && formDataInicial.hora) {
          const turnosRes = await obtenerTurnos({ fecha: formDataInicial.fecha });
          if (turnosRes.success && turnosRes.data) {
            const [horaInicio, minutoInicio] = formDataInicial.hora.split(':').map(Number);
            const inicioTurno = new Date();
            inicioTurno.setHours(horaInicio, minutoInicio, 0, 0);
            const finTurno = new Date(inicioTurno.getTime() + (60 * 60000));

            const turnosConflicto = turnosRes.data.filter((turnoCheck: any) => {
              if (turnoCheck.estado === 'cancelado' || !turnoCheck.id_box || turnoCheck.id_turno === turno.id_turno) {
                return false;
              }

              const [horaTurno, minutoTurno] = turnoCheck.hora.split(':').map(Number);
              const inicioTurnoExistente = new Date();
              inicioTurnoExistente.setHours(horaTurno, minutoTurno, 0, 0);
              const finTurnoExistente = new Date(inicioTurnoExistente.getTime() + (60 * 60000));

              return inicioTurno < finTurnoExistente && finTurno > inicioTurnoExistente;
            });

            const boxesOcupados = turnosConflicto.map((turnoCheck: any) => turnoCheck.id_box);
            const disponibles = boxesData.filter((box) => !boxesOcupados.includes(box.id_box));

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
        setIsInitializing(false);
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, [open, turno]);

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
    if (isInitializing) return;

    const verificarHorariosOcupados = async () => {
      if (!formData.id_especialista || !formData.fecha) {
        setHorasOcupadas([]);
        return;
      }

      setVerificandoDisponibilidad(true);
      try {
        const res = await obtenerAgendaEspecialista(formData.id_especialista, formData.fecha);
        if (res.success && res.data) {
          // Generar lista de horas ocupadas, excluyendo el turno actual
          const ocupadas: string[] = [];
          
          res.data.forEach((turnoAgenda: Turno) => {
            // Excluir el turno actual que se está editando
            if (turnoAgenda.id_turno === turno.id_turno || turnoAgenda.estado === 'cancelado') {
              return;
            }
            
            const [horas, minutos] = turnoAgenda.hora.split(':').map(Number);
            const inicioTurno = new Date();
            inicioTurno.setHours(horas, minutos, 0, 0);
            
            // Duración del turno (1 hora por defecto)
            const duracionTurno = 60; // minutos
            const finTurno = new Date(inicioTurno.getTime() + (duracionTurno * 60000));
            
            // Marcar todos los slots de tiempo ocupados en intervalos de 15 minutos
            const inicioSlot = new Date(inicioTurno);
            while (inicioSlot < finTurno) {
              const horaStr = inicioSlot.toTimeString().slice(0, 5); // "HH:MM"
              ocupadas.push(horaStr);
              inicioSlot.setMinutes(inicioSlot.getMinutes() + 15); // Intervalos de 15 min
            }
          });
          
          setHorasOcupadas(ocupadas);
        }
      } catch (error) {
        console.error('Error verificando horarios:', error);
      } finally {
        setVerificandoDisponibilidad(false);
      }
    };

    verificarHorariosOcupados();
  }, [formData.id_especialista, formData.fecha, turno.id_turno, isInitializing]);

  // Verificar boxes disponibles cuando cambia fecha y hora
  useEffect(() => {
    if (isInitializing) return;

    const verificarBoxesDisponibles = async () => {
      if (!formData.fecha || !formData.hora) {
        setBoxesDisponibles(boxes);
        return;
      }

      setVerificandoBoxes(true);
      try {
        // Obtener todos los turnos en esa fecha y hora específica
        const res = await obtenerTurnos({
          fecha: formData.fecha
        });
        
        if (res.success && res.data) {
          // Calcular el rango de tiempo del turno (1 hora)
          const [horaInicio, minutoInicio] = formData.hora.split(':').map(Number);
          const inicioTurno = new Date();
          inicioTurno.setHours(horaInicio, minutoInicio, 0, 0);
          const finTurno = new Date(inicioTurno.getTime() + (60 * 60000)); // 1 hora después

          // Filtrar turnos que se solapan con nuestro horario (excluyendo el turno actual)
          const turnosConflicto = res.data.filter((turnoCheck: any) => {
            if (turnoCheck.estado === 'cancelado' || 
                !turnoCheck.id_box || 
                turnoCheck.id_turno === turno.id_turno) return false;
            
            const [horaTurno, minutoTurno] = turnoCheck.hora.split(':').map(Number);
            const inicioTurnoExistente = new Date();
            inicioTurnoExistente.setHours(horaTurno, minutoTurno, 0, 0);
            const finTurnoExistente = new Date(inicioTurnoExistente.getTime() + (60 * 60000));

            // Verificar solapamiento
            return (inicioTurno < finTurnoExistente && finTurno > inicioTurnoExistente);
          });

          // Obtener IDs de boxes ocupados
          const boxesOcupados = turnosConflicto.map((turnoCheck: any) => turnoCheck.id_box);

          // Filtrar boxes disponibles
          const disponibles = boxes.filter(box => !boxesOcupados.includes(box.id_box));
          setBoxesDisponibles(disponibles);

          // Si el box actual ya no está disponible pero es el que tenía asignado, incluirlo
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
  }, [formData.fecha, formData.hora, boxes, turno.id_turno, formData.id_box, isInitializing]);

  // Función para verificar si una hora específica está disponible
  const esHoraDisponible = (hora: string): boolean => {
    if (!hora || horasOcupadas.length === 0) return true;
    
    // Verificar si la hora exacta está ocupada
    if (horasOcupadas.includes(hora)) return false;
    
    // Verificar si hay conflicto con turnos existentes (duración de 1 hora)
    const [horas, minutos] = hora.split(':').map(Number);
    const inicioNuevoTurno = new Date();
    inicioNuevoTurno.setHours(horas, minutos, 0, 0);
    
    // Verificar conflictos con slots ocupados
    for (let i = 0; i < 4; i++) { // 4 slots de 15 min = 1 hora
      const slotTiempo = new Date(inicioNuevoTurno.getTime() + (i * 15 * 60000));
      const slotStr = slotTiempo.toTimeString().slice(0, 5);
      if (horasOcupadas.includes(slotStr)) {
        return false;
      }
    }
    
    return true;
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
        if (formData.fecha === new Date().toISOString().split('T')[0]) {
          const ahora = new Date();
          const [horaNum, minNum] = hora.split(':').map(Number);
          const horaTurno = new Date();
          horaTurno.setHours(horaNum, minNum, 0, 0);
          
          if (horaTurno <= ahora) {
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


const handleSubmit = async () => {
  if (!formData.fecha || !formData.hora || !formData.id_especialista || !formData.id_especialidad || !formData.id_paciente) {
    addToast({
      variant: 'error',
      message: 'Campos requeridos',
      description: 'Por favor completa fecha, hora, especialista, especialidad y paciente',
    });
    return;
  }

  startTransition(async () => {
    try {
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

      const res = await actualizarTurno(turno.id_turno, datosActualizacion);

      if (res.success) {
        addToast({
          variant: 'success',
          message: 'Turno actualizado',
          description: 'Los cambios se guardaron correctamente',
        });
        
        // Manejar el caso donde res.data puede ser undefined
        if (res) {
          onSaved?.(res.data as any);
        } else {
          onSaved?.(); // Llamar sin parámetros si no hay data
        }
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
                      {especialista.nombre} {especialista.apellido}
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
                renderOption={(paciente) => (
                  <>
                    <div className="font-medium">
                      {paciente.nombre} {paciente.apellido}
                    </div>
                    <div className="text-sm text-gray-500">
                      DNI: {formatoDNI(paciente.dni)} • Tel: {formatoNumeroTelefono(paciente.telefono || 'No disponible')}
                    </div>
                  </>
                )}
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
                min={new Date().toISOString().split('T')[0]}
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
    </>
  );
}