import { Tables } from "@/types/database.types";
import Button from "../boton";
import { useState } from "react";
import { DeletePacienteButton } from "./eliminar-boton";
import { EditarPacienteDialog } from "./editar-paciente-dialog";
import { ConsultaPacienteMobile } from "./consulta-paciente-mobile";


type Paciente = Tables<'paciente'>;

interface PacientesTableProps {
    pacientes: Paciente[];
    onPacienteUpdated?: () => void;
    onPacienteDeleted?: () => void;
}

export function PacientesTable({pacientes, onPacienteUpdated, onPacienteDeleted}: PacientesTableProps) {
    const[editingPaciente, setEditingPaciente] = useState<Paciente | null>(null);
    const[viewingPaciente, setViewingPaciente] = useState<Paciente | null>(null);

    const handleEditClose = () => {
        setEditingPaciente(null);
        if(onPacienteUpdated) {
            onPacienteUpdated()
        }
    }

    const handleViewClose = () => {
        setViewingPaciente(null);
    }

    const handleEditFromView = () => {
        if (viewingPaciente) {
            setEditingPaciente(viewingPaciente);
            setViewingPaciente(null);
        }
    }

    const formatDate = (dateString: string | null): string => {
        if (!dateString) return 'No especificada';
        
        try {
            return new Date(dateString).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (error) {
            return 'Fecha inválida';
        }
    };

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
        {/* Vista de tabla para desktop */}
        <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Apellido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DNI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha de Nacimiento
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
                <tr key={paciente.id_paciente}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {paciente.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {paciente.apellido}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {paciente.dni}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {paciente.email ? paciente.email : '...'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {paciente.telefono ? paciente.telefono : '...'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {paciente.fecha_nacimiento ? new Date(paciente.fecha_nacimiento).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit', 
                        year: 'numeric'
                    }) : '...'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {paciente.activo ? "Activo" : "Inactivo"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Button 
                            variant="secondary" 
                            className="text-xs"
                            onClick={() => setEditingPaciente(paciente)}
                        >
                            Editar
                        </Button>
                        <DeletePacienteButton 
                            id={paciente.id_paciente}
                            nombre={`${paciente.nombre} ${paciente.apellido}`}
                            onDeleted={onPacienteDeleted}
                        />
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
    
        {/* Vista de lista para mobile */}
        <div className="md:hidden bg-white">
            <div className="divide-y divide-gray-200">
                {pacientes.map((paciente) => (
                    <div 
                        key={paciente.id_paciente} 
                        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors`}
                        onClick={() => setViewingPaciente(paciente)}
                    >
                        <div className="flex items-center justify-between">
                            <p className="text-gray-900 font-medium">
                                {paciente.nombre} {paciente.apellido}
                            </p>
                            {/* Indicador de estado minimalista */}
                            <div className={`w-2 h-2 rounded-full ${
                                paciente.activo ? 'bg-green-500' : 'bg-gray-400'
                            }`}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Modal de consulta - funciona para ambas vistas */}
        {viewingPaciente && (
            <ConsultaPacienteMobile
                viewingPaciente={viewingPaciente}
                onClose={() => setViewingPaciente(null)}
                onEdit={handleEditFromView}
            />
        )}

        {/* Modal de edición - funciona para ambas vistas */}
        {editingPaciente && (
            <EditarPacienteDialog
                isOpen={true}
                onClose={handleEditClose}
                paciente={editingPaciente}
            />
        )}
        </>
    );
}
