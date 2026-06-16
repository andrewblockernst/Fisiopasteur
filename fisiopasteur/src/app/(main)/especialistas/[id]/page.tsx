'use client'

import BotonLegacy from "@/componentes/boton";
import { Button } from "@/componentes/ui";
import { EditarEspecialistaDialog } from "@/componentes/especialista/editar-especialista-dialog";
import { DeleteEspecialistaDialog } from "@/componentes/especialista/eliminar-especialista-dialog";
import { PerfilEspecialistaSkeleton } from "@/componentes/especialista/perfil-especialista-skeleton";
import { PerfilEspecialistaDesktop, ResumenActividad } from "@/componentes/especialista/perfil-especialista-desktop";
import {
    getPerfilEspecialista,
    getEstadisticasEspecialista,
    EstadisticasEspecialista,
} from "@/lib/actions/especialista.action";
import { getEspecialidades } from "@/lib/actions/especialidad.action";
import { Tables } from "@/types/database.types";
import { ArrowLeft, Bone, CircleDollarSign, Mail, Palette, Pencil, Phone, Trash } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useToastStore } from "@/stores/toast-store";
import { PerfilCompleto } from "@/lib/actions/perfil.action";
import { formatoNumeroTelefono } from "@/lib/utils";
import { useAuth } from "@/hooks/usePerfil";
import { useInvalidateEspecialistas } from "@/hooks/useEspecialistasQuery";

type Especialidad = Tables<'especialidad'>

const BRAND = '#9C1838';

export default function ConsultaEspecialistaPage() {
    const router = useRouter();
    const params = useParams();
    const toast = useToastStore();
    const { user } = useAuth();
    const invalidateEspecialistas = useInvalidateEspecialistas();
    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [viewingEspecialista, setViewingEspecialista] = useState<PerfilCompleto | null>(null);
    const [estadisticas, setEstadisticas] = useState<EstadisticasEspecialista | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                setLoadingStats(true);
                const especialistaId = params.id as string;
                if (!especialistaId) return;

                const [especialistaResult, especialidadesResult, statsResult] = await Promise.all([
                    getPerfilEspecialista(especialistaId),
                    getEspecialidades(),
                    getEstadisticasEspecialista(especialistaId),
                ]);

                if (especialistaResult.success) {
                    setViewingEspecialista(especialistaResult.data ?? null);
                } else {
                    console.error("Error loading especialista:", especialistaResult.error);
                }

                const especialidades = especialidadesResult.success ? especialidadesResult.data : [];
                setEspecialidades(especialidades);

                if (statsResult.success) {
                    setEstadisticas(statsResult.data ?? null);
                }
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setIsLoading(false);
                setLoadingStats(false);
            }
        }

        loadData();
    }, [params.id]);

    if (isLoading) {
        return <PerfilEspecialistaSkeleton canManage={Boolean(user?.puedeGestionarTurnos)} />;
    }

    if (!viewingEspecialista) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen pb-40">
                <h1 className="text-6xl font-bold text-gray-800">Error 404.</h1>
                <Bone className="w-10 h-10 mt-5"/>
                <p className="mt-4 text-lg text-gray-600">Página no existente</p>
                <BotonLegacy className="mt-4" variant="primary" onClick={() => router.push("/especialistas")}>
                    Volver al listado de los especialistas
                </BotonLegacy>
            </div>
        );
    }

    const refreshEspecialista = async () => {
        if (!viewingEspecialista) return;
        const res = await getPerfilEspecialista(viewingEspecialista.id_usuario);
        if (res.success) setViewingEspecialista(res.data ?? null);
    };

    const handleDeleteClose = async () => {
        setIsDeleting(false);
        await Promise.all([refreshEspecialista(), invalidateEspecialistas()]);
    };

    const handleEditClose = async () => {
        setIsEditing(false);
        await Promise.all([refreshEspecialista(), invalidateEspecialistas()]);
    };

    const canManage = Boolean(user?.puedeGestionarTurnos);
    const canSeePrecios = canManage || user?.id_usuario === viewingEspecialista.id_usuario;

    const desktopActions = canManage ? (
        <>
            <Button variant="secondary" leftIcon={<Pencil className="w-4 h-4" />} onClick={() => setIsEditing(true)}>
                Editar
            </Button>
            <Button variant="destructive" leftIcon={<Trash className="w-4 h-4" />} onClick={() => setIsDeleting(true)}>
                Eliminar
            </Button>
        </>
    ) : null;

    return (
        <div className="min-h-screen text-foreground">
            {/* Mobile Header */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 lg:hidden">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.push("/especialistas")}
                        className="p-2 -ml-2 rounded-md active:scale-95 transition hover:bg-gray-100"
                        aria-label="Volver"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>

                    <h1 className="absolute left-1/2 transform -translate-x-1/2 text-lg font-semibold whitespace-nowrap">
                        Perfil Especialista
                    </h1>

                    {canManage && (
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

            {/* Mobile view (< lg) */}
            <div className="lg:hidden grid grid-cols-1 gap-6 max-w-[1500px] mx-auto px-4 py-6">
                <div>
                    <div className="text-center mt-4">
                        <h2 className="text-[28px] leading-tight font-extrabold">
                            {viewingEspecialista.nombre}<br />{viewingEspecialista.apellido}
                        </h2>

                        <div className="mt-4 space-y-1 text-neutral-700">
                            <p className="flex items-center justify-center gap-2">
                                <Mail className="w-4 h-4" />
                                <span className="select-all">{viewingEspecialista.email}</span>
                            </p>
                            <p className="flex items-center justify-center gap-2">
                                <Phone className="w-4 h-4" />
                                <span className="select-all">
                                    {formatoNumeroTelefono(viewingEspecialista.telefono || '—')}
                                </span>
                            </p>
                            <p className='flex items-center justify-center gap-2'>
                                <Palette className="w-4 h-4" />
                                <span
                                    style={{
                                        backgroundColor: viewingEspecialista.color ?? '',
                                        borderRadius: '50%',
                                        display: 'inline-block',
                                        width: 18,
                                        height: 18,
                                        border: '1px solid #ccc',
                                    }}
                                    title={viewingEspecialista.color ?? ''}
                                />
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3 justify-center">
                        {viewingEspecialista.especialidades.map((esp) => (
                            <span
                                key={esp.id_especialidad}
                                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm"
                                style={{ backgroundColor: BRAND }}
                            >
                                {esp.nombre}
                            </span>
                        ))}
                    </div>
                </div>

                <ResumenActividad estadisticas={estadisticas} loading={loadingStats} />

                {canSeePrecios && (
                    <div>
                        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm">
                            <div className="px-6 pt-5 pb-3 flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: `${BRAND}1A` }}
                                >
                                    <CircleDollarSign className="w-5 h-5" style={{ color: BRAND }} />
                                </div>
                                <h3 className="text-base font-semibold text-neutral-800">Precios</h3>
                            </div>

                            <div className="px-4 pb-5 space-y-4">
                                {viewingEspecialista.especialidades.length === 0 ? (
                                    <p className="text-sm text-neutral-600">No hay especialidades asignadas.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {viewingEspecialista.especialidades.map((esp) => (
                                            <div
                                                key={esp.id_especialidad}
                                                className="p-4 border border-neutral-200 rounded-lg"
                                            >
                                                <h5 className="text-sm font-bold text-neutral-800 mb-2">
                                                    {esp.nombre}
                                                </h5>
                                                <dl className="space-y-1 text-sm">
                                                    <div className="flex items-center justify-between">
                                                        <dt className="text-neutral-600">Particular</dt>
                                                        <dd className="font-semibold text-neutral-800">
                                                            $ {esp.precio_particular ?? '—'}
                                                        </dd>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <dt className="text-neutral-600">Obra social</dt>
                                                        <dd className="font-semibold text-neutral-800">
                                                            $ {esp.precio_obra_social ?? '—'}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop view: shared component */}
            <PerfilEspecialistaDesktop
                perfil={viewingEspecialista}
                estadisticas={estadisticas}
                loadingEstadisticas={loadingStats}
                title="Perfil del especialista"
                description={`${viewingEspecialista.nombre} ${viewingEspecialista.apellido}`}
                actions={desktopActions}
                preciosTitle="Precios por especialidad"
                preciosDescription="Tarifas configuradas por el especialista."
                preciosBody={
                    canSeePrecios ? (
                        viewingEspecialista.especialidades.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No hay especialidades asignadas.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {viewingEspecialista.especialidades.map((esp) => (
                                    <article
                                        key={esp.id_especialidad}
                                        className="p-4 rounded-xl border border-border bg-card hover:border-brand/40 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <h4 className="text-sm font-semibold text-foreground">
                                                {esp.nombre}
                                            </h4>
                                            <CircleDollarSign className="w-4 h-4 text-brand shrink-0" />
                                        </div>
                                        <dl className="mt-3 space-y-1.5 text-sm">
                                            <div className="flex items-center justify-between">
                                                <dt className="text-muted-foreground">Particular</dt>
                                                <dd className="font-semibold text-foreground">
                                                    $ {esp.precio_particular ?? '—'}
                                                </dd>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <dt className="text-muted-foreground">Obra social</dt>
                                                <dd className="font-semibold text-foreground">
                                                    $ {esp.precio_obra_social ?? '—'}
                                                </dd>
                                            </div>
                                        </dl>
                                    </article>
                                ))}
                            </div>
                        )
                    ) : null
                }
            />

            {isEditing && especialidades.length > 0 && (
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
                        id_rol: viewingEspecialista.rol.id,
                        rol: viewingEspecialista.rol,
                        especialidades: viewingEspecialista.especialidades.map((esp) => ({
                            id_especialidad: esp.id_especialidad,
                            nombre: esp.nombre,
                            precio_particular: esp.precio_particular ?? null,
                            precio_obra_social: esp.precio_obra_social ?? null,
                        })),
                        usuario_especialidad: [],
                    }}
                />
            )}

            {isDeleting && (
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
                        updated_at: null,
                        id_rol: viewingEspecialista.rol.id,
                    }}
                    handleToast={toast.addToast}
                />
            )}
        </div>
    );
}
