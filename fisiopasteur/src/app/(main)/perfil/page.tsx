import PerfilServidor from '@/componentes/perfil/perfil-server';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mi Perfil - Fisiopasteur',
  description: 'Gestiona tu información personal y profesional',
};

export const revalidate = 0; // Renderizar dinámicamente en cada request

export default function PerfilPage() {
  return <PerfilServidor />;
}