"use client";
import { useEffect } from "react";

interface AutoImpresionProps {
  habilitado?: boolean;
  delay?: number;
}

export default function AutoImpresion({ 
  habilitado = true, 
  delay = 300 
}: AutoImpresionProps) {
  useEffect(() => {
    if (!habilitado) return;
    
    // Pequeño delay para que la página termine de cargar
    const timer = setTimeout(() => {
      window.print();
    }, delay);
    
    return () => clearTimeout(timer);
  }, [habilitado, delay]);
  
  return null; // No renderiza nada visible
}