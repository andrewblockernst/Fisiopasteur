import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PatronFondo from "@/componentes/patron-fondo";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "Fisiopasteur",
  description: "Sistema de gestión para Fisiopasteur",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PatronFondo>
          {children}
        </PatronFondo>
      </body>
    </html>
  );
}