'use client'
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // <-- Añadido
import { ArrowLeft } from "lucide-react"; // <-- Añadido
import PilatesCalendarioSemanal from "@/componentes/pilates/componenteSemanal";
import PilatesVistaMobile from "@/componentes/pilates/vistaMobile";
import { NuevoTurnoPilatesModal } from "@/componentes/pilates/nuevoTurnoPilatesDialog";
import { DetalleClaseModal } from "@/componentes/pilates/detalleClaseModal";
import { obtenerTurnosConFiltros, obtenerEspecialistas, obtenerPacientes } from "@/lib/actions/turno.action";
import { getIdPilates } from "@/lib/constants/especialidades";
import { dayjs } from "@/lib/dayjs";
import { useToastStore } from '@/stores/toast-store';
import UnifiedSkeletonLoader from "@/componentes/unified-skeleton-loader";

// ============= DEFINIR TIPOS COMPARTIDOS =============
interface SlotInfo {
  disponible: boolean;
  razon: string;
  tipo: 'libre' | 'existente' | 'completa';
  especialistaAsignado?: string;
  participantes?: number;
}

export default function PilatesPage() {
  const router = useRouter(); // <-- Añadido para el botón volver

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
  const [diaBase, setDiaBase] = useState<Date>(new Date());
  const [especialistas, setEspecialistas] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(1); // CAMBIO TEMPORAL PARA PROBAR COMO ADMIN
  const [idPilates, setIdPilates] = useState<number | null>(null);

  // ============= TOAST PARA MENSAJES =============
  const { addToast } = useToastStore();

  // ============= FUNCIÓN PARA CARGAR TURNOS =============
  const cargarTurnos = async () => {
    const inicioSemana = dayjs(semanaBase).startOf("week");
    const desde = inicioSemana.format("YYYY-MM-DD");
    const hasta = inicioSemana.add(6, "day").format("YYYY-MM-DD");
    
    try {
      const res = await obtenerTurnosConFiltros({ 
        fecha_desde: desde, 
        fecha_hasta: hasta,
        especialidad_ids: [String(idPilates)]
      });

      console.log('Turnos obtenidos:', res);
      
      if (res.success && Array.isArray(res.data)) {
        
        const turnosConColor = res.data.map((t: any) => {
          const especialista = especialistas.find(e => String(e.id_usuario) === String(t.id_especialista));
          return {
            ...t,
            especialista_color: especialista?.color || "#e0e7ff"
          };
        });
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

  // ============= CARGAR TURNOS CUANDO CAMBIA LA SEMANA =============
  useEffect(() => {
    if (especialistas.length > 0 && idPilates) {
      cargarTurnos();
    }
  }, [semanaBase, especialistas, idPilates]);

  // Si en celular navegamos a otro día y cae fuera de la semana cargada, movemos la semanaBase
  useEffect(() => {
    const inicioDeSemanaBase = dayjs(semanaBase).startOf("week");
    const finDeSemanaBase = dayjs(semanaBase).endOf("week");
    
    if (dayjs(diaBase).isBefore(inicioDeSemanaBase) || dayjs(diaBase).isAfter(finDeSemanaBase)) {
      setSemanaBase(diaBase);
    }
  }, [diaBase]);

  // ============= CARGAR DATOS INICIALES =============
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const resEspecialistas = await obtenerEspecialistas();
        if (resEspecialistas.success && Array.isArray(resEspecialistas.data)) {
          const especialistasPilates = resEspecialistas.data;

          const todasEspecialidades = especialistasPilates.flatMap((e: any) =>
            (e.usuario_especialidad || []).map((ue: any) => ue.especialidad)
          );
          const pilatesId = getIdPilates(todasEspecialidades);
          setIdPilates(pilatesId);

          setEspecialistas(especialistasPilates);
        }

        const resPacientes = await obtenerPacientes();
        if (resPacientes.success && Array.isArray(resPacientes.data)) {
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

  const verificarDisponibilidadSlot = (dia: Date, horario: string): SlotInfo => {
    const fechaStr = dayjs(dia).format("YYYY-MM-DD");
    const turnosEnSlot = turnos.filter(turno => 
      turno.fecha === fechaStr && 
      turno.hora?.substring(0, 5) === horario
    );

    if (turnosEnSlot.length >= 4) {
      return {
        disponible: false,
        razon: 'La clase está completa (4/4 participantes)',
        tipo: 'completa' as const
      };
    }

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

    return {
      disponible: true,
      razon: 'Slot disponible para nueva clase',
      tipo: 'libre' as const
    };
  };

  const handleAgregarTurno = (dia: Date, horario: string) => {
    const disponibilidad = verificarDisponibilidadSlot(dia, horario);
    
    if (!disponibilidad.disponible) {
      addToast({
        variant: 'warning',
        message: 'Slot no disponible',
        description: disponibilidad.razon,
      });
      return;
    }

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

  const handleVerTurno = (turnos: any[]) => {
    const especialistasUnicos = [...new Set(turnos.map(t => t.id_especialista))];
    
    if (especialistasUnicos.length > 1) {
      if (userRole !== 1) {
        addToast({
          variant: 'error',
          message: 'Conflicto detectado',
          description: 'Esta clase tiene múltiples especialistas. Contacta al administrador.',
        });
        return;
      }
      
      addToast({
        variant: 'warning',
        message: 'Conflicto de especialistas detectado',
        description: 'Como administrador puedes resolver este conflicto desde el modal.',
      });
    }

    setTurnosSeleccionados(turnos);
    setShowDetalleDialog(true);
  };

  const handleCloseDetalleDialog = () => {
    setShowDetalleDialog(false);
    setTurnosSeleccionados([]);
  };

  const handleTurnoCreated = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      await cargarTurnos();
    } catch (error) {
      console.error('❌ Error recargando turnos:', error);
      addToast({
        variant: 'error',
        message: 'Error actualizando datos',
        description: 'No se pudieron recargar los turnos automáticamente. Recarga la página.',
      });
    }
  };

  const getSlotInfo = (): SlotInfo | null => {
    if (!diaSeleccionado || !horarioSeleccionado) return null;
    return verificarDisponibilidadSlot(diaSeleccionado, horarioSeleccionado);
  };

  // Función para manejar el botón de retroceso <-- Añadido
  const handleBack = () => {
    router.back();
  };

  if (loading) {
      return (
        <div className="min-h-screen">
          <UnifiedSkeletonLoader type="calendar" showHeader={false} showFilters={false} />
        </div>
      );
  }

  return (
    <div className="min-h-screen text-black">
      
      {/* ============= MOBILE HEADER (Igual que especialistas/pacientes) ============= */}
      <div className="sm:hidden bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-16">
          <button 
            onClick={handleBack}
            className="p-2 -ml-2 text-black hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-black">Pilates</h1>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto sm:p-8 lg:px-6 lg:pt-8 bg-gray-50 h-full p-0">
    
        {/* ============= VISTA DESKTOP (CALENDARIO SEMANAL) ============= */}
        <div className="hidden md:block">
          <PilatesCalendarioSemanal
            turnos={turnos}
            semanaBase={semanaBase}
            onSemanaChange={setSemanaBase}
            onAgregarTurno={handleAgregarTurno}     
            onVerTurno={handleVerTurno}             
            especialistas={especialistas}
          />
        </div>

        {/* ============= VISTA MOBILE (CALENDARIO DIARIO) ============= */}
        {/* Ajusté el height para restar el header (h-16 que son 64px) */}
        <div className="block md:hidden h-[calc(100vh-64px)]">
          <PilatesVistaMobile
            turnos={turnos}
            diaBase={diaBase}
            onDiaChange={setDiaBase}
            onAgregarTurno={handleAgregarTurno}
            onVerTurno={handleVerTurno}
            especialistas={especialistas}
          />
        </div>
      
        {/* ============= MODALES ============= */}
        <NuevoTurnoPilatesModal
          isOpen={showDialog}
          onClose={handleCloseDialog}
          onTurnoCreated={handleTurnoCreated}
          fechaSeleccionada={diaSeleccionado}
          horaSeleccionada={horarioSeleccionado}
          especialistas={especialistas}
          pacientes={pacientes}
          slotInfo={getSlotInfo()} 
          userRole={userRole}      
        />

        <DetalleClaseModal
          isOpen={showDetalleDialog}
          onClose={handleCloseDetalleDialog}
          onTurnosActualizados={async () => {
            await cargarTurnos(); 
          }}
          turnos={turnosSeleccionados}
          especialistas={especialistas}
          pacientes={pacientes}
          userRole={userRole}
        />
      </div>
    </div>
  );
}
