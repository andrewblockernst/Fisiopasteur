"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePassword } from "@/lib/actions/auth.action";
import Boton from "@/componentes/boton"; 

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter(); 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      await updatePassword(password);
      setMessage("Contraseña actualizada con éxito. Ahora podés iniciar sesión.");

      router.push("/login");
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
        <h1 className="text-xl font-semibold text-black">Nueva contraseña</h1>
        <input
          type="password"
          placeholder="Escribe tu nueva contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded"
        />
        <Boton variant="primary" type="submit" className="w-full text-black">
          Guardar
        </Boton>
        {message && <p className="text-green-600 text-sm">{message}</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>
    </div>
  );
}
