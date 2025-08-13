import type { Metadata } from "next";
import BackgroundPattern from "@/componentes/patron-fondo";

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
    <BackgroundPattern>
      {children}
    </BackgroundPattern>
  );
}