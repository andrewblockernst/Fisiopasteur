'use client'
import { useState, useEffect } from "react";
import PilatesCalendarioSemanal from "@/componentes/pilates/componenteSemanal";
import { NuevoTurnoPilatesModal } from "@/componentes/pilates/nuevoTurnoPilatesDialog";
import { obtenerTurnosConFiltros, obtenerEspecialistas, obtenerPacientes } from "@/lib/actions/turno.action";
import { addDays, format, startOfWeek } from "date-fns";

export default function PilatesPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<string | null>(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null);

  const [turnos, setTurnos] = useState<any[]>([]);
  const [semanaBase, setSemanaBase] = useState<Date>(new Date());
  const [especialistas, setEspecialistas] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Función para cargar turnos
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

  // Cargar turnos cuando cambia la semana o los especialistas
  useEffect(() => {
    if (especialistas.length > 0) {
      cargarTurnos();
    }
  }, [semanaBase, especialistas]);

  // Cargar datos iniciales
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

  const handleAgregarTurno = (dia: Date, horario: string) => {
    setDiaSeleccionado(dia);
    setHorarioSeleccionado(horario);
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setHorarioSeleccionado(null);
    setDiaSeleccionado(null);
  };

  const handleTurnoCreated = () => {
    cargarTurnos();
  };

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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <PilatesCalendarioSemanal
        turnos={turnos}
        semanaBase={semanaBase}
        onSemanaChange={setSemanaBase}
        onAgregarTurno={handleAgregarTurno}
        especialistas={especialistas}
      />
      
      <NuevoTurnoPilatesModal
        isOpen={showDialog}
        onClose={handleCloseDialog}
        onTurnoCreated={handleTurnoCreated}
        fechaSeleccionada={diaSeleccionado}
        horaSeleccionada={horarioSeleccionado}
        especialistas={especialistas}
        pacientes={pacientes}
      />
    </div>
  );
}