'use client';

import {
  Home,
  CalendarDays,
  User,
  Bed,
  Accessibility,
  Loader2,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useTransition } from 'react';
import AgregarBoton from './agregar-boton';
import { usePerfilNav } from '@/hooks/PerfilNavContext';
import { useNavigationLoadingStore } from '@/stores/navigation-loading';
import { cn } from '@/lib/utils';

const BarraCelular = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { tienePilates, tieneEspecialidadNoPilates, puedeGestionar } = usePerfilNav();
  const verPilates    = puedeGestionar || tienePilates;
  const verCalendario = puedeGestionar || tieneEspecialidadNoPilates;

  // Especialista exclusivo de Pilates: navbar simplificada sin AgregarBoton
  const esSoloPilates = tienePilates && !tieneEspecialidadNoPilates && !puedeGestionar;

  const [isPending, startTransition] = useTransition();
  const pendingHref = useNavigationLoadingStore((s) => s.pendingHref);
  const loadingCount = useNavigationLoadingStore((s) => s.loadingCount);
  const setPending = useNavigationLoadingStore((s) => s.setPending);

  useEffect(() => {
    if (!pendingHref) return;
    const matches =
      pathname === pendingHref || pathname.startsWith(`${pendingHref}/`);
    if (matches && !isPending && loadingCount === 0) {
      setPending(null);
    }
  }, [pendingHref, pathname, isPending, loadingCount, setPending]);

  const navigate = (href: string) => {
    if (pathname === href) return;
    setPending(href);
    startTransition(() => router.push(href));
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  if (esSoloPilates) {
    return (
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-brand px-4 py-3 flex justify-around items-center shadow-lg z-30">
        <NavItem icon={<Home size={24} />} onClick={() => navigate('/inicio')} label="Inicio" active={isActive('/inicio')} loading={pendingHref === '/inicio'} />
        <NavItem icon={<Bed size={24} />} onClick={() => navigate('/pilates')} label="Pilates" active={isActive('/pilates')} loading={pendingHref === '/pilates'} />
        <NavItem icon={<Accessibility size={24} />} onClick={() => navigate('/pacientes')} label="Pacientes" active={isActive('/pacientes')} loading={pendingHref === '/pacientes'} />
        <NavItem icon={<User size={24} />} onClick={() => navigate('/perfil')} label="Perfil" active={isActive('/perfil')} loading={pendingHref === '/perfil'} />
      </nav>
    );
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-brand px-4 py-3 flex justify-around items-center shadow-lg z-30">
      <NavItem icon={<Home size={24} />} onClick={() => navigate('/inicio')} label="Inicio" active={isActive('/inicio')} loading={pendingHref === '/inicio'} />
      {verPilates && (
        <NavItem icon={<Bed size={24} />} onClick={() => navigate('/pilates')} label="Pilates" active={isActive('/pilates')} loading={pendingHref === '/pilates'} />
      )}
      <AgregarBoton />
      {verCalendario && (
        <NavItem icon={<CalendarDays size={24} />} onClick={() => navigate('/calendario')} label="Calendario" active={isActive('/calendario')} loading={pendingHref === '/calendario'} />
      )}
      <NavItem icon={<User size={24} />} onClick={() => navigate('/perfil')} label="Perfil" active={isActive('/perfil')} loading={pendingHref === '/perfil'} />
    </nav>
  );
};

const NavItem = ({
  icon,
  label,
  onClick,
  active = false,
  loading = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  loading?: boolean;
}) => (
  <button
    className={cn(
      "flex flex-col items-center gap-1 min-w-0 rounded-md px-2 py-1 transition-colors duration-150",
      active
        ? "bg-white text-brand"
        : "text-white hover:bg-white/10",
    )}
    onClick={onClick}
    aria-current={active ? "page" : undefined}
  >
    {loading ? <Loader2 size={24} className="animate-spin" /> : icon}
    <span className="text-xs font-medium truncate">{label}</span>
  </button>
);

export default BarraCelular;
