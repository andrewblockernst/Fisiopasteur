"use client";

import BaseDialog from "./base-dialog";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger"
}: ConfirmDialogProps) {
  
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const variantColors = {
    danger: "#DC2626",
    warning: "#F59E0B",
    info: "#3B82F6"
  };

  return (
    <BaseDialog
      type="custom"
      size="sm"
      title={title}
      customIcon={<AlertTriangle className="w-6 h-6" />}
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton
      customColor={variantColors[variant]}
      message={
        <div className="space-y-4">
          <p className="text-sm text-gray-700">{message}</p>
          
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium`}
              style={{ backgroundColor: variantColors[variant] }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      }
    />
  );
}
