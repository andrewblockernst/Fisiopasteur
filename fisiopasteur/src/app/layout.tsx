import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import PatronFondo from "@/componentes/patron-fondo";
import { GlobalToastContainer } from "@/componentes/notificacion/toast/global-toast-container";
import { QueryProvider } from "@/lib/query-client";
import { AuthProvider } from "@/hooks/AuthContext";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "Fisiopasteur",
  description: "Sistema de gestión interna para Fisiopasteur",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning={true} >
        <QueryProvider>
          <AuthProvider>
            <PatronFondo>
              {children}
            </PatronFondo>
            <GlobalToastContainer />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}