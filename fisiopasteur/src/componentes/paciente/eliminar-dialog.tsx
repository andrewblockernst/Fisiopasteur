'use client'

import { useState } from "react";
import BaseDialog from "../dialog/base-dialog";
import { deletePaciente } from "@/lib/actions/paciente.action";
import { Tables } from "@/types/database.types";

type Paciente = Tables<'paciente'>;

interface DeletePacienteDialogProps {
    isOpen: boolean;
    paciente: Paciente;
    onClose: () => void;
}

export function DeletePacienteDialog({isOpen, onClose, paciente}: DeletePacienteDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    // const [showDialog, setShowDialog] = useState(false);

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            await deletePaciente(paciente.id_paciente);
            onClose();
        } catch (error) {
            console.error( error);
            alert(error);
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <>
            {/* <Button
                variant="danger"
                className="text-xs px-3 py-2 h-8 flex-1 min-w-20 sm:flex-none sm:min-w-16 lg:px-8 lg:py-2 flex items-center justify-center"
                onClick={() => setShowDialog(true)}
                disabled={isDeleting}
            >
                {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button> */}

            <BaseDialog
                type="warning"
                title="confirmar eliminacion de paciente"
                message={
                    <>
                        ¿Estás seguro de que deseas eliminar al paciente "<b>{paciente.nombre + ' ' + paciente.apellido}</b>"?
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