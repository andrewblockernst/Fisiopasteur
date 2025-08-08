"use client";

import { useEffect, useState } from "react";
import Button from "@/components/button";
import { Bone } from "lucide-react";

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen pb-40">
      <h1 className="text-6xl font-bold text-gray-800">Error 404.</h1>
      <Bone className="w-10 h-10 mt-5"/>
      <p className="mt-4 text-lg text-gray-600">Página no existente</p>
      {mounted && (
        <Button className="mt-4" variant="primary" onClick={() => window.location.href = "/"}>
          Volver al inicio
        </Button>
      )}
    </div>
  );
}
