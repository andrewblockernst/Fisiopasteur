'use client';

export default function HeroSection() {
  return (
    <section id="hero" className="pt-32 pb-12 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            Sistema de <span className="text-blue-600">Gestión</span> de Turnos
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-8">
            Simplificá la administración de tu negocio con una webApp completa para gestionar turnos, clientes y automatizar recordatorios. 
            Contá con perfiles personalizados, historial de atenciones, estadísticas, calendario interactivo y un bot de WhatsApp que se encarga de avisos y confirmaciones.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Ver Planes
            </button>
            <button 
              onClick={() => document.getElementById('functionalities')?.scrollIntoView({ behavior: 'smooth' })}
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300"
            >
              Conocer Más
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
