import PerfilServidor from '@/componentes/perfil/perfil-server';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Mi Perfil - Fisiopasteur',
  description: 'Gestiona tu información personal y profesional',
};

export default function PerfilPage() {
  return <PerfilServidor />;
}