import Image from "next/image";

interface LoadingProps {
  size?: number;
  className?: string;
}

export default function Loading({ size = 48, className = "" }: LoadingProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="animate-bounce">
        <Image
          src="/favicon.svg"
          alt="Cargando..."
          width={size}
          height={size}
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}

// Componente para pantalla completa de carga
export function FullScreenLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="text-center">
        <Loading size={64} />
        <p className="mt-4 text-sm text-gray-600 animate-pulse">
          Cargando...
        </p>
      </div>
    </div>
  );
}