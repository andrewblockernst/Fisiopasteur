'use client'

import BarraCelular from "@/componentes/barra/barra";
import Button from "@/componentes/boton";
import { EditarEspecialistaDialog } from "@/componentes/especialista/editar-especialista-dialog";
import { DeleteEspecialistaDialog } from "@/componentes/especialista/eliminar-especialista-dialog";
import { FullScreenLoading } from "@/componentes/loading";
import { getEspecialista, getPerfilEspecialista, getEspecialidades } from "@/lib/actions/especialista.action";
import { Tables } from "@/types/database.types";
import { ArrowLeft, Bone, CircleDollarSign, Mail, Palette, Pencil, Phone, Trash } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { use, useEffect, useState } from "react";
import { useToastStore } from "@/stores/toast-store";
import { PerfilCompleto } from "@/lib/actions/perfil.action";
import { formatoNumeroTelefono } from "@/lib/utils";
import { useAuth } from "@/hooks/usePerfil";

type Especialidad = Tables<'especialidad'>
type Especialista = Tables<"usuario"> & { 
    especialidades?: Especialidad[] 
};

const BRAND = '#9C1838';

export default function ConsultaEspecialistaMobile() {
    const router = useRouter();
    const params = useParams();
    const toast = useToastStore();
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [viewingEspecialista, setViewingEspecialista] = useState<PerfilCompleto | null>(null);

    const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                const especialistaId = params.id as string;
                if (especialistaId) {
                    const [especialista, especialidadesData] = await Promise.all([
                        getPerfilEspecialista(especialistaId),
                        getEspecialidades()
                    ]);
                    setViewingEspecialista(especialista);
                    setEspecialidades(especialidadesData);
                }
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setIsLoading(false);
            }
        }

        loadData();
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
            if (!viewingEspecialista) return;
            const especialista = await getPerfilEspecialista(viewingEspecialista.id_usuario);
            setViewingEspecialista(especialista);
        } catch (error) {
            console.error('Error fetching deleted especialista:', error);
        }
    };

    const handleEditClose = async () => {
        setIsEditing(false);
        try {
            const especialista = await getPerfilEspecialista(viewingEspecialista.id_usuario);
            setViewingEspecialista(especialista);
        } catch (error) {
            console.error('Error fetching updated especialista:', error);
        }
    };

    return (
        // <div className="md:hidden fixed inset-0 bg-gray-50 z-50 flex flex-col text-black">
        //     {/* Header */}
        //     <div className="bg-white border-b border-gray-100 px-4 py-4 flex-shrink-0">
        //         <div className="flex items-center justify-between">
        //             <button
        //                 onClick={() => {router.push("/especialistas")}}
        //                 className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
        //             >
        //                 <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        //                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
        //                 </svg>
        //             </button>

        //             <h1 className="text-lg font-semibold text-gray-900 absolute left-1/2 transform -translate-x-1/2">
        //                 Perfil
        //             </h1>

        //             <div className="flex space-x-2">
        //                 <button
        //                     onClick={() => setIsEditing(true)}
        //                     className="p-2 bg-[#9C1838] rounded-full hover:bg-[#7D1329] transition-colors"
        //                 >
        //                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        //                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
        //                     </svg>
        //                 </button>

        //                 <button 
        //                     onClick={() => setIsDeleting(true)}
        //                     className="p-2 bg-[#9C1838] rounded-full hover:bg-[#7D1329] transition-colors"
        //                 >
        //                     <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        //                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        //                     </svg>
        //                 </button>
        //             </div>
        //         </div>
        //     </div>

        //     {/* Contenido Principal */}
        //     <div className="flex-1 overflow-y-auto overscroll-y-contain">
        //         <div className="bg-white px-6 py-8 text-center">
        //             <h2 className="text-2xl font-bold text-gray-900">
        //                 {viewingEspecialista.nombre}{" "}
        //                 {viewingEspecialista.apellido}
        //             </h2>

        //             <div className="flex items-center justify-center space-x-4 text-gray-600">
        //                 {viewingEspecialista.email && (
        //                     <div className="flex items-center">
        //                         <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        //                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        //                         </svg>
        //                         <span className="text-sm">
        //                             {viewingEspecialista.email}
        //                         </span>
        //                     </div>
        //                 )}
        //             </div>

        //             {viewingEspecialista.telefono && (
        //                 <div className="flex items-center justify-center mt-2 text-gray-600">
        //                     <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        //                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
        //                     </svg>
        //                     <span className="text-sm">
        //                         {viewingEspecialista.telefono}
        //                     </span>
        //                 </div>
        //             )}
        //         </div>

        //     </div>

        //     {isEditing && (
        //         <EditarEspecialistaDialog
        //             isOpen={isEditing}
        //             onClose={handleEditClose}
        //             especialidades={viewingEspecialista.especialidades || []}
        //             especialista={viewingEspecialista}
        //         />
        //     )}

        //     {isDeleting && (
        //         <DeleteEspecialistaDialog
        //             isOpen={isDeleting}
        //             onClose={handleDeleteClose}
        //             especialista={viewingEspecialista}
        //             handleToast={toast.addToast}
        //         />
        //     )}

        //     <BarraCelular />
        // </div>

        <div className="min-h-screen text-black">
            {/* Mobile Header */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 sm:hidden">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => {router.push("/especialistas")}}
                        className="p-2 -ml-2 rounded-md active:scale-95 transition hover:bg-gray-100"
                        aria-label="Volver"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    
                    <h1 className="absolute left-1/2 transform -translate-x-1/2 text-lg font-semibold">Perfil</h1>

                    {/* Mostrar botones solo para Admin y Programadores */}
                    {user?.puedeGestionarTurnos && (
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 rounded-4xl active:scale-95 transition hover:bg-red-800 border-2 border-red-900 text-white ml-auto"
                                style={{ backgroundColor: BRAND }}
                                aria-label="Editar perfil"
                                title="Editar perfil"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                            {/* Mostrar boton de eliminar solo si es admin */}
                            <button
                                onClick={() => setIsDeleting(true)}
                                className="p-2 rounded-4xl active:scale-95 transition hover:bg-red-800 border-2 border-red-900 text-white ml-auto"
                                style={{ backgroundColor: BRAND }}
                                aria-label="Eliminar perfil"
                                title="Eliminar perfil"
                            >
                                <Trash className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                </div>

            </header>

            { viewingEspecialista && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[1500px] mx-auto px-4 py-6 lg:py-10">
                <div className="lg:col-span-7">
                    <div className="text-center mt-4">
                    <h2 className="text-[28px] leading-tight font-extrabold lg:text-[34px]">
                        {viewingEspecialista.nombre}<br />{viewingEspecialista.apellido}
                    </h2>

                    <div className="mt-4 space-y-1 text-neutral-700">
                        <p className="flex items-center justify-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span className="select-all">{viewingEspecialista.email}</span>
                        </p>

                        <p className="flex items-center justify-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span className="select-all">{formatoNumeroTelefono(viewingEspecialista.telefono || '—')}</span>
                        </p>

                        <p className='flex items-center justify-center gap-2'>
                        <Palette className="w-4 h-4" />
                            <span className="" style={{ backgroundColor: viewingEspecialista.color ?? '', borderRadius: '50%', display: 'inline-block', width: 18, height: 18, border: '1px solid #ccc' }} title={viewingEspecialista.color ?? ''}></span>
                            
                        </p>
                    </div>
                    </div>

                    {/* Chips (igual al mock) */}
                    <div className="mt-6 flex flex-wrap gap-3 justify-center">
                    {viewingEspecialista.especialidad_principal && (
                        <span
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm"
                        style={{ backgroundColor: BRAND }}
                        >
                        {viewingEspecialista.especialidad_principal.nombre}
                        <span className="ml-1 text-xs opacity-75">(Principal)</span>
                        </span>
                    )}

                    {viewingEspecialista.especialidades_adicionales.map((esp) => (
                        <span
                        key={esp.id_especialidad}
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm"
                        style={{ backgroundColor: `${BRAND}B3` }} // 70% opacity
                        >
                        {esp.nombre}
                        </span>
                    ))}
                    </div>
                </div>

                {/* Precios - Solo visible para Admin/Programador o el propio especialista */}
                {(user?.puedeGestionarTurnos || user?.id_usuario === viewingEspecialista.id_usuario) && (
                    <div className="lg:col-span-5">
                        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
                            <div className="px-6 pt-5 pb-3 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${BRAND}1A` }}>
                                    <CircleDollarSign className="w-5 h-5" style={{ color: BRAND }} />
                                </div>
                                <h3 className="text-base font-semibold text-neutral-800">Precios</h3>
                            </div>

                            <div className="px-4 pb-5 space-y-4">
                                {!viewingEspecialista.especialidad_principal && viewingEspecialista.especialidades_adicionales.length === 0 && (
                                    <p className="text-sm text-neutral-600">No hay especialidades asignadas.</p>
                                )}

                                {viewingEspecialista.especialidades_adicionales.length > 0 && (
                                    <div className="space-y-4">
                                        
                                        {viewingEspecialista.especialidades_adicionales.map((esp) => (
                                            <div key={esp.id_especialidad} className="p-4 border border-neutral-200 rounded-lg">
                                                <h5 className="text-sm font-bold text-neutral-700 mb-1">{esp.nombre}</h5>
                                                <p className="text-sm text-neutral-600">$ {esp.precio_particular}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                )}

            </div>

            )}

            {/* Diálogos de edición y eliminación */}
            {isEditing && viewingEspecialista && especialidades.length > 0 && (
                <EditarEspecialistaDialog
                    isOpen={isEditing}
                    onClose={handleEditClose}
                    especialidades={especialidades}
                    especialista={{
                        id_usuario: viewingEspecialista.id_usuario,
                        nombre: viewingEspecialista.nombre,
                        apellido: viewingEspecialista.apellido,
                        email: viewingEspecialista.email,
                        telefono: viewingEspecialista.telefono,
                        color: viewingEspecialista.color,
                        activo: true,
                        id_usuario_organizacion: '',
                        id_rol: viewingEspecialista.rol.id,
                        rol: viewingEspecialista.rol,
                        especialidades: [
                            ...(viewingEspecialista.especialidad_principal ? [{
                                id_especialidad: viewingEspecialista.especialidad_principal.id_especialidad,
                                nombre: viewingEspecialista.especialidad_principal.nombre,
                                precio_particular: viewingEspecialista.especialidad_principal.precio_particular ?? null,
                                precio_obra_social: viewingEspecialista.especialidad_principal.precio_obra_social ?? null
                            }] : []),
                            ...viewingEspecialista.especialidades_adicionales.map(esp => ({
                                id_especialidad: esp.id_especialidad,
                                nombre: esp.nombre,
                                precio_particular: esp.precio_particular ?? null,
                                precio_obra_social: esp.precio_obra_social ?? null
                            }))
                        ],
                        usuario_especialidad: []
                    }}
                />
            )}

            {isDeleting && viewingEspecialista && (
                <DeleteEspecialistaDialog
                    isOpen={isDeleting}
                    onClose={handleDeleteClose}
                    especialista={{
                        id_usuario: viewingEspecialista.id_usuario,
                        nombre: viewingEspecialista.nombre,
                        apellido: viewingEspecialista.apellido,
                        email: viewingEspecialista.email,
                        telefono: viewingEspecialista.telefono,
                        color: viewingEspecialista.color,
                        activo: true,
                        contraseña: '',
                        created_at: null,
                        id_especialidad: null,
                        updated_at: null
                    }}
                    handleToast={toast.addToast}
                />
            )}
            
        </div>
    );
}