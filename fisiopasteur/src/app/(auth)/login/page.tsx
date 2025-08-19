"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client"; // Cambiar este import
import Head from "next/head";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
        <title>Login - Fisiopasteur</title>
      </Head>

      <div className="h-screen flex">
        <div className="w-full md:w-1/2 flex items-center justify-center p-4">
          <div className="w-full max-w-sm">
            <h2 className="text-lg font-medium text-gray-700">Bienvenido/a a</h2>
            <h1 className="text-3xl font-bold text-[var(--brand)] mb-8">Fisiopasteur</h1>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-600">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej. Zoe Gimenez"
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-600">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="12345"
                  className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {error && <p className="text-[var(--brand)] text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[var(--brand)] text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                {loading ? "Cargando..." : "Iniciar Sesión"}
              </button>

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
