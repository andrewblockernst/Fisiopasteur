"use client";

import { useState } from "react";
import { 
  MessageSquare, 
  BookOpen, 
  Users, 
  User,
  Plus, 
  Edit, 
  Trash2,
  Search,
  Calendar,
  CalendarDays,
  CircleDollarSign,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import React from "react";

type TabType = 'manual' | 'contact';
type AccordionItem =
  | 'gestion-especialistas'
  | 'gestion-pacientes'
  | 'turnos-calendario'
  | 'perfil-precios'
  | 'navegacion'
  | 'proximas-funciones'
  | null;

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState<TabType>('manual');
  const [openAccordion, setOpenAccordion] = useState<AccordionItem>(null); // ✅ Cambio aquí
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    success?: boolean;
    message?: string;
  }>({});

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({});

    try {
      // Simular envío de formulario
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });

      setSubmitStatus({
        success: true,
        message: "¡Mensaje enviado con éxito! Te responderemos a la brevedad.",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setSubmitStatus({
        success: false,
        message: "Ocurrió un error al enviar el mensaje. Por favor intenta nuevamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAccordion = (item: AccordionItem) => {
    setOpenAccordion(openAccordion === item ? null : item);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:pr-6 lg:pt-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Centro de Ayuda</h1>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row gap-2 mb-8">
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'manual'
              ? 'bg-[#9C1838] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <BookOpen size={20} />
          Manual de Usuario
        </button>
        {/* <button
          onClick={() => setActiveTab('contact')}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'contact'
              ? 'bg-[#9C1838] text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <MessageSquare size={20} />
          Contactar Soporte
        </button> */}
      </div>

      {/* Manual de Usuario */}
      {activeTab === 'manual' && (
        <div className="space-y-6">
          {/* Introducción */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-2xl font-bold mb-2 text-[#9C1838]">
              ¡Hola de nuevo!
            </h2>
            <p className="text-gray-600">
              Este manual te ayudará a aprovechar al máximo nuestro sistema de Fisiopasteur. 
              Haz click en cada sección para ver las guías paso a paso.
            </p>
            {/* <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
              <p className="text-blue-800">
                💡 <strong>Consejo:</strong> Utiliza la navegación lateral (desktop) o inferior (mobile) 
                para moverte entre las diferentes secciones del sistema.
              </p>
            </div> */}
          </div>

          {/* Acordeón de Funciones */}
          <div className="space-y-4">
            
            {/* Gestión de Especialistas */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleAccordion('gestion-especialistas')}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="text-[#9C1838]" size={24} />
                  <h3 className="text-xl font-bold">Gestión de Especialistas</h3>
                </div>
                {openAccordion === 'gestion-especialistas' ? (
                  <ChevronUp className="text-gray-500" size={20} />
                ) : (
                  <ChevronDown className="text-gray-500" size={20} />
                )}
              </button>
              
              {openAccordion === 'gestion-especialistas' && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="space-y-6">
                    {/* Agregar Especialista */}
                    <div className="border-l-4 border-green-400 pl-4">
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <Plus size={16} className="text-green-600" />
                        Agregar Nuevo Especialista
                      </h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-600">
                        <li>Ve a la sección <strong>"Especialistas"</strong> desde el menú de navegación</li>
                        <li>Haz clic en el botón <strong>"Nuevo Especialista"</strong> (color verde)</li>
                        <li>Se abrirá un formulario donde debes completar:
                          <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                            <li><strong>Nombre:</strong> Nombre del especialista</li>
                            <li><strong>Apellido:</strong> Apellido del especialista</li>
                            <li><strong>Email:</strong> Debe ser único en el sistema</li>
                            <li><strong>Usuario:</strong> Sin espacios ni caracteres especiales</li>
                            <li><strong>Teléfono:</strong> Número de contacto</li>
                            <li><strong>Color:</strong> Color identificativo para el calendario</li>
                          </ul>
                        </li>
                        <li>Selecciona las <strong>especialidades</strong> que corresponden al profesional</li>
                        <li>Haz clic en <strong>"Crear Especialista"</strong> para guardar</li>
                      </ol>
                      <div className="bg-green-50 p-3 rounded mt-3">
                        <p className="text-green-700 text-sm">
                          <strong>Consejo:</strong> El color elegido ayudará a identificar rápidamente al especialista en futuras funciones como el calendario.
                        </p>
                      </div>
                    </div>

                    {/* Editar Especialista */}
                    <div className="border-l-4 border-blue-400 pl-4">
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <Edit size={16} className="text-blue-600" />
                        Editar Especialista Existente
                      </h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-600">
                        <li>Localiza al especialista en la lista (puedes usar la vista de tabla en desktop o tarjetas en celular)</li>
                        <li>Haz clic en el botón <strong>"Editar"</strong> (color azul) en la fila correspondiente</li>
                        <li>Se abrirá el mismo formulario con los datos actuales pre-cargados</li>
                        <li>Modifica únicamente la información que necesitas cambiar</li>
                        <li>Haz clic en <strong>"Actualizar Especialista"</strong> para guardar los cambios</li>
                      </ol>
                      <div className="bg-blue-50 p-3 rounded mt-3">
                        <p className="text-blue-700 text-sm">
                          <strong>Nota:</strong> Los cambios se aplicarán inmediatamente y la lista se actualizará automáticamente.
                        </p>
                      </div>
                    </div>

                    {/* Eliminar Especialista */}
                    <div className="border-l-4 border-red-400 pl-4">
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <Trash2 size={16} className="text-red-600" />
                        Eliminar Especialista
                      </h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-600">
                        <li>Localiza al especialista que deseas eliminar en la lista</li>
                        <li>Haz clic en el botón <strong>"Eliminar"</strong> (color rojo)</li>
                        <li>Aparecerá un diálogo de confirmación con el nombre del especialista</li>
                        <li>Lee cuidadosamente la advertencia</li>
                        <li>Haz clic en <strong>"Eliminar"</strong> para confirmar o <strong>"Cancelar"</strong> para abortar</li>
                      </ol>
                      <div className="bg-red-50 p-3 rounded mt-3">
                        <p className="text-red-700 text-sm">
                          ⚠️ <strong>¡CUIDADO!</strong> Esta acción no se puede deshacer. Se eliminará toda la información asociada al especialista, incluyendo historial futuro de citas y tratamientos.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Gestión de Pacientes */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleAccordion('gestion-pacientes')}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <User className="text-[#9C1838]" size={24} />
                  <h3 className="text-xl font-bold">Gestión de Pacientes</h3>
                </div>
                {openAccordion === 'gestion-pacientes' ? (
                  <ChevronUp className="text-gray-500" size={20} />
                ) : (
                  <ChevronDown className="text-gray-500" size={20} />
                )}
              </button>

              {openAccordion === 'gestion-pacientes' && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="space-y-6">
                    {/* Agregar Paciente */}
                    <div className="border-l-4 border-green-400 pl-4">
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <Plus size={16} className="text-green-600" />
                        Agregar Nuevo Paciente
                      </h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-600">
                        <li>Ve a la sección <strong>"Pacientes"</strong> desde el menú</li>
                        <li>Haz clic en <strong>"Nuevo Paciente"</strong></li>
                        <li>Completa los campos requeridos:
                          <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                            <li><strong>Nombre</strong> y <strong>Apellido</strong> (requeridos)</li>
                            <li><strong>DNI</strong> (requerido y único)</li>
                            <li><strong>Email</strong>, <strong>Teléfono</strong>, <strong>Fecha de nacimiento</strong> y <strong>Dirección</strong> (opcionales)</li>
                          </ul>
                        </li>
                        <li>Presiona <strong>"Crear"</strong> para guardar</li>
                      </ol>
                      <div className="bg-green-50 p-3 rounded mt-3">
                        <p className="text-green-700 text-sm">
                          El sistema valida formato de email, fecha de nacimiento y unicidad de DNI/Email.
                        </p>
                      </div>
                    </div>

                    {/* Editar Paciente */}
                    <div className="border-l-4 border-blue-400 pl-4">
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <Edit size={16} className="text-blue-600" />
                        Editar Paciente
                      </h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-600">
                        <li>En el listado de pacientes, localiza la fila o tarjeta</li>
                        <li>Haz clic en <strong>"Editar"</strong></li>
                        <li>Modifica los datos necesarios y confirma con <strong>"Guardar"</strong></li>
                      </ol>
                      <div className="bg-blue-50 p-3 rounded mt-3">
                        <p className="text-blue-700 text-sm">
                          Se verifica nuevamente la unicidad de DNI/Email si fueron cambiados.
                        </p>
                      </div>
                    </div>

                    {/* Desactivar/Eliminar Paciente */}
                    <div className="border-l-4 border-red-400 pl-4">
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <Trash2 size={16} className="text-red-600" />
                        Desactivar o Eliminar Paciente
                      </h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-600">
                        <li>En la tarjeta/fila del paciente, clic en <strong>"Eliminar"</strong></li>
                        <li>Confirma la acción en el diálogo</li>
                      </ol>
                      <div className="bg-red-50 p-3 rounded mt-3">
                        <p className="text-red-700 text-sm">
                         Si el paciente tiene turnos asociados no se puede eliminar. En ese caso se desactiva (estado inactivo).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Turnos y Calendario */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleAccordion('turnos-calendario')}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CalendarDays className="text-[#9C1838]" size={24} />
                  <h3 className="text-xl font-bold">Turnos y Calendario</h3>
                </div>
                {openAccordion === 'turnos-calendario' ? (
                  <ChevronUp className="text-gray-500" size={20} />
                ) : (
                  <ChevronDown className="text-gray-500" size={20} />
                )}
              </button>

              {openAccordion === 'turnos-calendario' && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="space-y-6">
                    {/* Crear Turno */}
                    <div className="border-l-4 border-green-400 pl-4">
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <Plus size={16} className="text-green-600" />
                        Crear un Nuevo Turno
                      </h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-600">
                        <li>Ir a <strong>"Turnos"</strong> o abrir el <strong>Calendario</strong></li>
                        <li>Elegir <strong>Paciente</strong>, <strong>Especialista</strong> y <strong>Especialidad</strong></li>
                        <li>Seleccionar <strong>Fecha</strong> y <strong>Hora</strong>; opcional <strong>Box</strong> y <strong>Observaciones</strong></li>
                        <li>Confirmar con <strong>"Crear"</strong></li>
                      </ol>
                      <div className="bg-green-50 p-3 rounded mt-3">
                        <p className="text-green-700 text-sm">
                          El sistema verifica disponibilidad del especialista y box. Si hay conflicto, mostrará un error y no permitirá crear el turno.
                        </p>
                      </div>
                    </div>

                    {/* Editar Turno */}
                    <div className="border-l-4 border-blue-400 pl-4">
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <Edit size={16} className="text-blue-600" />
                        Editar un Turno
                      </h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-600">
                        <li>Desde el listado o calendario, abrir el turno</li>
                        <li>Clic en <strong>"Editar"</strong>, modificar datos necesarios</li>
                        <li>Al cambiar fecha/hora/especialista/box se vuelve a <strong>verificar disponibilidad</strong></li>
                        <li>Guardar para aplicar los cambios</li>
                      </ol>
                      <div className="bg-blue-50 p-3 rounded mt-3">
                        <p className="text-blue-700 text-sm">
                          Los cambios actualizan la agenda y se reflejan en la vista del día y listados.
                        </p>
                      </div>
                    </div>

                    {/* Cancelar / Atendido */}
                    <div className="border-l-4 border-yellow-400 pl-4">
                      <h4 className="font-semibold mb-3">Cancelar y Marcar como Atendido</h4>
                      <ul className="list-disc list-inside ml-2 space-y-2 text-gray-600">
                        <li><strong>Cancelar:</strong> disponible para turnos <em>programados</em> y <em>futuros</em>.</li>
                        <li><strong>Atendido:</strong> aparece para turnos <em>programados</em> que ya pasaron.</li>
                        <li><strong>Eliminar:</strong> elimina definitivamente el turno (acción irreversible).</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Perfil y Precios */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleAccordion('perfil-precios')}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CircleDollarSign className="text-[#9C1838]" size={24} />
                  <h3 className="text-xl font-bold">Perfil y Precios</h3>
                </div>
                {openAccordion === 'perfil-precios' ? (
                  <ChevronUp className="text-gray-500" size={20} />
                ) : (
                  <ChevronDown className="text-gray-500" size={20} />
                )}
              </button>

              {openAccordion === 'perfil-precios' && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="space-y-6">
                    {/* Editar Perfil */}
                    <div className="border-l-4 border-blue-400 pl-4">
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <Edit size={16} className="text-blue-600" />
                        Editar Datos del Perfil
                      </h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-600">
                        <li>Ir a <strong>"Perfil"</strong></li>
                        <li>Clic en <strong>"Editar Perfil"</strong></li>
                        <li>Actualizar <strong>Nombre</strong>, <strong>Apellido</strong>, <strong>Teléfono</strong> y <strong>Color</strong></li>
                        <li>Guardar cambios</li>
                      </ol>
                    </div>

                    {/* Precios por Especialidad */}
                    <div className="border-l-4 border-green-400 pl-4">
                      <h4 className="font-semibold flex items-center gap-2 mb-3">
                        <CircleDollarSign size={16} className="text-green-600" />
                        Configurar Precios por Consulta
                      </h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-600">
                        <li>En la sección <strong>"Precios"</strong>, expandir una especialidad</li>
                        <li>Elegir <strong>Plan</strong>: <em>Particular</em> u <em>Obra Social</em></li>
                        <li>Ingresar el <strong>monto</strong> correspondiente</li>
                        <li>Presionar <strong>"Guardar"</strong></li>
                      </ol>
                      <div className="bg-green-50 p-3 rounded mt-3">
                        <p className="text-green-700 text-sm">
                          Los precios se guardan por especialidad y plan, y se utilizan al gestionar turnos y presupuestos.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navegación del Sistema */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleAccordion('navegacion')}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Search className="text-[#9C1838]" size={24} />
                  <h3 className="text-xl font-bold">Navegación del Sistema</h3>
                </div>
                {openAccordion === 'navegacion' ? (
                  <ChevronUp className="text-gray-500" size={20} />
                ) : (
                  <ChevronDown className="text-gray-500" size={20} />
                )}
              </button>
              
              {openAccordion === 'navegacion' && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">Pantalla grande (PC, laptop.)</h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-3 h-3 bg-[#9C1838] rounded-full mt-1"></div>
                          <div>
                            <p className="font-medium">Toolbar Lateral</p>
                            <p className="text-gray-600 text-sm">Barra fija en el lado izquierdo con iconos principales</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-3 h-3 bg-[#9C1838] rounded-full mt-1"></div>
                          <div>
                            <p className="font-medium">Logo Superior</p>
                            <p className="text-gray-600 text-sm">Logo de Fisiopasteur en la esquina superior izquierda</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-3 h-3 bg-[#9C1838] rounded-full mt-1"></div>
                          <div>
                            <p className="font-medium">Vista de Tabla</p>
                            <p className="text-gray-600 text-sm">Listas mostradas en formato de tabla completa</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg">Pantalla chica (celular, tablet, etc.)</h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-3 h-3 bg-[#9C1838] rounded-full mt-1"></div>
                          <div>
                            <p className="font-medium">Barra de herramientas inferior</p>
                            <p className="text-gray-600 text-sm">Barra de navegación en la parte inferior con iconos y etiquetas</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-3 h-3 bg-[#9C1838] rounded-full mt-1"></div>
                          <div>
                            <p className="font-medium">Vista de Tarjetas</p>
                            <p className="text-gray-600 text-sm">Listas mostradas como tarjetas individuales</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-3 h-3 bg-[#9C1838] rounded-full mt-1"></div>
                          <div>
                            <p className="font-medium">Pop-Ups Táctiles</p>
                            <p className="text-gray-600 text-sm">Formularios optimizados para pantalla táctil</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Próximas Funciones */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleAccordion('proximas-funciones')}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="text-[#9C1838]" size={24} />
                  <h3 className="text-xl font-bold">Próximas Funciones</h3>
                </div>
                {openAccordion === 'proximas-funciones' ? (
                  <ChevronUp className="text-gray-500" size={20} />
                ) : (
                  <ChevronDown className="text-gray-500" size={20} />
                )}
              </button>
              
              {openAccordion === 'proximas-funciones' && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                    <p className="text-yellow-800 mb-4 font-medium">
                      <strong>En desarrollo activo:</strong> Estas funciones estarán disponibles próximamente:
                    </p>
                    
                    <div className="space-y-4">
                      <div className="border border-yellow-200 rounded p-3 bg-white">
                        <h5 className="font-semibold text-yellow-800 mb-2">Historiales Médicos</h5>
                        <p className="text-yellow-700 text-sm">Registro detallado de tratamientos, evolución de pacientes y notas médicas.</p>
                      </div>
                      
                      <div className="border border-yellow-200 rounded p-3 bg-white">
                        <h5 className="font-semibold text-yellow-800 mb-2">Reportes y Estadísticas</h5>
                        <p className="text-yellow-700 text-sm">Generación de reportes, estadísticas de atención y métricas de rendimiento.</p>
                      </div>
                      
                      <div className="border border-yellow-200 rounded p-3 bg-white">
                        <h5 className="font-semibold text-yellow-800 mb-2">Configuración Avanzada</h5>
                        <p className="text-yellow-700 text-sm">Panel de configuración para personalizar el sistema, notificaciones y preferencias.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
