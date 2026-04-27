import Herramientas from "@/componentes/herramientas/herramientas";
import BarraCelular from "@/componentes/barra/barra";
import Image from "next/image";
import { obtenerPermisosNav } from "@/lib/actions/perfil.action";
import { PerfilNavProvider } from "@/hooks/PerfilNavContext";

const defaultFlags = {
  tienePilates: false,
  tieneEspecialidadNoPilates: false,
  puedeGestionar: false,
};

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const flags = (await obtenerPermisosNav()) ?? defaultFlags;

  return (
    <PerfilNavProvider flags={flags}>
      {/* Logo fijo */}
      <div className="hidden lg:block fixed top-6 left-2 z-50 bg-white rounded-full p-2 shadow-lg">
        <Image src="/favicon.svg" alt="Logo" width={32} height={32} />
      </div>

      {/* Navegación */}
      <Herramientas />
      <BarraCelular />

      {/* Contenido */}
      <main className="min-h-screen bg-white lg:pl-12 lg:pt pb-20 lg:pb-0">
        {children}
      </main>
    </PerfilNavProvider>
  );
}
