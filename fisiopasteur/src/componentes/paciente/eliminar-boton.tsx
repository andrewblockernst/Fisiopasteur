'use client'

import { useState } from "react";
import Button from "../boton";
import { deleteEspecialista } from "@/lib/actions/especialista.action";
import BaseDialog from "../dialog/base-dialog";
import { deletePaciente } from "@/lib/actions/paciente.action";

interface DeletePacienteButtonProps {
    id: number;
    nombre: string;
    onDeleted?: () => void;
}

export function DeletePacienteButton({id, nombre, onDeleted}: DeletePacienteButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDialog, setShowDialog] = useState(false);

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            await deletePaciente(id);
            setShowDialog(false);
            if (onDeleted) {
                onDeleted();
            }
        } catch (error) {
            console.error( error);
            alert(error);
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <>
            <Button
                variant="danger"
                className="text-xs flex-1 sm:flex-none"
                onClick={() => setShowDialog(true)}
                disabled={isDeleting}
            >
                {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button>

            <BaseDialog
                type="warning"
                title="confirmar eliminacion de paciente"
                message={
                    <>
                        ¿Estás seguro de que deseas eliminar al paciente "<b>{nombre}</b>"?
                        <br />
                        <i style={{ marginTop: 12, display: "block", fontSize: 12, fontWeight: "bold" }}>
                        Esta acción no se puede deshacer y se perderán todos los datos asociados a este especialista.
                        </i>
                    </>
                }
                isOpen={showDialog}
                primaryButton={{
                    text: isDeleting ? "Eliminando..." : "Eliminar",
                    onClick: handleDelete,
                }}
                secondaryButton={{
                    text: "Cancelar",
                    onClick: () => setShowDialog(false)
                }}
                onClose={() => setShowDialog(false)}
                showCloseButton={true}
            />
        </>
    )
}