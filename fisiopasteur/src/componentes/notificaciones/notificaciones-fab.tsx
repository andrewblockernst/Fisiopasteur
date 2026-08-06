"use client";

import { BellRing } from "lucide-react";
import { useRouter } from "next/navigation";

/** FAB mobile-only que lleva al gestor de notificaciones. Mismo posicionamiento que el "+" del calendario. */
export function NotificacionesFab() {
  const router = useRouter();
  return (
    <button
      aria-label="Notificaciones"
      onClick={() => router.push("/notificaciones")}
      className="fixed bottom-25 right-6 w-14 h-14 bg-[#9C1838] hover:bg-[#7D1329] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 z-50 flex items-center justify-center lg:hidden"
    >
      <BellRing size={24} />
    </button>
  );
}
