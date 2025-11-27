'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function SuccessContent() {
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const TURNOS_APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  useEffect(() => {
    const paymentId = searchParams?.get('payment_id');
    console.log('✅ Pago completado. Payment ID:', paymentId);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = `${TURNOS_APP_URL}/login`;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [searchParams, TURNOS_APP_URL]);

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-4">
          <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold mb-2 text-gray-900">
          ¡Pago exitoso!
        </h2>
        
        <p className="text-gray-600 mb-4">
          Tu pago ha sido procesado correctamente.
        </p>

        <p className="text-gray-600 mb-6">
          Estamos creando tu cuenta y organización. 
          Redirigiendo a la plataforma de turnos...
        </p>

        <p className="text-sm text-gray-500">
          Redirigiendo en {countdown} segundos...
        </p>

        <button 
          onClick={() => window.location.href = `${TURNOS_APP_URL}/login`}
          className="mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Ir ahora
        </button>
      </div>
    </div>
  );
}
