import { Tables } from "@/types/database.types";
import Button from "../boton";
import { useState, useEffect, use } from "react";
import { DeletePacienteDialog } from "./eliminar-dialog";
import { EditarPacienteDialog } from "./editar-paciente-dialog";
import { ConsultaPacienteMobile } from "./consulta-paciente-mobile";
import { useRouter } from "next/navigation";
import { NuevoPacienteDialog } from "./nuevo-paciente-dialog";
import { activarPaciente, getPacientes } from "@/lib/actions/paciente.action";
import { ChevronUp, EllipsisVertical } from "lucide-react";
import { formatoDNI, formatoNumeroTelefono } from "@/lib/utils";
import { ToastItem, useToastStore } from "@/stores/toast-store";



type Paciente = Tables<'paciente'>;

interface PacientesTableProps {
    pacientes: Paciente[];
    onPacienteUpdated?: () => void;
    onPacienteDeleted?: () => void;
    onActivatePaciente: (paciente: Paciente) => void;
    handleToast: (toast: Omit<ToastItem, 'id'>) => void;
}

export function PacientesTable({pacientes, onPacienteUpdated, onPacienteDeleted, onActivatePaciente, handleToast}: PacientesTableProps) {
    const[editingPaciente, setEditingPaciente] = useState<Paciente | null>(null);
    const[deletingPaciente, setDeletingPaciente] = useState<Paciente | null>(null);
    const[viewingPaciente, setViewingPaciente] = useState<Paciente | null>(null);
    const[showDialog, setShowDialog] = useState(false);
    const[dropdownOpen, setDropdownOpen] = useState<number | null>(null);
    const router = useRouter();
    const toast = useToastStore();

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = () => setDropdownOpen(null);
        if (dropdownOpen !== null) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [dropdownOpen]);

    const handleEditClose = () => {
        setEditingPaciente(null);
        if(onPacienteUpdated) {
            onPacienteUpdated()
        }
    }

    const handleDeleteClose = () => {
        setDeletingPaciente(null);
        if(onPacienteDeleted) {
            onPacienteDeleted();
        }
    }

    const handleDialogClose = async () => {
            setShowDialog(false);
            // Recargar la lista de pacientes después de crear uno nuevo
            try {
                const updatedPacientes = await getPacientes();
                pacientes = updatedPacientes.data;
            } catch (error) {
                console.error("Error reloading patients:", error);
            }
        };

    const handleEditFromView = () => {
        if (viewingPaciente) {
            setEditingPaciente(viewingPaciente);
            setViewingPaciente(null);
        }
    }

    const calculateAge = (birthDate: string | null): number | null => {
        if (!birthDate) return null;
        
        try {
            const birth = new Date(birthDate);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const monthDiff = today.getMonth() - birth.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                age--;
            }
            
            return age;
        } catch (error) {
            return null;
        }
    };

    return (
        <>

        {/* NIVEL 1: Vista Mobile (xs - sm) - Solo nombres */}
        <div className="block sm:hidden bg-white relative">

            <div className="divide-y divide-gray-200">
                {pacientes.map((paciente) => (
                    <div 
                        key={paciente.id_paciente} 
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                            router.push(`/pacientes/${paciente.id_paciente}`);
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-gray-900 font-medium">
                                {paciente.nombre} {paciente.apellido}
                            </p>
                            <div className={`w-2 h-2 rounded-full ${
                                paciente.activo ? 'bg-green-500' : 'bg-gray-400'
                            }`}></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Botón flotante para agregar paciente */}
            <button
                onClick={() => setShowDialog(true)}
                className="fixed bottom-20 right-6 w-14 h-14 bg-[#9C1838] hover:bg-[#7D1329] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 z-50 flex items-center justify-center"
                aria-label="Agregar nuevo paciente"
            >
                <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                    />
                </svg>
            </button>
        </div>

        <NuevoPacienteDialog
            isOpen={showDialog}
            onClose={handleDialogClose}
            handleToast={handleToast}
        />

        {/* NIVEL 2: Vista Tablet (sm - lg) - Tarjetas compactas */}
        <div className="hidden sm:block lg:hidden">
            <div className="grid gap-4">
                {pacientes.map((paciente) => (
                    <div key={paciente.id_paciente} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 text-lg">
                                    {paciente.nombre} {paciente.apellido}
                                </h3>
                                <p className="text-sm text-gray-600">DNI: {paciente.dni || '...'}</p>
                            </div>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                paciente.activo 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-600'
                            }`}>
                                {paciente.activo ? "Activo" : "Inactivo"}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                            <div>
                                <span className="text-gray-500 font-medium">Email:</span>
                                <p className="text-gray-900 truncate" title={paciente.email || '...'}>
                                    {paciente.email || '...'}
                                </p>
                            </div>
                            <div>
                                <span className="text-gray-500 font-medium">Teléfono:</span>
                                <p className="text-gray-900">{formatoNumeroTelefono(paciente.telefono || '...')}</p>
                            </div>
                            <div>
                                <span className="text-gray-500 font-medium">F. Nacimiento:</span>
                                <p className="text-gray-900">
                                    {paciente.fecha_nacimiento ? 
                                        paciente.fecha_nacimiento.split('-').reverse().join('/') : '...'
                                    }
                                </p>
                            </div>
                            <div>
                                <span className="text-gray-500 font-medium">Edad:</span>
                                <p className="text-gray-900">
                                    {calculateAge(paciente.fecha_nacimiento) ? 
                                        `${calculateAge(paciente.fecha_nacimiento)} años` : '...'
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <Button 
                                variant="secondary" 
                                className="text-xs px-3 py-2 h-8 flex items-center justify-center"
                                onClick={() => setEditingPaciente(paciente)}
                            >
                                Editar
                            </Button>
                            <Button
                                variant="danger"
                                className="text-xs px-3 py-2 h-8 flex items-center justify-center"
                                onClick={() => setDeletingPaciente(paciente)}
                            >
                                Eliminar
                            </Button>
                            <Button
                                variant="secondary"
                                className="text-xs px-3 py-2 h-8 flex items-center justify-center"
                                onClick={() => router.push(`/pacientes/HistorialClinico?id=${paciente.id_paciente}`)}
                            >
                                Historial
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* NIVEL 3: Vista Desktop (lg+) - Tabla optimizada */}
        <div className="hidden lg:block bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Paciente
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                DNI
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Contacto
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                F. Nacimiento
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Edad
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Estado
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    
                        <tbody className="bg-white divide-y divide-gray-200">
                        {pacientes.map((paciente) => (
                            <tr key={paciente.id_paciente} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <div className="text-sm font-medium text-gray-900">
                                            {paciente.nombre} {paciente.apellido}
                                        </div>
                                        <div className="text-sm text-gray-500 truncate max-w-48" title={paciente.email || '...'}>
                                            {paciente.email || ''}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatoDNI(paciente.dni || '...')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatoNumeroTelefono(paciente.telefono || '...')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {paciente.fecha_nacimiento ? 
                                        paciente.fecha_nacimiento.split('-').reverse().join('/') : '...'
                                    }
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {calculateAge(paciente.fecha_nacimiento) ? 
                                        `${calculateAge(paciente.fecha_nacimiento)} años` : '...'
                                    }
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        paciente.activo 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {paciente.activo ? "Activo" : "Inactivo"}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    {/* Botones individuales para pantallas grandes (xl+) */}
                                    <div className="hidden xl:flex gap-2">

                                        <Button 
                                            variant="secondary" 
                                            className="text-xs px-3 py-2 h-8 min-w-16 flex items-center justify-center"
                                            onClick={() => setEditingPaciente(paciente)}
                                        >
                                            Editar
                                        </Button>

                                        {paciente.activo && (
                                            <Button
                                                variant="danger"
                                                className="text-xs px-3 py-2 h-8 min-w-16 flex items-center justify-center"
                                                onClick={() => setDeletingPaciente(paciente)}
                                            >
                                                Eliminar
                                            </Button>
                                        )}

                                        {!(paciente.activo) && (
                                            <Button
                                                variant="success"
                                                className="text-xs px-3 py-2 h-8 min-w-16 flex items-center justify-center"
                                                onClick={() => onActivatePaciente(paciente)}
                                            >
                                                Activar
                                            </Button>
                                        )}
                                        <Button
                                            variant="secondary"
                                            className="text-xs px-3 py-2 h-8 min-w-16 flex items-center justify-center"
                                            onClick={() => router.push(`/pacientes/HistorialClinico?id=${paciente.id_paciente}`)}
                                        >
                                            Historial
                                        </Button>

                                    </div>

                                    {/* Dropdown para pantallas medianas (lg - xl) */}
                                    <div className="hidden lg:block xl:hidden relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDropdownOpen(dropdownOpen === paciente.id_paciente ? null : paciente.id_paciente);
                                            }}
                                            className="text-xs px-3 py-2 h-8 min-w-16 flex items-center justify-center hover:bg-slate-50 transition-colors"
                                        >   
                                            <div className="relative w-5 h-5">
                                                <ChevronUp 
                                                    className={`absolute w-5 h-5 transition-all duration-300 ease-in-out ${
                                                        dropdownOpen === paciente.id_paciente 
                                                            ? 'opacity-100 rotate-0' 
                                                            : 'opacity-0 rotate-180'
                                                    }`}
                                                />
                                                <EllipsisVertical 
                                                    className={`absolute w-5 h-5 transition-all duration-300 ease-in-out ${
                                                        dropdownOpen === paciente.id_paciente 
                                                            ? 'opacity-0 rotate-180' 
                                                            : 'opacity-100 rotate-0'
                                                    }`}
                                                />
                                            </div>
                                        </button>

                                        {dropdownOpen === paciente.id_paciente && (
                                            <div 
                                                className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-50"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="py-1">
                                                    <button
                                                        onClick={() => {
                                                            setEditingPaciente(paciente);
                                                            setDropdownOpen(null);
                                                        }}
                                                        className="block w-full text-left px-4 py-2 border-b border-gray-300 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                    >
                                                        Editar
                                                    </button>
                                                    {paciente.activo && (
                                                    <button
                                                        onClick={() => setDeletingPaciente(paciente)}
                                                        className="block w-full text-left px-4 py-2 border-b border-gray-300 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                    >
                                                        Eliminar
                                                    </button>
                                                    )}
                                                    {!(paciente.activo) && (
                                                        <button
                                                            onClick={() => onActivatePaciente(paciente)}
                                                            className="block w-full text-left px-4 py-2 border-b border-gray-300 text-sm text-green-600 hover:bg-green-50 transition-colors"
                                                        >
                                                            Activar
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => {
                                                            router.push(`/pacientes/HistorialClinico?id=${paciente.id_paciente}`);
                                                            setDropdownOpen(null);
                                                        }}
                                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors "
                                                    >
                                                        Historial
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                </table>
                
            </div>
        </div>
            
        
        {/* Modal de consulta - Solo Mobile */}
        {viewingPaciente && (
            <ConsultaPacienteMobile
                viewingPaciente={viewingPaciente}
                onClose={() => setViewingPaciente(null)}
                onEdit={handleEditFromView}
                onDelete={() => setDeletingPaciente(viewingPaciente)}
            />
        )}

        {/* Modal de edición - Todas las vistas */}
        {editingPaciente && (
            <EditarPacienteDialog
                isOpen={true}
                onClose={handleEditClose}
                paciente={editingPaciente}
                handleToast={handleToast}
            />
        )}

        {/* Modal de eliminación */}
        {deletingPaciente && (
            <DeletePacienteDialog
                isOpen={true}
                paciente={deletingPaciente}
                onClose={handleDeleteClose}
                handleToast={handleToast}
            />
        )}
        </>
    );
}
