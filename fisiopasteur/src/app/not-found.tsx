"use client";

import { useEffect, useState } from "react";
import Button from "@/components/button";

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-6xl font-bold text-gray-800">Error 404</h1>
      <p className="mt-4 text-lg text-gray-600">Página no encontrada</p>
      {mounted && (
        <Button className="mt-4" variant="danger" onClick={() => window.location.href = "/"}>
          Volver al inicio
        </Button>
      )}
    </div>
  );
}
