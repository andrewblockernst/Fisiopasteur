'use client'

import { useState } from "react";
import BaseDialog from "../dialog/base-dialog";
import { toggleEspecialistaActivo } from "@/lib/actions/especialista.action";
import { Tables } from "@/types/database.types";
import { ToastItem } from "@/stores/toast-store";

type Especialista = Tables<'usuario'>;

interface DeleteEspecialistaDialogProps {
    isOpen: boolean;
    especialista: Especialista;
    onClose: () => void;
    handleToast: (toast: Omit<ToastItem, 'id'>) => void;
}

export function DeleteEspecialistaDialog({isOpen, onClose, especialista, handleToast}: DeleteEspecialistaDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            await toggleEspecialistaActivo(especialista.id_usuario, false);
            handleToast({
                variant: "success",
                message: "El especialista se ha eliminado correctamente.",
            });
            onClose();
        } catch (error) {
            console.error( error);
            handleToast({
                variant: "error",
                message: error instanceof Error ? error.message : "Error al eliminar el especialista.",
            });
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <>
            <BaseDialog
                type="warning"
                title="Confirmar eliminación de especialista"
                message={
                    <>
                        ¿Estás seguro de que deseas eliminar al especialista <b>{especialista.nombre} {especialista.apellido}</b>?
                        <br />
                        <span className="mt-3 block text-xs font-semibold text-muted-foreground">
                            Podrás reactivar al especialista más tarde si lo necesitás.
                        </span>
                    </>
                }
                isOpen={isOpen}
                primaryButton={{
                    text: isDeleting ? "Eliminando..." : "Eliminar",
                    onClick: handleDelete,
                    disabled: isDeleting,
                }}
                secondaryButton={{
                    text: "Cancelar",
                    onClick: onClose,
                }}
                onClose={onClose}
                showCloseButton={true}
            />
        </>
    )

}