'use client';

import {
  Home,
  Plus,
  ClipboardList,
  CalendarDays,
  Accessibility,
  FileBadge,
  User,
  HelpCircle,
  Settings,
  Bed,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const Herramientas = () => {
  const router = useRouter();

  return (
    <aside className="hidden lg:flex fixed top-1/2 left-0 -translate-y-1/2 bg-[#9C1838] py-6 px-2 flex-col items-center gap-6 shadow-lg rounded-r-lg z-50">
      <IconWrapper label="Inicio" icon={<Home size={28} />} onClick={() => router.push('/inicio')} />
      <IconWrapper label="Turnos" icon={<ClipboardList size={28} />} onClick={() => router.push('/turnos')} />
      <IconWrapper label="Pilates" icon={<Bed size={28} />} onClick={() => router.push('/pilates')} />
      <IconWrapper label="Calendario" icon={<CalendarDays size={28} />} onClick={() => router.push('/calendario')} />
      <IconWrapper label="Pacientes" icon={<Accessibility size={28} />} onClick={() => router.push('/pacientes')} />
      <IconWrapper label="Especialistas" icon={<FileBadge size={28} />} onClick={() => router.push('/especialistas')} />
      <IconWrapper label="Perfil" icon={<User size={28} />} onClick={() => router.push('/perfil')} />
      <IconWrapper label="Ayuda" icon={<HelpCircle size={28} />} onClick={() => router.push('/centro-de-ayuda')} />
    </aside>
  );
};

const IconWrapper = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) => (
  <button
    className="relative group text-white hover:scale-110 transition-transform duration-200"
    onClick={onClick}
    aria-label={label}
  >
    {icon}
    <span
      className="absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#9C1838] text-white px-3 py-1 rounded-md shadow opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ease-out pointer-events-none"
    >
      {label}
    </span>
  </button>
);

export default Herramientas;
