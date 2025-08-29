'use client'
import { Tables } from "@/types/database.types";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getPaciente } from "@/lib/actions/paciente.action";

type Paciente = Tables<'paciente'>;

interface ConsultaPacienteMobileProps {
    viewingPaciente: Paciente ;
    onClose: () => void;
    onEdit?: () => void;
    onDelete?: () => void; 
}

export default function ConsultaPacienteMobile() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const [isEditing, setIsEditing] = useState(false);
    const [viewingPaciente, setViewingPaciente] = useState<Paciente | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPaciente = async () => {
            try {
                setLoading(true);
                
                // Opción 1: Intentar obtener los datos del query parameter 'data'
                const pacienteDataParam = searchParams.get('data');
                if (pacienteDataParam) {
                    try {
                        const pacienteFromParams = JSON.parse(decodeURIComponent(pacienteDataParam));
                        setViewingPaciente(pacienteFromParams);
                        setLoading(false);
                        return;
                    } catch (parseError) {
                        console.warn('Error parsing paciente data from URL:', parseError);
                        // Si hay error parseando, continúa con la consulta a DB
                    }
                }
                
                // Opción 2: Si no hay query parameter o falló el parsing, cargar desde DB
                const pacienteId = params.id as string;
                if (pacienteId) {
                    const paciente = await getPaciente(parseInt(pacienteId));
                    setViewingPaciente(paciente);
                }
            } catch (error) {
                console.error('Error loading paciente:', error);
                // Opcional: manejar error o redirigir
                router.push('/pacientes');
            } finally {
                setLoading(false);
            }
        };

        loadPaciente();
    }, [params.id, searchParams, router]);

    if (!viewingPaciente) {
        return <div>Loading...</div>;
    }

    const onEdit = () => {
        // Handle edit logic
    };

    const onDelete = () => {
        // Handle delete logic
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
        <div className="md:hidden fixed inset-0 bg-gray-50 z-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-4">
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => {router.push('/pacientes')}}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    
                    <h1 className="text-lg font-semibold text-gray-900">
                        Perfil
                    </h1>
                    
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="p-2 -mr-2 bg-[#9C1838] rounded-full hover:bg-[#7D1329] transition-colors"
                    >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto">
                {/* Información principal del usuario */}
                <div className="bg-white px-6 py-8 text-center">
                    <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {viewingPaciente.nombre} {viewingPaciente.apellido}
                    </h2>
                    
                    <div className="flex items-center justify-center space-x-4 text-gray-600">
                        {viewingPaciente.email && (
                            <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span className="text-sm">{viewingPaciente.email}</span>
                            </div>
                        )}
                    </div>
                    
                    {viewingPaciente.telefono && (
                        <div className="flex items-center justify-center mt-2 text-gray-600">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="text-sm">{viewingPaciente.telefono}</span>
                        </div>
                    )}
                </div>

                {/* Información de contacto y detalles */}
                <div className="bg-white mt-6 mx-4 rounded-lg shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-[#9C1838]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Información Personal
                        </h3>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        <div className="flex justify-between items-center py-2">
                            <span className="text-gray-600">DNI</span>
                            <span className="font-medium text-gray-900">
                                {viewingPaciente.dni || 'No especificado'}
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2">
                            <span className="text-gray-600">Fecha de Nacimiento</span>
                            <span className="font-medium text-gray-900">
                                {viewingPaciente.fecha_nacimiento ? 
                                    viewingPaciente.fecha_nacimiento.split('-').reverse().join('/') : 
                                    'No especificada'
                                }
                            </span>
                        </div>
                        
                        {calculateAge(viewingPaciente.fecha_nacimiento) && (
                            <div className="flex justify-between items-center py-2">
                                <span className="text-gray-600">Edad</span>
                                <span className="font-medium text-gray-900">
                                    {calculateAge(viewingPaciente.fecha_nacimiento)} años
                                </span>
                            </div>
                        )}
                        
                        {viewingPaciente.direccion && (
                            <div className="flex justify-between items-center py-2">
                                <span className="text-gray-600">Dirección</span>
                                <span className="font-medium text-gray-900 text-right max-w-48 truncate">
                                    {viewingPaciente.direccion}
                                </span>
                            </div>
                        )}
                        
                        <div className="flex justify-between items-center py-2">
                            <span className="text-gray-600">Estado</span>
                            <div className="flex items-center">
                                <div className={`w-2 h-2 rounded-full mr-2 ${
                                    viewingPaciente.activo ? 'bg-green-500' : 'bg-gray-400'
                                }`}></div>
                                <span className="font-medium text-gray-900">
                                    {viewingPaciente.activo ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sección de Tratamientos */}
                <div className="bg-white mt-6 mx-4 rounded-lg shadow-sm mb-20">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-[#9C1838]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Tratamientos
                        </h3>
                    </div>
                    
                    <div className="p-6">
                        <div className="flex flex-wrap gap-2 mb-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#9C1838] text-white">
                                Fisioterapia
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#9C1838] text-white">
                                Osteopatía
                            </span>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center">
                                    <div className="w-2 h-2 bg-[#9C1838] rounded-full mr-3"></div>
                                    <span className="font-medium text-gray-900">Fisioterapia</span>
                                </div>
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center">
                                    <div className="w-2 h-2 bg-[#9C1838] rounded-full mr-3"></div>
                                    <span className="font-medium text-gray-900">Osteopatía</span>
                                </div>
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Botones de acción flotantes */}
            <div className="absolute bottom-6 right-6 flex flex-col space-y-3">
                <button
                    onClick={onEdit}
                    className="w-12 h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                
                <button
                    onClick={onDelete}
                    className="w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
