"use client";

import BaseDialog from "./base-dialog";
import { Button } from "@/componentes/ui";
import { AlertTriangle } from "lucide-react";

interface DiscardChangesDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export function DiscardChangesDialog({
  isOpen,
  onCancel,
  onConfirm,
  title = "¿Descartar cambios?",
  message = "Tenés cambios sin guardar. Si cerrás ahora, se perderán.",
}: DiscardChangesDialogProps) {
  return (
    <BaseDialog
      type="warning"
      size="md"
      title={title}
      message={message}
      isOpen={isOpen}
      onClose={onCancel}
      customIcon={<AlertTriangle className="dialog-icon" />}
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-center gap-2 flex-wrap">
          <Button type="button" variant="outline" onClick={onCancel} className="sm:min-w-[140px]">
            Seguir editando
          </Button>
          <Button type="button" variant="primary" onClick={onConfirm} className="sm:min-w-[140px]">
            Descartar cambios
          </Button>
        </div>
      }
    />
  );
}
