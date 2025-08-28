"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Loading from "@/componentes/loading";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      const supabase = createClient();
      
      // Verificar si hay un code en la URL para restablecimiento de contraseña
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        router.replace(`/login/restablecerContra?code=${code}`);
        return;
      }

      // Verificar autenticación
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error("Error checking auth:", error);
        router.replace("/login");
        return;
      }

      // Si hay usuario autenticado, redirigir a inicio
      // Si no hay usuario, redirigir a login
      if (user) {
        router.replace("/inicio");
      } else {
        router.replace("/login");
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  // Mostrar loading mientras se verifica la autenticación
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loading />
    </div>
  );
}
