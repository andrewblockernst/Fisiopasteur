"use client";
import Herramientas from "@/componentes/herramientas/herramientas";
import BarraCelular from "@/componentes/barra/barra";
import Image from "next/image";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Logo fijo */}
      <div className="hidden lg:block fixed top-4 left-4 z-50 bg-white rounded-full p-2 shadow-lg">
        <Image src="/favicon.svg" alt="Logo" width={32} height={32} />
      </div>
      
      {/* Navegación */}
      <Herramientas />
      <BarraCelular />
      
      {/* Contenido */}
      <main className="lg:pl-20 lg:pt-16 pb-20 lg:pb-0">
        {children}
      </main>
    </>
  );
}