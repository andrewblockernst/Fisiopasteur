/**
 * Componente de ejemplo para el formulario de onboarding
 * Tu compañero puede usar este código como referencia o adaptarlo a su diseño
 */

'use client';

import { useState, useEffect } from 'react';

interface OnboardingFormData {
  email: string;
  password: string;
  confirmPassword: string;
  nombre: string;
  apellido: string;
  telefono: string;
  nombreOrganizacion: string;
  plan: 'basic' | 'premium' | 'enterprise';
  paymentId?: string;
}

export default function OnboardingFormExample() {
  const [formData, setFormData] = useState<OnboardingFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    nombre: '',
    apellido: '',
    telefono: '',
    nombreOrganizacion: '',
    plan: 'basic',
    paymentId: undefined
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [success, setSuccess] = useState(false);

  // Debounce para verificar email mientras escribe
  useEffect(() => {
    if (!formData.email || !formData.email.includes('@')) {
      setEmailAvailable(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setEmailChecking(true);
      try {
        const response = await fetch(
          `/api/onboarding/check-email?email=${encodeURIComponent(formData.email)}`
        );
        const data = await response.json();
        setEmailAvailable(data.available);
      } catch (err) {
        console.error('Error verificando email:', err);
      } finally {
        setEmailChecking(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.email]);

  const validateForm = (): string | null => {
    if (!formData.email || !formData.email.includes('@')) {
      return 'Email inválido';
    }

    if (formData.password.length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Las contraseñas no coinciden';
    }

    if (!formData.nombre.trim() || !formData.apellido.trim()) {
      return 'Nombre y apellido son requeridos';
    }

    if (!formData.nombreOrganizacion.trim()) {
      return 'El nombre de la organización es requerido';
    }

    if (emailAvailable === false) {
      return 'Este email ya está registrado';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/onboarding/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          nombre: formData.nombre,
          apellido: formData.apellido,
          telefono: formData.telefono || undefined,
          nombreOrganizacion: formData.nombreOrganizacion,
          plan: formData.plan,
          paymentId: formData.paymentId
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        
        // Esperar 2 segundos antes de redirigir
        setTimeout(() => {
          window.location.href = data.data.redirectUrl;
        }, 2000);
      } else {
        setError(data.error || 'Error al registrar. Intenta nuevamente.');
      }
    } catch (err) {
      console.error('Error en registro:', err);
      setError('Error de conexión. Verifica tu internet e intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto p-6 bg-green-50 border border-green-200 rounded-lg">
        <h2 className="text-2xl font-bold text-green-800 mb-4">
          ✅ ¡Registro Exitoso!
        </h2>
        <p className="text-green-700">
          Tu cuenta ha sido creada correctamente. Redirigiendo al panel de control...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Crear tu cuenta
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="tu@email.com"
          />
          {emailChecking && (
            <p className="text-sm text-gray-500 mt-1">Verificando...</p>
          )}
          {emailAvailable === false && (
            <p className="text-sm text-red-600 mt-1">❌ Este email ya está registrado</p>
          )}
          {emailAvailable === true && (
            <p className="text-sm text-green-600 mt-1">✅ Email disponible</p>
          )}
        </div>

        {/* Contraseña */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña *
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        {/* Confirmar Contraseña */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmar Contraseña *
          </label>
          <input
            type="password"
            required
            value={formData.confirmPassword}
            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Repite tu contraseña"
          />
          {formData.confirmPassword && formData.password !== formData.confirmPassword && (
            <p className="text-sm text-red-600 mt-1">❌ Las contraseñas no coinciden</p>
          )}
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre *
          </label>
          <input
            type="text"
            required
            value={formData.nombre}
            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tu nombre"
          />
        </div>

        {/* Apellido */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Apellido *
          </label>
          <input
            type="text"
            required
            value={formData.apellido}
            onChange={(e) => setFormData({...formData, apellido: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tu apellido"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono
          </label>
          <input
            type="tel"
            value={formData.telefono}
            onChange={(e) => setFormData({...formData, telefono: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+54 9 11 1234-5678"
          />
        </div>

        {/* Nombre Organización */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre de tu Organización *
          </label>
          <input
            type="text"
            required
            value={formData.nombreOrganizacion}
            onChange={(e) => setFormData({...formData, nombreOrganizacion: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej: Clínica Salud Integral"
          />
        </div>

        {/* Plan */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Plan *
          </label>
          <select
            value={formData.plan}
            onChange={(e) => setFormData({...formData, plan: e.target.value as any})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="basic">Básico - $19/mes</option>
            <option value="premium">Premium - $49/mes</option>
            <option value="enterprise">Enterprise - $99/mes</option>
          </select>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || emailAvailable === false || emailChecking}
          className="w-full bg-blue-600 text-white py-3 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creando cuenta...
            </span>
          ) : (
            'Crear Cuenta'
          )}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600 text-center">
        ¿Ya tienes cuenta?{' '}
        <a href="/login" className="text-blue-600 hover:underline">
          Inicia sesión
        </a>
      </p>
    </div>
  );
}
