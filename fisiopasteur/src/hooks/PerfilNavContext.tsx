'use client';

import { createContext, useContext } from 'react';
import type { PerfilNavFlags } from '@/lib/actions/perfil.action';

export type { PerfilNavFlags };

const defaultFlags: PerfilNavFlags = {
  verTurnos: true,
  verCalendario: true,
  verPilates: true,
  puedeGestionar: false,
};

const PerfilNavContext = createContext<PerfilNavFlags>(defaultFlags);

export function PerfilNavProvider({
  children,
  flags,
}: {
  children: React.ReactNode;
  flags: PerfilNavFlags;
}) {
  return (
    <PerfilNavContext.Provider value={flags}>
      {children}
    </PerfilNavContext.Provider>
  );
}

export function usePerfilNav(): PerfilNavFlags {
  return useContext(PerfilNavContext);
}
