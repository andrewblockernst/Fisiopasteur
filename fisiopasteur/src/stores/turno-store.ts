'use client';

import { create } from 'zustand';
import type { Tables } from '@/types/database.types';

type Turno = Tables<'turno'>;
type Usuario = Tables<'usuario'>;
type Box = Tables<'box'>;

export interface TurnoConDetalles extends Turno {
  especialista?: Usuario;
  box?: Box;
  paciente?: {
    id_paciente: number;
    nombre: string;
    apellido: string;
    telefono?: string;
    email?: string;
  };
}

interface TurnoStore {
  turnos: TurnoConDetalles[];
  loading: boolean;
  setTurnos: (turnos: TurnoConDetalles[]) => void;
  setLoading: (loading: boolean) => void;
  addTurno: (turno: TurnoConDetalles) => void;
  updateTurno: (id: number, turno: Partial<TurnoConDetalles>) => void;
  deleteTurno: (id: number) => void;
  getTurnosByDate: (year: number, month: number, day: number) => TurnoConDetalles[];
  getTurnosByEspecialista: (especialistaId: string) => TurnoConDetalles[];
  getTurnosHoy: () => TurnoConDetalles[];
  getTurnosProximos: () => TurnoConDetalles[];
}

export const useTurnoStore = create<TurnoStore>((set, get) => ({
  turnos: [],
  loading: true,

  setTurnos: (turnos) => set({ turnos }),
  setLoading: (loading) => set({ loading }),
  
  addTurno: (turno) => set((state) => ({
    turnos: [...state.turnos, turno]
  })),
  
  updateTurno: (id, updatedTurno) => set((state) => ({
    turnos: state.turnos.map(turno => 
      turno.id_turno === id ? { ...turno, ...updatedTurno } : turno
    )
  })),
  
  deleteTurno: (id) => set((state) => ({
    turnos: state.turnos.filter(turno => turno.id_turno !== id)
  })),
  
  getTurnosByDate: (year, month, day) => {
    const { turnos } = get();
    const targetDate = new Date(year, month, day);
    const dateString = targetDate.toISOString().split('T')[0];
    
    return turnos.filter(turno => turno.fecha === dateString);
  },
  
  getTurnosByEspecialista: (especialistaId) => {
    const { turnos } = get();
    return turnos.filter(turno => turno.id_especialista === especialistaId);
  },
  
  getTurnosHoy: () => {
    const today = new Date();
    return get().getTurnosByDate(today.getFullYear(), today.getMonth(), today.getDate());
  },
  
  getTurnosProximos: () => {
    const { turnos } = get();
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    return turnos
      .filter(turno => turno.fecha >= todayString)
      .sort((a, b) => {
        const dateA = new Date(`${a.fecha}T${a.hora}`);
        const dateB = new Date(`${b.fecha}T${b.hora}`);
        return dateA.getTime() - dateB.getTime();
      });
  }
}));
