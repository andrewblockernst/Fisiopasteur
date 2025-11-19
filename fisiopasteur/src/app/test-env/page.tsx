/**
 * 🧪 Página de Prueba de Ambiente
 * 
 * Accede a: http://localhost:3000/test-env
 * Para ver a qué base de datos estás conectado
 */

export default function TestEnvPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'No configurado';
  const isDevelopment = supabaseUrl.includes('gtrkgzkxxsxaxafxsvcw');
  const isProduction = supabaseUrl.includes('qasrvhpdcerymjtvcfed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          🧪 Verificación de Ambiente
        </h1>

        <div className="space-y-4">
          {/* Estado del Ambiente */}
          <div className={`p-4 rounded-lg border-2 ${
            isDevelopment 
              ? 'bg-green-50 border-green-500' 
              : isProduction 
              ? 'bg-red-50 border-red-500'
              : 'bg-yellow-50 border-yellow-500'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">
                {isDevelopment ? '🟢' : isProduction ? '🔴' : '⚠️'}
              </span>
              <h2 className="text-xl font-bold">
                {isDevelopment 
                  ? 'DESARROLLO' 
                  : isProduction 
                  ? 'PRODUCCIÓN'
                  : 'DESCONOCIDO'}
              </h2>
            </div>
            <p className="text-sm text-gray-600">
              {isDevelopment && 'Puedes probar todo sin afectar datos reales ✅'}
              {isProduction && '¡CUIDADO! Estás modificando datos reales ⚠️'}
              {!isDevelopment && !isProduction && 'Configuración no reconocida'}
            </p>
          </div>

          {/* URL de Supabase */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">
              📡 Supabase URL:
            </h3>
            <code className="block p-2 bg-gray-800 text-green-400 rounded text-sm overflow-x-auto">
              {supabaseUrl}
            </code>
          </div>

          {/* Project ID */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">
              🆔 Project ID:
            </h3>
            <code className="block p-2 bg-gray-800 text-green-400 rounded text-sm">
              {isDevelopment && 'gtrkgzkxxsxaxafxsvcw'}
              {isProduction && 'qasrvhpdcerymjtvcfed'}
              {!isDevelopment && !isProduction && 'Desconocido'}
            </code>
          </div>

          {/* NODE_ENV */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">
              ⚙️ NODE_ENV:
            </h3>
            <code className="block p-2 bg-gray-800 text-green-400 rounded text-sm">
              {process.env.NODE_ENV}
            </code>
          </div>

          {/* Instrucciones */}
          <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500">
            <h3 className="font-bold text-blue-800 mb-2">
              💡 ¿Cómo cambiar de ambiente?
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                <strong>Desarrollo:</strong> <code>npm run dev</code> (usa .env.local)
              </li>
              <li>
                <strong>Producción:</strong> Deploy en Vercel (usa variables de Vercel)
              </li>
            </ul>
          </div>

          {/* Botón de regreso */}
          <div className="mt-6 text-center">
            <a 
              href="/"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              ← Volver al Inicio
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
