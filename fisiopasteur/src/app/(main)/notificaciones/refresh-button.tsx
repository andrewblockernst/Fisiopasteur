"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { IconButton } from "@/componentes/ui";

export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <IconButton
      aria-label="Actualizar"
      onClick={() => start(() => router.refresh())}
      disabled={pending}
      icon={<RefreshCw size={18} className={pending ? "animate-spin" : ""} />}
    />
  );
}
