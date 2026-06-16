"use client";

import { useEffect, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * Se suscribe a cambios en la tabla `turno` y dispara `onChange` con debounce.
 * Reemplaza el polling cada 5 minutos de los componentes del dashboard.
 *
 * Requiere que la publicación `supabase_realtime` incluya la tabla `turno`
 * (ver migración correspondiente).
 */
export function useTurnoRealtime(onChange: () => void, debounceMs = 800) {
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => {
    const supabase = getSupabaseClient();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cbRef.current(), debounceMs);
    };

    const canal = supabase
      .channel("dashboard-turno")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "turno" },
        trigger,
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(canal);
    };
  }, [debounceMs]);
}
