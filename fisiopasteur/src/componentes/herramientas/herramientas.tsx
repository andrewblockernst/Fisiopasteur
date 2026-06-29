'use client';

import {
  Home,
  ClipboardList,
  CalendarDays,
  Accessibility,
  FileBadge,
  User,
  HelpCircle,
  Bed,
  LogOut,
  Loader2,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useTransition } from 'react';
import { cerrarSesionServer } from '@/lib/actions/logOut.action';
import { usePerfilNav } from '@/hooks/PerfilNavContext';
import { useNavigationLoadingStore } from '@/stores/navigation-loading';
import { cn } from '@/lib/utils';

const Herramientas = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { tienePilates, tieneEspecialidadNoPilates, puedeGestionar } = usePerfilNav();
  const verTurnos    = puedeGestionar || tieneEspecialidadNoPilates;
  const verPilates   = puedeGestionar || tienePilates;
  const verCalendario = verTurnos;

  const [isPending, startTransition] = useTransition();
  const pendingHref = useNavigationLoadingStore((s) => s.pendingHref);
  const loadingCount = useNavigationLoadingStore((s) => s.loadingCount);
  const setPending = useNavigationLoadingStore((s) => s.setPending);

  // Limpiar el spinner cuando: el path ya coincide, no hay transición pendiente
  // y ninguna página está cargando datos.
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

  const onCerrarSesion = async () => {
    try {
      await cerrarSesionServer();
      window.location.href = '/login';
    } catch (error) {
      console.error('❌ Error en onCerrarSesion:', error);
      window.location.href = '/login';
    }
  }

  return (
    <aside className="hidden lg:flex fixed top-1/2 left-0 -translate-y-1/2 bg-brand py-6 px-1 flex-col items-center gap-3 shadow-lg rounded-r-lg z-50">
      <IconWrapper label="Inicio" icon={<Home size={28} />} onClick={() => navigate('/inicio')} active={isActive('/inicio')} loading={pendingHref === '/inicio'} />
      {verTurnos && <IconWrapper label="Turnos" icon={<ClipboardList size={28} />} onClick={() => navigate('/turnos')} active={isActive('/turnos')} loading={pendingHref === '/turnos'} />}
      {verPilates && <IconWrapper label="Pilates" icon={<Bed size={28} />} onClick={() => navigate('/pilates')} active={isActive('/pilates')} loading={pendingHref === '/pilates'} />}
      {verCalendario && <IconWrapper label="Calendario" icon={<CalendarDays size={28} />} onClick={() => navigate('/calendario')} active={isActive('/calendario')} loading={pendingHref === '/calendario'} />}
      <IconWrapper label="Pacientes" icon={<Accessibility size={28} />} onClick={() => navigate('/pacientes')} active={isActive('/pacientes')} loading={pendingHref === '/pacientes'} />
      <IconWrapper label="Especialistas" icon={<FileBadge size={28} />} onClick={() => navigate('/especialistas')} active={isActive('/especialistas')} loading={pendingHref === '/especialistas'} />
      <IconWrapper label="Perfil" icon={<User size={28} />} onClick={() => navigate('/perfil')} active={isActive('/perfil')} loading={pendingHref === '/perfil'} />
      <IconWrapper label="Ayuda" icon={<HelpCircle size={28} />} onClick={() => navigate('/centro-de-ayuda')} active={isActive('/centro-de-ayuda')} loading={pendingHref === '/centro-de-ayuda'} />
      <IconWrapper label="Cerrar Sesión" icon={<LogOut size={28} />} onClick={onCerrarSesion} />
    </aside>
  );
};

const IconWrapper = ({
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
      "relative group rounded-md p-1.5 transition-colors duration-150",
      active
        ? "bg-white text-brand"
        : "text-white hover:bg-white/10",
    )}
    onClick={onClick}
    aria-label={label}
    aria-current={active ? "page" : undefined}
  >
    {loading ? <Loader2 size={28} className="animate-spin" /> : icon}
    <span
      className="absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap bg-brand text-white px-3 py-1 rounded-md shadow opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ease-out pointer-events-none"
    >
      {label}
    </span>
  </button>
);

export default Herramientas;
