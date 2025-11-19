"use client";

import { useState } from "react";
import { resetPassword } from "@/lib/actions/auth.action";
import Boton from "@/componentes/boton"; 
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setEmailError(null);

    // Validar que el email no esté vacío
    if (!email.trim()) {
      setEmailError("Por favor, completa el correo electrónico");
      return;
    }

    try {
      await resetPassword(email);
      setMessage("Te enviamos un correo para restablecer tu contraseña.");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="p-6 bg-white rounded-lg shadow-md space-y-4 w-full max-w-sm"
      >
        <h1 className="text-xl font-semibold text-black">Coloque su email</h1>
        <div>
          <input
            type="email"
            placeholder="Tucorreo@gmail.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(null);
            }}
            className={`w-full px-3 py-2 border rounded text-black placeholder:text-gray-500 ${
              emailError 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300'
            }`}
          />
          {emailError && (
            <p className="text-red-500 text-sm mt-1">{emailError}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Boton variant="primary" type="submit" className="w-full text-black">
            Enviar link
          </Boton>
          <Boton
            variant="secondary"
            type="button"
            className="w-full text-black"
            onClick={() => router.push("/login")}
          >
            Cancelar
          </Boton>
        </div>
        {message && <p className="text-green-600 text-sm">{message}</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>
    </div>
  );
}
