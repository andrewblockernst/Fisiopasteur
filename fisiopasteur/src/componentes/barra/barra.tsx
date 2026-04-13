'use client';

import {
  Home,
  CalendarDays,
  User,
  Bed,
  Accessibility,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import AgregarBoton from './agregar-boton';
import { usePerfilNav } from '@/hooks/PerfilNavContext';

const BarraCelular = () => {
  const router = useRouter();
  const { tienePilates, puedeGestionar } = usePerfilNav();
  const verPilates    = puedeGestionar || tienePilates;
  const verCalendario = puedeGestionar || !tienePilates;

  // Especialista exclusivo de Pilates: navbar simplificada sin AgregarBoton
  const esSoloPilates = tienePilates && !puedeGestionar;

  if (esSoloPilates) {
    return (
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#9C1838] px-4 py-3 flex justify-around items-center shadow-lg z-50">
        <NavItem icon={<Home size={24} />} onClick={() => router.push('/inicio')} label="Inicio" />
        <NavItem icon={<Bed size={24} />} onClick={() => router.push('/pilates')} label="Pilates" />
        <NavItem icon={<Accessibility size={24} />} onClick={() => router.push('/pacientes')} label="Pacientes" />
        <NavItem icon={<User size={24} />} onClick={() => router.push('/perfil')} label="Perfil" />
      </nav>
    );
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#9C1838] px-4 py-3 flex justify-around items-center shadow-lg z-50">
      <NavItem icon={<Home size={24} />} onClick={() => router.push('/inicio')} label="Inicio" />
      {verPilates && (
        <NavItem icon={<Bed size={24} />} onClick={() => router.push('/pilates')} label="Pilates" />
      )}
      <AgregarBoton />
      {verCalendario && (
        <NavItem icon={<CalendarDays size={24} />} onClick={() => router.push('/calendario')} label="Calendario" />
      )}
      <NavItem icon={<User size={24} />} onClick={() => router.push('/perfil')} label="Perfil" />
    </nav>
  );
};

const NavItem = ({
  icon,
  label,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) => (
  <button
    className="text-white hover:scale-105 transition-transform duration-200 flex flex-col items-center gap-1 min-w-0"
    onClick={onClick}
  >
    {icon}
    <span className="text-xs font-medium truncate">{label}</span>
  </button>
);

export default BarraCelular;
