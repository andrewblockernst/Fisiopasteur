export default function FunctionalitiesSection() {
  const functionalities = [
    {
      icon: "👤",
      title: "Gestión de Clientes",
      description: "Alta, edición y búsqueda rápida. Historial completo."
    },
    {
      icon: "🩺",
      title: "Gestión de Empleados",
      description: "Administrá perfiles, horarios y especialidades."
    },
    {
      icon: "📅",
      title: "Agenda de Turnos",
      description: "Asigná, reprogramá o cancelá turnos. Vista por día, semana o mes."
    },
    {
      icon: "🤖",
      title: "Recordatorios",
      description: "Envío automático por WhatsApp para reducir ausencias."
    },
    {
      icon: "📈",
      title: "Reportes",
      description: "Métricas clave: turnos, clientes, rendimiento y ganancias."
    },
    {
      icon: "🔑",
      title: "Acceso Flexible",
      description: "Permisos por rol. Disponible en PC y móvil."
    }
  ];

  return (
    <section id="functionalities" className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Funcionalidades del sistema
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Todo lo que necesitás para administrar tu consultorio de manera profesional.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {functionalities.map((f, i) => (
            <div key={i} className="bg-gray-50 p-6 rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}