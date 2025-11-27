'use client';

import React, { useState, useEffect } from 'react';
import RegisterModal from './RegisterModal';

// Declarar tipos globales para Mercado Pago
declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface PaymentButtonProps {
  planType: string;
  planTitle: string;
  planPrice: number;
}

const PaymentButton: React.FC<PaymentButtonProps> = ({ planType, planTitle, planPrice }) => {
  const [loading, setLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string>("");
  const [userData, setUserData] = useState<any>(null);

  // Cargar SDK de Mercado Pago
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Renderizar botón de pago cuando tenemos preferenceId
  useEffect(() => {
    if (preferenceId && typeof window !== 'undefined' && window.MercadoPago) {
      const mp = new window.MercadoPago(process.env.NEXT_PUBLIC_MP_PUBLIC_KEY, {
        locale: 'es-AR'
      });

      mp.checkout({
        preference: {
          id: preferenceId
        },
        render: {
          container: '#wallet_container',
          label: 'Pagar con Mercado Pago',
        }
      });
    }
  }, [preferenceId]);

  const handleRegisterComplete = async (formData: any) => {
    setShowRegisterModal(false);
    setUserData(formData);
    setLoading(true);
    
    try {
      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_type: planType,
          userData: formData
        }),
      });

      const data = await response.json();
      
      if (data.id) {
        setPreferenceId(data.id);
      } else {
        alert('Error al crear la preferencia de pago');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!preferenceId && (
        <button
          onClick={() => setShowRegisterModal(true)}
          disabled={loading}
          className={`
            w-full px-8 py-4 rounded-lg font-bold text-white text-lg
            transition-all duration-300 transform hover:scale-105
            ${loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
            }
          `}
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Procesando...</span>
            </div>
          ) : (
            `Comprar ${planTitle}`
          )}
        </button>
      )}

      {preferenceId && (
        <div id="wallet_container" className="w-full"></div>
      )}

      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        planType={planType}
        planTitle={planTitle}
        planPrice={planPrice}
        onRegisterComplete={handleRegisterComplete}
      />
    </>
  );
};

export default PaymentButton;