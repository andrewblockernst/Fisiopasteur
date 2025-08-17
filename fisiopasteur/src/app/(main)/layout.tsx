"use client";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css"; 
import Herramientas from "@/componentes/herramientas/herramientas";
import BarraCelular from "@/componentes/barra/barra";
import Image from "next/image";
import BackgroundPattern from "@/componentes/patron-fondo";
import { usePathname } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Nota: El metadata debe estar en un componente separado o usar generateMetadata
// porque este ahora es un client component

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAuthPage = pathname?.startsWith('/autenticacion');

  return (
    <html lang="es">
      <head>
        <title>Fisiopasteur</title>
        <meta name="description" content="Sistema de gestión para Fisiopasteur" />
        <link rel="icon" href="/favicon.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <BackgroundPattern>
          {!isAuthPage && (
            <>
              {/* Logo fijo en esquina superior izquierda - Solo visible en desktop */}
              <div className="hidden lg:block fixed top-4 left-4 z-50 bg-white rounded-full p-2 shadow-lg">
                <Image
                  src="/favicon.svg"
                  alt="Fisiopasteur Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              
              {/* Toolbar para desktop */}
              <Herramientas />
              
              {/* Navbar para mobile */}
              <BarraCelular />
            </>
          )}
          
          <main className={!isAuthPage ? "lg:pl-20 lg:pt-16 pb-20 lg:pb-0" : ""}>
            {children}
          </main>
        </BackgroundPattern>
      </body>
    </html>
  );
}
