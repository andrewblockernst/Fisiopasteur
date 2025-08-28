'use client'

import Button from "@/componentes/boton";

const horariosDisponibles = [
  '8:00', '9:00', '10:00', '11:00', 
  '14:30', '15:30', '16:30', '17:30', 
  '18:30', '19:30', '20:30', '21:30'
];

export default function PilatesPage() {
  const handleAgregarTurno = (horario: string) => {
    // Por ahora solo console.log, después abriremos el diálogo
    console.log(`Agregar turno a las ${horario}`);
  };

  return (
    <div className="min-h-screen text-black">
      {/* Header Mobile */}
      <div className="sm:hidden bg-white border-b border-gray-200">
        <div className="flex items-center px-4 py-3">
          {/* Botón de regreso */}
          <button className="mr-3 p-1">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {/* Título */}
          <h1 className="text-lg font-medium text-gray-900 flex-1 text-center mr-9">
            Pilates
          </h1>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="sm:container sm:mx-auto sm:p-4 sm:p-6 lg:pr-6 lg:pt-8">
        {/* Desktop Header */}
        <div className="hidden sm:flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold">
            Pilates
          </h2>
        </div>

        {/* Título Mobile */}
        <div className="sm:hidden px-4 py-4">
          <h2 className="text-xl font-bold">
            Horarios Disponibles
          </h2>
        </div>

        {/* Grid de Horarios */}
        <div className="px-4 sm:px-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {horariosDisponibles.map((horario) => (
              <div
                key={horario}
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-6"
              >
                {/* Horario */}
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {horario}
                  </div>
                  <div className="text-sm text-gray-500">
                    Disponible
                  </div>
                </div>

                {/* Botón Agregar Turno */}
                <div className="flex justify-center">
                  <Button
                    variant="secondary"
                    onClick={() => handleAgregarTurno(horario)}
                    className="w-full py-2.5 text-sm font-medium"
                  >
                    Agregar Turno
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}