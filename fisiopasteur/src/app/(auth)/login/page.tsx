"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client"; 
import Head from "next/head";
import Link from "next/link";
import Boton from "@/componentes/boton"; 

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

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

    // Crear el cliente aquí
    const supabase = createClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      router.push("/inicio");
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
                  className={`mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 placeholder:text-black ${
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
                  className={`mt-1 w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 placeholder:text-black ${
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
                disabled={loading}
                className="w-full"
              >
                {loading ? "Cargando..." : "Iniciar Sesión"}
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
