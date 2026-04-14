import { Suspense } from "react";

export default function Home() {
  // El middleware ya maneja toda la lógica de redirección
  // Este componente nunca debería renderizarse en realidad
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirigiendo...</p>
      </div>
    </Suspense>
  );
}