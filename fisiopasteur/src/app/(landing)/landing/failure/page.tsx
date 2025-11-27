'use client';

export default function FailurePage() {
  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-4">
          <svg className="mx-auto h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pago fallido</h2>
        <p className="text-gray-600 mb-6">Hubo un problema procesando tu pago.</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Intentar nuevamente
        </button>
      </div>
    </div>
  );
}