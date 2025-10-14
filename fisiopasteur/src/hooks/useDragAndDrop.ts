'use client';

import { useState } from 'react';

export interface DragData {
  turnoId: number;
  fecha: string;
  hora: string;
}

export function useDragAndDrop() {
  const [draggedItem, setDraggedItem] = useState<DragData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const handleDragStart = (turnoId: number, fecha: string, hora: string) => {
    setDraggedItem({ turnoId, fecha, hora });
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setIsDragging(false);
    setIsValidating(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (
    e: React.DragEvent,
    newFecha: string,
    newHora?: string,
    onDrop?: (turnoId: number, newFecha: string, newHora: string) => Promise<void>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedItem && onDrop) {
      const finalHora = newHora || draggedItem.hora;
      
      // Solo actualizar si la fecha u hora cambió
      if (draggedItem.fecha !== newFecha || draggedItem.hora !== finalHora) {
        setIsValidating(true);
        await onDrop(draggedItem.turnoId, newFecha, finalHora);
        setIsValidating(false);
      }
    }

    handleDragEnd();
  };

  return {
    draggedItem,
    isDragging,
    isValidating,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop
  };
}
