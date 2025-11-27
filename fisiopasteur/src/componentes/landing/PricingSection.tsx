'use client';

import PaymentButton from './PaymentButton';

const PricingSection: React.FC = () => {
  const plans = [
    {
      type: 'basic',
      title: 'Plan Básico',
      price: 10,
      features: [
        'Hasta 50 turnos/mes',
        'Gestión de clientes',
        'Calendario básico',
        'Soporte por email'
      ]
    },
    {
      type: 'premium',
      title: 'Plan Premium',
      price: 5000,
      features: [
        'Turnos ilimitados',
        'Bot de WhatsApp',
        'Reportes avanzados',
        'Soporte prioritario'
      ],
      popular: true
    },
    {
      type: 'enterprise',
      title: 'Plan Enterprise',
      price: 100000,
      features: [
        'Múltiples sucursales',
        'API personalizada',
        'Integración avanzada',
        'Soporte 24/7'
      ]
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Planes y Precios
          </h2>
          <p className="text-xl text-gray-600">
            Elegí el plan que mejor se adapte a tus necesidades
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`bg-white rounded-2xl shadow-lg p-8 ${
                plan.popular ? 'ring-2 ring-blue-600 transform scale-105' : ''
              }`}
            >
              {plan.popular && (
                <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                  Más Popular
                </span>
              )}
              
              <h3 className="text-2xl font-bold text-gray-900 mt-4">
                {plan.title}
              </h3>
              
              <div className="mt-4 mb-6">
                <span className="text-4xl font-bold text-gray-900">
                  ${plan.price.toLocaleString()}
                </span>
                <span className="text-gray-600">/mes</span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <PaymentButton
                planType={plan.type}
                planTitle={plan.title}
                planPrice={plan.price}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;