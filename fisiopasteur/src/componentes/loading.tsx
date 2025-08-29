import Image from "next/image";

interface LoadingProps {
  size?: number;
  className?: string;
  showText?: boolean;
  text?: string;
}

export default function Loading({ 
  size = 48, 
  className = "", 
  showText = true, 
  text = "Cargando datos..." 
}: LoadingProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 space-y-4 ${className}`}>
      <Image
        src="/favicon.svg"
        alt="Logo Fisiopasteur"
        width={size}
        height={size}
        className="animate-bounce"
        priority
      />
      {showText && (
        <span className="text-gray-600">{text}</span>
      )}
    </div>
  );
}

// Componente para pantalla completa de carga
export function FullScreenLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="text-center">
        <Loading size={64} text="Cargando..." />
      </div>
    </div>
  );
}