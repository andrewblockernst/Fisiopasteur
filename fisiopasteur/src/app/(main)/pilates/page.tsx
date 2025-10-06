'use client'
import { useState, useEffect } from "react";
import PilatesCalendarioSemanal from "@/componentes/pilates/componenteSemanal";
import { NuevoTurnoPilatesModal } from "@/componentes/pilates/nuevoTurnoPilatesDialog";
import { DetalleClaseModal } from "@/componentes/pilates/detalleClaseModal";
import { obtenerTurnosConFiltros, obtenerEspecialistas, obtenerPacientes } from "@/lib/actions/turno.action";
import { addDays, format, startOfWeek } from "date-fns";
import { useToastStore } from '@/stores/toast-store';

// ============= DEFINIR TIPOS COMPARTIDOS =============
interface SlotInfo {
  disponible: boolean;
  razon: string;
  tipo: 'libre' | 'existente' | 'completa';
  especialistaAsignado?: string;
  participantes?: number;
}

export default function PilatesPage() {
  // ============= ESTADOS PARA CREAR NUEVOS TURNOS =============
  const [showDialog, setShowDialog] = useState(false);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<string | null>(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null);

  // ============= ESTADOS PARA VER DETALLES DE CLASES EXISTENTES =============
  const [showDetalleDialog, setShowDetalleDialog] = useState(false);
  const [turnosSeleccionados, setTurnosSeleccionados] = useState<any[]>([]);

  // ============= ESTADOS GENERALES =============
  const [turnos, setTurnos] = useState<any[]>([]);
  const [semanaBase, setSemanaBase] = useState<Date>(new Date());
  const [especialistas, setEspecialistas] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(1); // CAMBIO TEMPORAL PARA PROBAR COMO ADMIN

  // ============= TOAST PARA MENSAJES =============
  const { addToast } = useToastStore();

  // ============= FUNCIÓN PARA CARGAR TURNOS =============
  const cargarTurnos = async () => {
    const desde = format(startOfWeek(semanaBase, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const hasta = format(addDays(startOfWeek(semanaBase, { weekStartsOn: 1 }), 6), "yyyy-MM-dd");
    
    try {
      console.log('🔍 Cargando turnos de Pilates desde:', desde, 'hasta:', hasta);
      
      const res = await obtenerTurnosConFiltros({ 
        fecha_desde: desde, 
        fecha_hasta: hasta,
        especialidad_id: 4 // Filtrar solo turnos de Pilates
      });
      
      console.log('📊 Respuesta de turnos:', res);
      
      if (res.success && Array.isArray(res.data)) {
        console.log('📋 Turnos encontrados:', res.data.length);
        
        const turnosConColor = res.data.map((t: any) => {
          const especialista = especialistas.find(e => String(e.id_usuario) === String(t.id_especialista));
          return {
            ...t,
            especialista_color: especialista?.color || "#e0e7ff"
          };
        });
        
        console.log('🎨 Turnos con color:', turnosConColor);
        setTurnos(turnosConColor);
      } else {
        console.error('❌ Error en respuesta de turnos:', res.error);
        setTurnos([]);
      }
    } catch (error) {
      console.error('💥 Error cargando turnos de Pilates:', error);
      setTurnos([]);
    }
  };

  // ============= CARGAR TURNOS CUANDO CAMBIA LA SEMANA O LOS ESPECIALISTAS =============
  useEffect(() => {
    if (especialistas.length > 0) {
      cargarTurnos();
    }
  }, [semanaBase, especialistas]);

  // ============= CARGAR DATOS INICIALES =============
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        // Cargar especialistas de Pilates
        const resEspecialistas = await obtenerEspecialistas();
        if (resEspecialistas.success && Array.isArray(resEspecialistas.data)) {
          const pilates = resEspecialistas.data.filter((e: any) => {
            const principal = e.especialidad?.id_especialidad === 4;
            const adicional = Array.isArray(e.usuario_especialidad)
              ? e.usuario_especialidad.some((ue: any) => ue.especialidad?.id_especialidad === 4)
              : false;
            return principal || adicional;
          });
          
          console.log('👨‍⚕️ Especialistas de Pilates encontrados:', pilates.length);
          setEspecialistas(pilates);
        }

        // Cargar pacientes
        const resPacientes = await obtenerPacientes();
        if (resPacientes.success && Array.isArray(resPacientes.data)) {
          console.log('👥 Pacientes encontrados:', resPacientes.data.length);
          setPacientes(resPacientes.data);
        }
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // ============= FUNCIÓN PARA VERIFICAR SI SLOT ESTÁ DISPONIBLE PARA NUEVOS TURNOS =============
  const verificarDisponibilidadSlot = (dia: Date, horario: string): SlotInfo => {
    const fechaStr = format(dia, "yyyy-MM-dd");
    const turnosEnSlot = turnos.filter(turno => 
      turno.fecha === fechaStr && 
      turno.hora?.substring(0, 5) === horario
    );

    // Verificar si ya está completa (4 participantes)
    if (turnosEnSlot.length >= 4) {
      return {
        disponible: false,
        razon: 'La clase está completa (4/4 participantes)',
        tipo: 'completa' as const
      };
    }

    // Verificar si ya hay un especialista asignado (solo admin puede crear con otro especialista)
    if (turnosEnSlot.length > 0) {
      const especialistaExistente = turnosEnSlot[0].especialista;
      return {
        disponible: true,
        razon: `Clase existente con ${especialistaExistente?.nombre} ${especialistaExistente?.apellido}`,
        tipo: 'existente' as const,
        especialistaAsignado: turnosEnSlot[0].id_especialista,
        participantes: turnosEnSlot.length
      };
    }

    // Slot completamente libre
    return {
      disponible: true,
      razon: 'Slot disponible para nueva clase',
      tipo: 'libre' as const
    };
  };

  // ============= HANDLERS PARA CREAR NUEVOS TURNOS =============
  const handleAgregarTurno = (dia: Date, horario: string) => {
    console.log('🆕 Intentando agregar nuevo turno para:', dia, horario);
    
    const disponibilidad = verificarDisponibilidadSlot(dia, horario);
    
    if (!disponibilidad.disponible) {
      addToast({
        variant: 'warning',
        message: 'Slot no disponible',
        description: disponibilidad.razon,
      });
      return;
    }

    // Si hay una clase existente, verificar permisos para cambiar especialista
    if (disponibilidad.tipo === 'existente' && userRole !== 1) {
      addToast({
        variant: 'info',
        message: 'Clase existente',
        description: `${disponibilidad.razon}. Solo puedes agregar participantes con el mismo especialista.`,
      });
    }

    setDiaSeleccionado(dia);
    setHorarioSeleccionado(horario);
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setHorarioSeleccionado(null);
    setDiaSeleccionado(null);
  };

  // ============= HANDLERS PARA VER DETALLES DE CLASES EXISTENTES =============
  const handleVerTurno = (turnos: any[]) => {
    console.log('👁️ Viendo detalles de turnos:', turnos);
    
    // Verificar que todos los turnos sean del mismo especialista (validación extra)
    const especialistasUnicos = [...new Set(turnos.map(t => t.id_especialista))];
    
    if (especialistasUnicos.length > 1) {
      console.warn('⚠️ Detectado conflicto de especialistas:', especialistasUnicos);
      
      // Solo bloquear si NO es administrador
      if (userRole !== 1) {
        addToast({
          variant: 'error',
          message: 'Conflicto detectado',
          description: 'Esta clase tiene múltiples especialistas. Contacta al administrador.',
        });
        return;
      }
      
      // Si es administrador, permitir acceso con advertencia
      addToast({
        variant: 'warning',
        message: 'Conflicto de especialistas detectado',
        description: 'Como administrador puedes resolver este conflicto desde el modal.',
      });
    }

    setTurnosSeleccionados(turnos);
    setShowDetalleDialog(true);
  };

  // ============= HANDLER PARA CERRAR MODAL DE DETALLES (ESTA FUNCIÓN FALTABA) =============
  const handleCloseDetalleDialog = () => {
    setShowDetalleDialog(false);
    setTurnosSeleccionados([]);
  };

  // ============= HANDLER PARA REFRESCAR DATOS DESPUÉS DE CAMBIOS =============
  const handleTurnoCreated = async () => {
  console.log('🔄 Recargando turnos después de cambios...');
  
  try {
    // Esperar un poco más para asegurar que la BD esté actualizada
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await cargarTurnos();
    
    console.log('✅ Turnos recargados exitosamente');
  } catch (error) {
    console.error('❌ Error recargando turnos:', error);
    addToast({
      variant: 'error',
      message: 'Error actualizando datos',
      description: 'No se pudieron recargar los turnos automáticamente. Recarga la página.',
    });
  }
};

  // ============= OBTENER INFORMACIÓN DE SLOT PARA PASAR AL MODAL =============
  const getSlotInfo = (): SlotInfo | null => {
    if (!diaSeleccionado || !horarioSeleccionado) return null;
    
    return verificarDisponibilidadSlot(diaSeleccionado, horarioSeleccionado);
  };

  // ============= LOADING STATE =============
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#9C1838] mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos de Pilates...</p>
        </div>
      </div>
    );
  }

  // ============= RENDER PRINCIPAL =============
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* ============= CALENDARIO PRINCIPAL ============= */}
      <PilatesCalendarioSemanal
        turnos={turnos}
        semanaBase={semanaBase}
        onSemanaChange={setSemanaBase}
        onAgregarTurno={handleAgregarTurno}     // ← Para crear nuevos turnos (con validaciones)
        onVerTurno={handleVerTurno}             // ← Para ver detalles de clases existentes
        especialistas={especialistas}
      />
      
      {/* ============= MODAL PARA CREAR NUEVOS TURNOS ============= */}
      <NuevoTurnoPilatesModal
        isOpen={showDialog}
        onClose={handleCloseDialog}
        onTurnoCreated={handleTurnoCreated}
        fechaSeleccionada={diaSeleccionado}
        horaSeleccionada={horarioSeleccionado}
        especialistas={especialistas}
        pacientes={pacientes}
        slotInfo={getSlotInfo()} // ← Pasar información del slot para restricciones
        userRole={userRole}      // ← Pasar rol del usuario para permisos
      />

      {/* ============= MODAL PARA VER/EDITAR DETALLES DE CLASES EXISTENTES ============= */}
      <DetalleClaseModal
        isOpen={showDetalleDialog}
        onClose={() => setShowDetalleDialog(false)}
        onTurnosActualizados={async () => {
          console.log('🔄 Recargando datos de la página principal...');
          await cargarTurnos(); // ← Hacer esta función async si no lo es
        }}
        turnos={turnosSeleccionados}
        especialistas={especialistas}
        pacientes={pacientes}
        userRole={userRole}
      />
    </div>
  );
}