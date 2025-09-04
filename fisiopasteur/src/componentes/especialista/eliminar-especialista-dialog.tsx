'use clent'

import { useState } from "react";
import BaseDialog from "../dialog/base-dialog";
import { deleteEspecialista } from "@/lib/actions/especialista.action";
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
            await deleteEspecialista(especialista.id_usuario);
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
                title="confirmar eliminacion de especialista"
                message={
                    <>
                        ¿Estás seguro de que deseas eliminar al especialista "<b>{especialista.nombre + ' ' + especialista.apellido}</b>"?
                        <br />
                        <i style={{ marginTop: 12, display: "block", fontSize: 12, fontWeight: "bold" }}>
                            Esta acción no se puede deshacer.
                        </i>
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