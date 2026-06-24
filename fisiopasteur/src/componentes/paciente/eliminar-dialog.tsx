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
            const result = await deletePaciente(paciente.id_paciente);
            if (!result.success) {
                handleToast({
                    variant: "error",
                    message: result.error,
                });
                return;
            }
            handleToast({
                variant: "success",
                message: "Paciente desactivado.",
            });
            onClose();
        } catch (error) {
            console.error( error);
            handleToast({
                variant: "error",
                message: error instanceof Error ? error.message : "Error al desactivar el paciente.",
            });
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <>
            <BaseDialog
                type="warning"
                title="Desactivar paciente"
                message={
                    <div className="space-y-3">
                        <p>
                            ¿Desactivar a <b>{paciente.nombre} {paciente.apellido}</b>?
                        </p>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                            <li>El paciente queda como <b>inactivo</b> (no se elimina ni se borran sus datos).</li>
                            <li>Sus turnos existentes se mantienen, pero el bot <b>deja de enviar confirmaciones y recordatorios</b> por WhatsApp.</li>
                            <li>Si lo reactivás más adelante, vas a tener que <b>volver a agendar</b> los turnos futuros para que el bot envíe avisos: los recordatorios cancelados no se reactivan solos.</li>
                        </ul>
                    </div>
                }
                isOpen={isOpen}
                primaryButton={{
                    text: isDeleting ? "Desactivando..." : "Desactivar",
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