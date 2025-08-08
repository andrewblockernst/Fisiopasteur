import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Toolbar from "@/components/toolbar/toolbar";
import MobileNavbar from "@/components/navbar/navbar";
import Image from "next/image";
import BackgroundPattern from "@/components/background-pattern";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fisiopasteur",
  description: "Sistema de gestión para Fisiopasteur",
  icons: {
    icon: "/favicon.svg",
  },
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <BackgroundPattern>
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
        <Toolbar />
        
        {/* Navbar para mobile */}
        <MobileNavbar />
        
        <main className="lg:pl-20 lg:pt-16 pb-20 lg:pb-0">
          {children}
        </main>
        </BackgroundPattern>
      </body>
    </html>
  );
}
