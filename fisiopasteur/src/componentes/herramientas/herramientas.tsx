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
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const Herramientas = () => {
  const router = useRouter();

  return (
    <aside className="hidden lg:flex fixed top-1/2 left-0 -translate-y-1/2 bg-[#9C1838] py-6 px-2 flex-col items-center gap-6 shadow-lg rounded-r-lg z-50">
      <IconWrapper icon={<Home size={28} />} onClick={() => router.push('/inicio')} />
      <IconWrapper icon={<Plus size={28} />} />
      <IconWrapper icon={<ClipboardList size={28} />} />
      <IconWrapper icon={<CalendarDays size={28} />} />
      <IconWrapper icon={<Accessibility size={28} />} />
      <IconWrapper 
        icon={<FileBadge size={28} />} 
        onClick={() => router.push('/especialista')}
      />
      <IconWrapper icon={<User size={28} />} />
      <IconWrapper icon={<HelpCircle size={28}
      onClick={() => router.push('/centro-de-ayuda')} />} />
      <IconWrapper icon={<Settings size={28} />} />
    </aside>
  );
};

const IconWrapper = ({ icon, onClick }: { icon: React.ReactNode; onClick?: () => void }) => (
  <button 
    className="text-white hover:scale-110 transition-transform duration-200"
    onClick={onClick}
  >
    {icon}
  </button>
);

export default Herramientas;