"use client";

import { deleteEspecialista } from "@/lib/actions/especialista.action";
import Button from "@/components/button";
import { useState } from "react";

interface DeleteEspecialistaButtonProps {
  id: string;
  nombre: string;
}

export function DeleteEspecialistaButton({ id, nombre }: DeleteEspecialistaButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de que quieres eliminar a ${nombre}?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteEspecialista(id);
    } catch (error) {
      console.error("Error:", error);
      alert("Error al eliminar especialista");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="danger"
      className="text-xs"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? "Eliminando..." : "Eliminar"}
    </Button>
  );
}