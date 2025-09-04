'use client'

import { Tables } from "@/types/database.types";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { deletePaciente, getPaciente } from "@/lib/actions/paciente.action";
import { EditarPacienteDialog } from "@/componentes/paciente/editar-paciente-dialog";
import { on } from "events";
import BarraCelular from "@/componentes/barra/barra";
import { HistorialClinicoMobile } from "@/componentes/paciente/historial-clinico-mobile";
import { Bone } from "lucide-react";
import Button from "@/componentes/boton";
import { FullScreenLoading } from "@/componentes/loading";
import { DeletePacienteDialog } from "@/componentes/paciente/eliminar-dialog";
import { useToastStore } from "@/stores/toast-store";

type Paciente = Tables<'paciente'>;

// interface ConsultaPacienteMobileProps {
//     viewingPaciente: Paciente ;
//     onClose: () => void;
//     onEdit?: () => void;
//     onDelete?: () => void; 
// }

export default function ConsultaPacienteMobile() {
    const router = useRouter();
    const params = useParams();
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [viewingPaciente, setViewingPaciente] = useState<Paciente | null>(null);
    const [loading, setLoading] = useState(true);
    const toast = useToastStore();

    useEffect(() => {
        const loadPaciente = async () => {
            try {
                setLoading(true);
                const pacienteId = params.id as string;
                if (pacienteId) {
                    const paciente = await getPaciente(parseInt(pacienteId));
                    setViewingPaciente(paciente);
                }
            } catch (error) {
                console.error('Error loading paciente:', error);
                
                
                
            } finally {
                setLoading(false);
            }
        };

        loadPaciente();
    }, [params.id, router]);

    if (loading) {
        return <FullScreenLoading />;
    }

    if (!viewingPaciente) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen pb-40">
                <h1 className="text-6xl font-bold text-gray-800">Error 404.</h1>
                <Bone className="w-10 h-10 mt-5"/>
                <p className="mt-4 text-lg text-gray-600">Página no existente</p>
                <Button className="mt-4" variant="primary" onClick={() => window.location.href = "/pacientes"}>
                    Volver al listado de los pacientes
                </Button>
            </div>
        );
    }

    const handleDeleteClose = async () => {
        setIsDeleting(false);
        try {
            const paciente = await getPaciente(viewingPaciente.id_paciente);
            setViewingPaciente(paciente);
        } catch (error) {
            console.error('Error fetching deleted paciente:', error);
        }
    };

    const handleEditClose = async () => {
        setIsEditing(false);
        try {
            const paciente = await getPaciente(viewingPaciente.id_paciente);
            setViewingPaciente(paciente);
        } catch (error) {
            console.error('Error fetching updated paciente:', error);
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
            

            <div className="md:hidden fixed inset-0 bg-gray-50 z-50 flex flex-col text-black">
                {/* Header */}
                <div className="bg-white border-b border-gray-100 px-4 py-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <button 
                            onClick={() => {router.push('/pacientes')}}
                            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        
                        <h1 className="text-lg font-semibold text-gray-900 absolute left-1/2 transform -translate-x-1/2">
                            Perfil
                        </h1>
                        
                        <div className="flex space-x-2">
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="p-2 bg-[#9C1838] rounded-full hover:bg-[#7D1329] transition-colors"
                            >
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>

                            <button 
                                onClick={() => setIsDeleting(true)}
                                className="p-2 bg-[#9C1838] rounded-full hover:bg-[#7D1329] transition-colors"
                            >
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                

                {/* Contenido */}
                <div className="flex-1 overflow-y-auto overscroll-y-contain">
                    {/* Información principal del usuario */}
                    <div className="bg-white px-6 py-8 text-center">                        
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
                                    <span className="font-medium text-gray-900 text-right max-w-48">
                                        {viewingPaciente.direccion}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sección de Historial Clínico */}
                        <HistorialClinicoMobile pacienteId={viewingPaciente.id_paciente} />
                        
                    {/* Espacio adicional al final para evitar que el contenido quede cortado */}
                    <div className="h-8"></div>
                </div>

                
                
                {isEditing && (
                    <EditarPacienteDialog
                        isOpen={true}
                        onClose={handleEditClose}
                        paciente={viewingPaciente}
                        handleToast={toast.addToast}
                    />
                )}

                {isDeleting && (
                    <DeletePacienteDialog
                        isOpen={true}
                        onClose={handleDeleteClose}
                        paciente={viewingPaciente}
                        handleToast={toast.addToast}
                    />
                )}

                <BarraCelular />
            </div>
        </>
    );
}
