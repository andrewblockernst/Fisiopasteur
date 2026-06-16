import { Tables } from "@/types/database.types";
import { useState, useTransition } from "react";
import { DeletePacienteDialog } from "./eliminar-dialog";
import { EditarPacienteDialog } from "./editar-paciente-dialog";
import { useRouter } from "next/navigation";
import { NuevoPacienteDialog } from "./nuevo-paciente-dialog";
import { getPacientes } from "@/lib/actions/paciente.action";
import { Loader2, Plus, Pencil, UserX, UserCheck, ClipboardList, HistoryIcon } from "lucide-react";
import { formatoDNI, formatoNumeroTelefono } from "@/lib/utils";
import { ToastItem, useToastStore } from "@/stores/toast-store";
import CompactListTable from "@/componentes/tablas/compact-list-table";
import { EntityListCard } from "@/componentes/tablas/entity-list-card";
import { RowActionsMenu, RowActionsItem } from "@/componentes/tablas/row-actions-menu";
import { Badge, Checkbox, IconButton } from "@/componentes/ui";

type Paciente = Tables<'paciente'>;

interface PacientesTableProps {
    pacientes: Paciente[];
    onPacienteUpdated?: () => void;
    onPacienteDeleted?: () => void;
    onActivatePaciente: (paciente: Paciente) => void;
    handleToast: (toast: Omit<ToastItem, 'id'>) => void;
    pacientesSeleccionados?: number[];
}

export function PacientesTable({pacientes, onPacienteUpdated, onPacienteDeleted, onActivatePaciente, handleToast, pacientesSeleccionados}: PacientesTableProps) {
    const[editingPaciente, setEditingPaciente] = useState<Paciente | null>(null);
    const[deletingPaciente, setDeletingPaciente] = useState<Paciente | null>(null);
    const[viewingPaciente, setViewingPaciente] = useState<Paciente | null>(null);
    const[showDialog, setShowDialog] = useState(false);
    const [navigatingId, setNavigatingId] = useState<number | null>(null);
    const [, startNavigationTransition] = useTransition();
    const router = useRouter();
    const toast = useToastStore();

    // Navega al perfil del paciente y mantiene un spinner en la fila/card mientras Next
    // resuelve la transición de ruta.
    const handleNavigateToPaciente = (id: number) => {
        if (navigatingId) return;
        setNavigatingId(id);
        startNavigationTransition(() => {
            router.push(`/pacientes/${id}`);
        });
    };

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
            try {
                const updatedPacientes = await getPacientes();
                pacientes = updatedPacientes.data;
            } catch (error) {
                console.error("Error recargando pacientes:", error);
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

        {/* NIVEL 1: Vista mobile (<md) — 1 fila por paciente */}
        <div className="block md:hidden bg-background relative min-h-full flex flex-col">
            <div className="divide-y divide-border">
                {pacientes.map((paciente) => {
                    const isRowNavigating = navigatingId === paciente.id_paciente;
                    const rowDisabled = Boolean(navigatingId);
                    return (
                        <div
                            key={paciente.id_paciente}
                            className={`px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors ${isRowNavigating ? "bg-muted/40" : ""} ${rowDisabled && !isRowNavigating ? "pointer-events-none opacity-70" : ""}`}
                            onClick={() => handleNavigateToPaciente(paciente.id_paciente)}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-foreground font-medium truncate">
                                    {paciente.nombre} {paciente.apellido}
                                </p>
                                {isRowNavigating ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-brand shrink-0" aria-label="Cargando perfil" />
                                ) : (
                                    <Checkbox
                                        checked={pacientesSeleccionados?.includes(paciente.id_paciente) || false}
                                        disabled
                                        aria-label={`Paciente ${paciente.nombre} seleccionado`}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Espacio en blanco al final + FAB sticky dentro del scroll */}
            <div className="mt-auto h-20 shrink-0" aria-hidden />
            <div className="sticky bottom-4 z-20 -mt-16 flex justify-end pr-4 pointer-events-none">
                <button
                    type="button"
                    aria-label="Agregar nuevo paciente"
                    onClick={() => setShowDialog(true)}
                    className="pointer-events-auto h-14 w-14 rounded-full bg-brand text-brand-foreground shadow-lg hover:shadow-xl flex items-center justify-center transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    <Plus className="h-6 w-6" />
                </button>
            </div>
        </div>

        <NuevoPacienteDialog
            isOpen={showDialog}
            onClose={handleDialogClose}
            handleToast={handleToast}
        />

        {/* NIVEL 2: Vista tablet (md..<lg) — cards unificadas */}
        <div className="hidden md:block lg:hidden p-4">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {pacientes.map((paciente) => {
                    const edad = calculateAge(paciente.fecha_nacimiento);
                    const isRowNavigating = navigatingId === paciente.id_paciente;
                    const rowDisabled = Boolean(navigatingId);
                    return (
                        <EntityListCard
                            key={paciente.id_paciente}
                            title={`${paciente.nombre} ${paciente.apellido}`}
                            subtitle={`DNI: ${formatoDNI(paciente.dni || '...')}`}
                            inactive={!paciente.activo}
                            onClick={rowDisabled ? undefined : () => handleNavigateToPaciente(paciente.id_paciente)}
                            className={rowDisabled && !isRowNavigating ? "pointer-events-none opacity-70" : undefined}
                            leadingIndicator={
                                isRowNavigating ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-brand" aria-label="Cargando perfil" />
                                ) : null
                            }
                            badge={
                                <Badge variant={paciente.activo ? 'success' : 'default'} size="sm" pill>
                                    {paciente.activo ? 'Activo' : 'Inactivo'}
                                </Badge>
                            }
                            fields={[
                                { label: 'Email', value: paciente.email || '...' },
                                { label: 'Teléfono', value: formatoNumeroTelefono(paciente.telefono || '...') },
                                {
                                    label: 'F. Nacimiento',
                                    value: paciente.fecha_nacimiento
                                        ? paciente.fecha_nacimiento.split('-').reverse().join('/')
                                        : '...',
                                },
                                { label: 'Edad', value: edad ? `${edad} años` : '...' },
                            ]}
                            actions={
                                <>
                                    <IconButton
                                        variant="secondary"
                                        size="sm"
                                        aria-label="Editar paciente"
                                        title="Editar"
                                        icon={<Pencil className="w-4 h-4" />}
                                        onClick={() => setEditingPaciente(paciente)}
                                    />
                                    {paciente.activo ? (
                                        <IconButton
                                            variant="destructive"
                                            size="sm"
                                            aria-label="Desactivar paciente"
                                            title="Desactivar"
                                            icon={<UserX className="w-4 h-4" />}
                                            onClick={() => setDeletingPaciente(paciente)}
                                        />
                                    ) : (
                                        <IconButton
                                            variant="success"
                                            size="sm"
                                            aria-label="Activar paciente"
                                            title="Activar"
                                            icon={<UserCheck className="w-4 h-4" />}
                                            onClick={() => onActivatePaciente(paciente)}
                                        />
                                    )}
                                    <IconButton
                                        variant="secondary"
                                        size="sm"
                                        aria-label="Ver historial clínico"
                                        title="Historial"
                                        icon={<ClipboardList className="w-4 h-4" />}
                                        onClick={() => router.push(`/pacientes/HistorialClinico?id=${paciente.id_paciente}`)}
                                    />
                                </>
                            }
                        />
                    );
                })}
            </div>
        </div>

        {/* NIVEL 3: Vista desktop (≥lg) — tabla optimizada */}
        <div className="hidden lg:block h-full">
            <CompactListTable className="flex-1 min-h-0" >
                <thead className="bg-muted/40">
                        <tr>
                            <th className="px-4 py-1 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                Paciente
                            </th>
                            <th className="px-4 py-1 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                DNI
                            </th>
                            <th className="px-4 py-1 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                Contacto
                            </th>
                            <th className="px-4 py-1 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                F. Nacimiento
                            </th>
                            <th className="px-4 py-1 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                Edad
                            </th>
                            <th className="px-4 py-1 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                Estado
                            </th>
                            <th className="px-4 py-1 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                Acciones
                            </th>
                        </tr>
                    </thead>

                        <tbody className="bg-card divide-y divide-border">
                        {pacientes.map((paciente) => (
                            <tr key={paciente.id_paciente} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-1 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <div className="text-sm font-medium text-foreground">
                                            {paciente.nombre} {paciente.apellido}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate max-w-48" title={paciente.email || '...'}>
                                            {paciente.email || ''}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-1 whitespace-nowrap text-sm text-foreground">
                                    {formatoDNI(paciente.dni || '...')}
                                </td>
                                <td className="px-4 py-1 whitespace-nowrap text-sm text-foreground">
                                    {formatoNumeroTelefono(paciente.telefono || '...')}
                                </td>
                                <td className="px-4 py-1 whitespace-nowrap text-sm text-foreground">
                                    {paciente.fecha_nacimiento ?
                                        paciente.fecha_nacimiento.split('-').reverse().join('/') : '...'
                                    }
                                </td>
                                <td className="px-4 py-1 whitespace-nowrap text-sm text-foreground">
                                    {calculateAge(paciente.fecha_nacimiento) ?
                                        `${calculateAge(paciente.fecha_nacimiento)} años` : '...'
                                    }
                                </td>
                                <td className="px-4 py-1 whitespace-nowrap">
                                    <Badge
                                        variant={paciente.activo ? 'success' : 'default'}
                                        size="sm"
                                        pill
                                    >
                                        {paciente.activo ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </td>
                                <td className="px-4 py-1 whitespace-nowrap text-sm font-medium">
                                    {/* Botones de icono para pantallas grandes (xl+) */}
                                    <div className="hidden xl:flex gap-1">
                                        <IconButton
                                            variant="ghost"
                                            size="sm"
                                            aria-label="Editar paciente"
                                            title="Editar"
                                            icon={<Pencil className="w-4 h-4" />}
                                            onClick={() => setEditingPaciente(paciente)}
                                        />
                                        {paciente.activo ? (
                                            <IconButton
                                                variant="ghost"
                                                size="sm"
                                                aria-label="Desactivar paciente"
                                                title="Desactivar"
                                                className="text-destructive hover:bg-destructive/10"
                                                icon={<UserX className="w-4 h-4" />}
                                                onClick={() => setDeletingPaciente(paciente)}
                                            />
                                        ) : (
                                            <IconButton
                                                variant="ghost"
                                                size="sm"
                                                aria-label="Activar paciente"
                                                title="Activar"
                                                className="text-success hover:bg-success/10"
                                                icon={<UserCheck className="w-4 h-4" />}
                                                onClick={() => onActivatePaciente(paciente)}
                                            />
                                        )}
                                        <IconButton
                                            variant="ghost"
                                            size="sm"
                                            aria-label="Ver historial clínico"
                                            title="Historial"
                                            icon={<HistoryIcon className="w-4 h-4" />}
                                            onClick={() => router.push(`/pacientes/HistorialClinico?id=${paciente.id_paciente}`)}
                                        />
                                    </div>

                                    {/* Dropdown para pantallas medianas (lg - xl) */}
                                    <div className="hidden lg:block xl:hidden">
                                        <RowActionsMenu ariaLabel="Acciones del paciente">
                                            <RowActionsItem
                                                icon={<Pencil className="w-4 h-4" />}
                                                onSelect={() => setEditingPaciente(paciente)}
                                            >
                                                Editar
                                            </RowActionsItem>
                                            {paciente.activo ? (
                                                <RowActionsItem
                                                    variant="destructive"
                                                    icon={<UserX className="w-4 h-4" />}
                                                    onSelect={() => setDeletingPaciente(paciente)}
                                                >
                                                    Desactivar
                                                </RowActionsItem>
                                            ) : (
                                                <RowActionsItem
                                                    variant="success"
                                                    icon={<UserCheck className="w-4 h-4" />}
                                                    onSelect={() => onActivatePaciente(paciente)}
                                                >
                                                    Activar
                                                </RowActionsItem>
                                            )}
                                            <RowActionsItem
                                                icon={<HistoryIcon className="w-4 h-4" />}
                                                onSelect={() => router.push(`/pacientes/HistorialClinico?id=${paciente.id_paciente}`)}
                                            >
                                                Historial
                                            </RowActionsItem>
                                        </RowActionsMenu>
                                    </div>
                                </td>
                            </tr>
                            ))}
                        </tbody>
            </CompactListTable>
        </div>



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
