'use client';

import {
  Home,
  Accessibility,
  Plus,
  CalendarDays,
  User,
  ClipboardList
} from 'lucide-react';

const MobileNavbar = () => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#9C1838] px-4 py-3 flex justify-around items-center shadow-lg z-50">
      <NavItem icon={<Home size={24} />} label="Inicio" />
      <NavItem icon={<ClipboardList size={24} />} label="Pacientes" />
      <NavItem icon={<Plus size={24} />} label="Agregar" />
      <NavItem icon={<CalendarDays size={24} />} label="Calendario" />
      <NavItem icon={<User size={24} />} label="Perfil" />
    </nav>
  );
};

const NavItem = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <button className="text-white hover:scale-105 transition-transform duration-200 flex flex-col items-center gap-1 min-w-0">
    {icon}
    <span className="text-xs font-medium truncate">{label}</span>
  </button>
);

export default MobileNavbar;
