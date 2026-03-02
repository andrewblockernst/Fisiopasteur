'use client'

import { useState } from "react";
import BaseDialog from "../dialog/base-dialog";
import { deletePaciente } from "@/lib/actions/paciente.action";
import { Tables } from "@/types/database.types";
import { ToastItem } from "@/stores/toast-store";

type Paciente = Tables<'paciente'>;

interface DeletePacienteDialogProps {
    isOpen: boolean;
    paciente: Paciente;
    onClose: () => void;
    handleToast: (toast: Omit<ToastItem, 'id'>) => void;
}

export function DeletePacienteDialog({isOpen, onClose, paciente, handleToast}: DeletePacienteDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            await deletePaciente(paciente.id_paciente);
            handleToast({
                variant: "success",
                message: "El paciente se ha eliminado correctamente.",
            });
            onClose();
        } catch (error) {
            console.error( error);
            handleToast({
                variant: "error",
                message: error instanceof Error ? error.message : "Error al eliminar el paciente.",
            });
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <>
            <BaseDialog
                type="warning"
                title="confirmar eliminacion de paciente"
                message={
                    <>
                        ¿Estás seguro de que deseas eliminar al paciente "<b>{paciente.nombre + ' ' + paciente.apellido}</b>"?
                        <br />
                        <i style={{ marginTop: 12, display: "block", fontSize: 12, fontWeight: "bold" }}>
                        Esta acción se puede deshacer.
                        </i>
                    </>
                }
                isOpen={isOpen}
                primaryButton={{
                    text: isDeleting ? "Eliminando..." : "Eliminar",
                    onClick: handleDelete,
                }}
                secondaryButton={{
                    text: "Cancelar",
                    onClick: () => onClose()
                }}
                onClose={onClose}
                showCloseButton={true}
            />
        </>
    )
}