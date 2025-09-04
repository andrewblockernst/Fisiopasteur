'use client'

import BarraCelular from "@/componentes/barra/barra";
import Button from "@/componentes/boton";
import { EditarEspecialistaDialog } from "@/componentes/especialista/editar-especialista-dialog";
import { DeleteEspecialistaDialog } from "@/componentes/especialista/eliminar-especialista-dialog";
import { FullScreenLoading } from "@/componentes/loading";
import { getEspecialista } from "@/lib/actions/especialista.action";
import { Tables } from "@/types/database.types";
import { Bone } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { use, useEffect, useState } from "react";
import { useToastStore } from "@/stores/toast-store";

type Especialidad = Tables<'especialidad'>
type Especialista = Tables<"usuario"> & { 
    especialidades?: Especialidad[] 
};

export default function ConsultaEspecialistaMobile() {
    const router = useRouter();
    const params = useParams();
    const toast = useToastStore();
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [viewingEspecialista, setViewingEspecialista] = useState<Especialista | null>(null);
    // const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadEspecialista = async () => {
            try {
                setIsLoading(true);
                const especialistaId = params.id as string;
                if (especialistaId) {
                    const especialista = await getEspecialista(especialistaId);
                    setViewingEspecialista(especialista);
                    // const especialidades = await getEs(especialistaId);
                    // setEspecialidades(especialidades);
                }
            } catch (error) {
                console.error("Error loading especialista:", error);
            } finally {
                setIsLoading(false);
            }
        }

        loadEspecialista();
    }, [params.id, router]);

    if (isLoading) {
        return <FullScreenLoading />;
    }

    if (!viewingEspecialista) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen pb-40">
                <h1 className="text-6xl font-bold text-gray-800">Error 404.</h1>
                <Bone className="w-10 h-10 mt-5"/>
                <p className="mt-4 text-lg text-gray-600">Página no existente</p>
                <Button className="mt-4" variant="primary" onClick={() => window.location.href = "/especialistas"}>
                    Volver al listado de los especialistas
                </Button>
            </div>
        );
    }

    const handleDeleteClose = async () => {
        setIsDeleting(false);
        try {
            const especialista = await getEspecialista(viewingEspecialista.id_usuario);
            setViewingEspecialista(especialista);
        } catch (error) {
            console.error('Error fetching deleted especialista:', error);
        }
    };

    const handleEditClose = async () => {
        setIsEditing(false);
        try {
            const especialista = await getEspecialista(viewingEspecialista.id_usuario);
            setViewingEspecialista(especialista);
        } catch (error) {
            console.error('Error fetching updated especialista:', error);
        }
    };

    return (
        <div className="md:hidden fixed inset-0 bg-gray-50 z-50 flex flex-col text-black">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => {router.push("/especialistas")}}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>

                        <button 
                            onClick={() => setIsDeleting(true)}
                            className="p-2 bg-[#9C1838] rounded-full hover:bg-[#7D1329] transition-colors"
                        >
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="flex-1 overflow-y-auto overscroll-y-contain">
                <div className="bg-white px-6 py-8 text-center">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {viewingEspecialista.nombre}{" "}
                        {viewingEspecialista.apellido}
                    </h2>

                    <div className="flex items-center justify-center space-x-4 text-gray-600">
                        {viewingEspecialista.email && (
                            <div className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                </svg>
                                <span className="text-sm">
                                    {viewingEspecialista.email}
                                </span>
                            </div>
                        )}
                    </div>

                    {viewingEspecialista.telefono && (
                        <div className="flex items-center justify-center mt-2 text-gray-600">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                            </svg>
                            <span className="text-sm">
                                {viewingEspecialista.telefono}
                            </span>
                        </div>
                    )}
                </div>

            </div>

            {isEditing && (
                <EditarEspecialistaDialog
                    isOpen={isEditing}
                    onClose={handleEditClose}
                    especialidades={viewingEspecialista.especialidades || []}
                    especialista={viewingEspecialista}
                />
            )}

            {isDeleting && (
                <DeleteEspecialistaDialog
                    isOpen={isDeleting}
                    onClose={handleDeleteClose}
                    especialista={viewingEspecialista}
                    handleToast={toast.addToast}
                />
            )}

            <BarraCelular />
        </div>


    );
}