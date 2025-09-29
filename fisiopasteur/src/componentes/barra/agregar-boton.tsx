'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  X,
  Calendar,
  User,
  Users,
  ClipboardList,
  Accessibility,
  CalendarDays
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { NuevoTurnoModal } from '../calendario/nuevo-turno-dialog';

interface MenuOption {
  icon: React.ReactNode;
  label: string;
  route: string;
}

const AgregarBoton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNuevoTurnoModal, setShowNuevoTurnoModal] = useState(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);

  const menuOptions: MenuOption[] = [
    {
      icon: <CalendarDays size={28} />,
      label: 'Turnos',
      route: '/turnos' // Identificador especial para abrir modal
    },
    {
      icon: <Accessibility size={28} />,
      label: 'Pacientes',
      route: '/pacientes?nuevo=true'
    },
    {
      icon: <ClipboardList size={28} />,
      label: 'Especialistas',
      route: '/especialistas?nuevo=true'
    }
  ];  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (option: MenuOption) => {
    setIsOpen(false);
    
    if (option.route === 'turno-modal') {
      setShowNuevoTurnoModal(true);
    } else if (option.route) {
      router.push(option.route);
    }
  };

  const handleTurnoCreated = () => {
    setShowNuevoTurnoModal(false);
    // Recargar la página para mostrar los nuevos turnos
    router.refresh();
  };

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      {/* Menú desplegable */}
      <div
        className={`absolute bottom-20 left-1/2 bg-white rounded-xl shadow-2xl border border-gray-200 py-4 min-w-[200px] z-50 transition-all duration-300
          ${isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 translate-y-8 pointer-events-none'}`}
        style={{
          transitionProperty: 'opacity, transform',
          transform: isOpen
            ? 'translate(-50%, 0) scale(1)'
            : 'translate(-50%, 2rem) scale(0.95)',
        }}
      >
        {/* Flecha hacia abajo */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-gray-200 rotate-45"></div>
        {menuOptions.map((option, index) => (
          <button
            key={index}
            onClick={() => handleOptionClick(option)}
            className="w-full px-6 py-4 flex items-center gap-5 text-gray-700 hover:bg-gray-50 transition-colors duration-200 text-left text-lg rounded-lg"
          >
            <span className="text-[#9C1838]">{option.icon}</span>
            <span className="font-bold text-lg">{option.label}</span>
          </button>
        ))}
      </div>

      {/* Botón principal */}
      <button 
        className="text-white hover:scale-105 transition-all duration-200 flex flex-col items-center gap-1 min-w-0 relative"
        onClick={toggleMenu}
      >
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>
          {isOpen ? <X size={24} /> : <Plus size={24} />}
        </div>
        <span className="text-xs font-medium truncate">Agregar</span>
      </button>

      {/* Modal de Nuevo Turno */}
      <NuevoTurnoModal
        isOpen={showNuevoTurnoModal}
        onClose={() => setShowNuevoTurnoModal(false)}
        onTurnoCreated={handleTurnoCreated}
      />
    </div>
  );
};

export default AgregarBoton;
