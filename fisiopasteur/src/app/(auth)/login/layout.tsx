import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../../globals.css";
import BackgroundPattern from "@/componentes/patron-fondo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Login - Fisiopasteur",
  description: "Iniciar sesión en Fisiopasteur",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <BackgroundPattern>
          <main>{children}</main>
        </BackgroundPattern>
      </body>
    </html>
  );
}