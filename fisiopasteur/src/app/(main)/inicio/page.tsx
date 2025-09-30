import EstadisticasWhatsApp from '@/componentes/notificacion/estadisticas-whatsapp';
import { Calendar, Users, MessageSquare } from 'lucide-react';

export default function Inicio() {
    return (
        <div className="container mx-auto p-4 sm:p-6 lg:pr-6 lg:pt-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">
                    Bienvenido a Fisiopasteur
                </h1>
                <p className="text-gray-600">Panel de control y estadísticas del sistema</p>
            </div>

            {/* Grid de estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Estadísticas WhatsApp */}
                <div className="md:col-span-1">
                    <EstadisticasWhatsApp />
                </div>

                {/* Placeholder para otras estadísticas */}
                <div className="bg-white rounded-lg border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Calendar className="text-blue-600" size={20} />
                        <h3 className="font-semibold">Turnos Hoy</h3>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 mb-2">0</div>
                        <div className="text-sm text-gray-600">Próximamente</div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Users className="text-purple-600" size={20} />
                        <h3 className="font-semibold">Estadísticas</h3>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 mb-2">--</div>
                        <div className="text-sm text-gray-600">Próximamente</div>
                    </div>
                </div>
            </div>

            {/* Información de la integración */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                    <MessageSquare className="text-green-600 flex-shrink-0 mt-1" size={20} />
                    <div>
                        <h3 className="font-semibold text-green-800 mb-2">
                            🎉 Integración WhatsApp Bot Completa
                        </h3>
                        <div className="text-green-700 text-sm space-y-2">
                            <p>
                                ✅ El bot de WhatsApp está integrado y funcional. Cuando crees un turno con un paciente que tenga teléfono:
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Se envía confirmación automática por WhatsApp</li>
                                <li>Se programan recordatorios (24h y 2h antes)</li>
                                <li>Se registra todo en la base de datos</li>
                                <li>Puedes ver estadísticas en tiempo real</li>
                            </ul>
                            <p className="mt-3">
                                💡 <strong>Consejo:</strong> Revisa las estadísticas de WhatsApp arriba para monitorear el estado del bot y mensajes enviados.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}