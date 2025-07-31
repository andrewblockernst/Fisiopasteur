"use client";

import { deleteEspecialista } from "@/lib/actions/especialista.action";
import Button from "@/components/button";
import BaseDialog from "@/components/dialog/base-dialog";
import { useState } from "react";

interface DeleteEspecialistaButtonProps {
  id: string;
  nombre: string;
}

export function DeleteEspecialistaButton({ id, nombre }: DeleteEspecialistaButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteEspecialista(id);
      setShowDialog(false);
    } catch (error) {
      console.error("Error:", error);
      // Podrías mostrar otro dialog de error aquí si quieres
      alert("Error al eliminar especialista");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
      variant="danger"
      className="text-xs"
      onClick={() => setShowDialog(true)}
      disabled={isDeleting}
      >
      {isDeleting ? "Eliminando..." : "Eliminar"}
      </Button>

      <BaseDialog
      type="warning"
      title="Confirmar eliminación de especialista."
      message={
        <>
        ¿Estás seguro de que quieres eliminar a <b>{nombre}</b> como especialista de Fisiopasteur?
        <br />
        <i style={{ marginTop: 12, display: "block", fontSize: 12, fontWeight: "bold" }}>
          Esta acción no se puede deshacer y se perderán todos los datos asociados a este especialista.
        </i>
        </>
      }
      isOpen={showDialog}
      primaryButton={{
        text: isDeleting ? "Eliminando..." : "Eliminar",
        onClick: handleDelete
      }}
      secondaryButton={{
        text: "Cancelar",
        onClick: () => setShowDialog(false)
      }}
      onClose={() => setShowDialog(false)}
      showCloseButton={true}
      />
    </>
  );
}