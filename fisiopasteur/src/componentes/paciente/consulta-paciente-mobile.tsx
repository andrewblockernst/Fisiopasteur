import { Tables } from "@/types/database.types";
import { DeletePacienteDialog } from "./eliminar-dialog";
import Button from "../boton";

type Paciente = Tables<'paciente'>;

interface ConsultaPacienteMobileProps {
    viewingPaciente: Paciente ;
    onClose: () => void;
    onEdit?: () => void;
    onDelete?: () => void; 
}

export function ConsultaPacienteMobile({ viewingPaciente, onClose, onEdit, onDelete }: ConsultaPacienteMobileProps) {

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
        <div>
            {/* Vista de detalle del paciente - Solo Mobile */}
                    {viewingPaciente && (
                        <div className="md:hidden fixed inset-0 bg-white z-50">
                            {/* Header */}
                            <div className="bg-white border-b border-gray-200 px-4 py-3">
                                <div className="flex items-center justify-between">
                                    <button 
                                        onClick={onClose}
                                        className="p-1"
                                    >
                                        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    
                                    <h1 className="text-lg font-medium text-gray-900">
                                        {viewingPaciente.nombre} {viewingPaciente.apellido}
                                    </h1>
                                    
                                    <button 
                                        onClick={onEdit}
                                        className="p-1"
                                    >
                                        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
            
                            {/* Contenido */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                
                                {/* Información básica */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Fecha de nacimiento</label>
                                        <p className="text-gray-900">{viewingPaciente.fecha_nacimiento ? 
                                            viewingPaciente.fecha_nacimiento.split('-').reverse().join('/') : '...'
                                        }</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">DNI</label>
                                            <p className="text-gray-900">{viewingPaciente.dni}</p>
                                        </div>
                                        {calculateAge(viewingPaciente.fecha_nacimiento) && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-500">Edad</label>
                                                <p className="text-gray-900">{calculateAge(viewingPaciente.fecha_nacimiento)} años</p>
                                            </div>
                                        )}
                                    </div>
            
                                    {viewingPaciente.email && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Correo electrónico</label>
                                            <p className="text-blue-600">{viewingPaciente.email}</p>
                                        </div>
                                    )}
            
                                    {viewingPaciente.telefono && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Contacto</label>
                                            <p className="text-gray-900">{viewingPaciente.telefono}</p>
                                        </div>
                                    )}
            
                                    {viewingPaciente.direccion && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-500">Dirección</label>
                                            <p className="text-gray-900">{viewingPaciente.direccion}</p>
                                        </div>
                                    )}
                                    
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Estado</label>
                                        <div className="flex items-center mt-1">
                                            <div className={`w-2 h-2 rounded-full mr-2 ${
                                                viewingPaciente.activo ? 'bg-green-500' : 'bg-gray-400'
                                            }`}></div>
                                            <p className="text-gray-900">{viewingPaciente.activo ? 'Activo' : 'Inactivo'}</p>
                                        </div>
                                    </div>
                                </div>
            
                                {/* Historial (placeholder) */}
                                <div className="border-t pt-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Historial</h3>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                                                    <span className="text-xs font-medium text-gray-600">👤</span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">Lic. Verna Mayer</p>
                                                    <p className="text-sm text-gray-500">Fisioterapeuta</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                    30 Mayo, 2025
                                                </div>
                                                <div className="flex items-center text-sm text-gray-500 mt-1">
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    10:00
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
            
                            {/* Botones de acción */}
                            <div className="border-t bg-white p-4">
                                <div className="flex justify-between space-x-2">
                                    <Button
                                        variant="secondary"
                                        onClick={onEdit}
                                        className="flex-1 text-white py-3 px-4 rounded-lg font-medium"
                                    >
                                        Editar
                                    </Button>
                                    <Button
                                    variant="danger"
                                    onClick={onDelete}
                                    className="flex-1 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        Eliminar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
        </div>
    );
}
