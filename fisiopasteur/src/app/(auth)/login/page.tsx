"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client"; 
import Head from "next/head";
import Link from "next/link";
import Boton from "@/componentes/boton";
import { useAuth } from "@/hooks/usePerfil"; 
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true); // Nuevo estado para verificación inicial
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);


  const router = useRouter();

   // ✅ Verificación inicial de autenticación MÁS RÁPIDA
  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && mounted) {
          console.log('✅ LoginPage: Usuario ya autenticado, redirigiendo...');
          router.replace('/inicio');
        }
      } catch (err) {
        console.error('Error verificando auth:', err);
      } finally {
        if (mounted) {
          setCheckingAuth(false);
        }
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [router]);

  // ✅ Redirigir automáticamente cuando el usuario esté autenticado
  useEffect(() => {
    if (isAuthenticated && !authLoading && !checkingAuth) {
      console.log('✅ Login: Usuario autenticado, redirigiendo a /inicio');
      window.location.href = '/inicio';
    }
  }, [isAuthenticated, authLoading, checkingAuth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPasswordError(null);
    setEmailError(null);

    // Validaciones
    let hasError = false;

    if (!email.trim()) {
      setEmailError("Por favor, completa el correo electrónico");
      hasError = true;
    }

    if (!password.trim()) {
      setPasswordError("Por favor, completa la contraseña");
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres");
      hasError = true;
    }

    if (hasError) {
      setLoading(false);
      return;
    }

    try {
      // Usar el cliente singleton
      const supabase = getSupabaseClient();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(false);
        // Traducir mensajes de error comunes de Supabase al español
        let mensajeError = error.message;
        
        if (error.message.toLowerCase().includes('invalid login credentials') || 
            error.message.toLowerCase().includes('invalid credentials')) {
          mensajeError = "Credenciales de inicio de sesión no validas";
        } else if (error.message.toLowerCase().includes('email not confirmed')) {
          mensajeError = "Por favor, confirma tu correo electrónico";
        } else if (error.message.toLowerCase().includes('user not found')) {
          mensajeError = "Usuario no encontrado";
        } else if (error.message.toLowerCase().includes('too many requests')) {
          mensajeError = "Demasiados intentos. Por favor, intenta más tarde";
        }
        
        setError(mensajeError);
        return;
      }

      // ✅ Login exitoso - hard redirect para cargar todo el estado limpio
      console.log('✅ Login exitoso, redirigiendo a /inicio...');
      window.location.href = '/inicio';
    } catch (err) {
      console.error('Error inesperado en login:', err);
      setError('Error inesperado. Por favor, intenta nuevamente.');
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Inicio de sesión | Fisiopasteur</title>
      </Head>

      <div className="h-screen flex">
        <div className="w-full md:w-1/2 flex items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <h2 className="text-lg font-medium text-black">Bienvenido/a a</h2>
            <h1 className="text-3xl font-bold text-[var(--brand)] mb-8">Fisiopasteur</h1>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-black">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError(null);
                  }}
                  placeholder="Ej. usuario@gmail.com"
                  className={`mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 text-black ${
                    emailError 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-red-500'
                  }`}
                />
                {emailError && (
                  <p className="text-red-500 text-sm mt-1">{emailError}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-black">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="Ej. 12345678"
                  className={`mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 text-black ${
                    passwordError 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-red-500'
                  }`}
                />
                {passwordError && (
                  <p className="text-red-500 text-sm mt-1">{passwordError}</p>
                )}
              </div>

              {error && <p className="text-[var(--brand)] text-sm">{error}</p>}

              <Boton
                variant="primary"
                type="submit"
                disabled={loading || authLoading}
                className="w-full"
              >
                {loading 
                  ? "Autenticando..." 
                  : authLoading 
                  ? "Cargando perfil..." 
                  : "Iniciar Sesión"}
              </Boton>

              <div className="text-center">
                <Link href="/login/recuperarContra" className="text-black hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </form>
          </div>
        </div>

        <div className="hidden md:flex w-1/2 relative overflow-hidden items-center justify-center">
          <div className="relative z-10">
            <Image
              src="/favicon.svg"
              alt="Logo principal Fisiopasteur"
              width={800}
              height={192}
            />
          </div>
        </div>
      </div>
    </>
  );
}