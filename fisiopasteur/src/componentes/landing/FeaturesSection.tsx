import React from 'react';

export default function FeaturesSection() {
  const features = [
    {
      icon: "📅",
      title: "Gestión Inteligente",
      description: "Organizá tus turnos de forma rápida y eficiente, evitando solapamientos."
    },
    {
      icon: "🚀",
      title: "Fácil de Usar",
      description: "Interfaz simple e intuitiva para que cualquier usuario la domine."
    },
    {
      icon: "💡",
      title: "Automatización Inteligente",
      description: "Bot de WhatsApp que envía recordatorios y confirmaciones automáticas."
    },
    {
      icon: "📊",
      title: "Reportes Detallados",
      description: "Estadísticas en tiempo real: ganancias, rendimiento y turnos."
    },
    {
      icon: "🔒",
      title: "Seguro y Confiable",
      description: "Tus datos protegidos con los más altos estándares de seguridad."
    },
    {
      icon: "📱",
      title: "Multiplataforma",
      description: "Accedé desde computadora o celular, en cualquier dispositivo."
    }
  ];

  return (
    <section id="features" className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            ¿Por qué elegir nuestro sistema?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Todo lo que necesitás para gestionar tus turnos de forma simple y automatizada.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-gray-50 p-6 rounded-xl hover:shadow-lg transition-all duration-300 hover:transform hover:scale-105"
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}