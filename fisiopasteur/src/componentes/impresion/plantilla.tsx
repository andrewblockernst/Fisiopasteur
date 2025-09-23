"use client";
import React from "react";


type PlantillaImpresionProps = {
  titulo: string;
  subtitulo?: string;
  textoPeriodo?: string;
  children: React.ReactNode;
  piePagina?: React.ReactNode;
};

export default function PlantillaImpresion({
  titulo,
  subtitulo,
  textoPeriodo,
  children,
  piePagina,
}: PlantillaImpresionProps) {
  return (
    <main className="mx-auto max-w-3xl bg-white text-black p-6">
      {/* Encabezado reutilizable */}
      <header className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[#9C1838] mb-2">FISIOPASTEUR</h1>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">{titulo}</h2>
        {subtitulo && <p className="text-gray-700">{subtitulo}</p>}
        {textoPeriodo && (
          <p className="text-gray-600 text-sm">{textoPeriodo}</p>
        )}
        <p className="text-gray-500 text-xs mt-2">
          Fecha de impresión: {new Date().toLocaleDateString("es-AR")}
        </p>
      </header>

      {/* Contenido específico del documento */}
      <div className="space-y-6">
        {children}
      </div>

      {/* Pie reutilizable */}
      <footer className="mt-12 text-center text-xs text-gray-500 border-t border-gray-200 pt-4">
        {piePagina ?? (
          <>
            <p>Este documento fue generado automáticamente por el sistema Fisiopasteur</p>
            <p>Para consultas: contacto@fisiopasteur.com</p>
          </>
        )}
      </footer>

      {/* Estilos globales de impresión */}
      <style jsx global>{`
        @media print {
          @page { 
            size: A4; 
            margin: 15mm; 
          }
          
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
          
          .no-imprimir { 
            display: none !important; 
          }

          /* AGREGAR ESTAS CLASES QUE USAS EN EL JSX */
          .evitar-corte { 
            break-inside: avoid-page; 
            page-break-inside: avoid; 
          }

          .superficie-impresion { 
            box-shadow: none !important; 
            border-color: #e5e7eb !important; 
          }

          /* Títulos no se cortan */
          h1, h2, h3 {
            break-after: avoid;
          }

          /* Asegurar colores correctos */
          h1, h2, h3, p, span, div {
            color: black !important;
          }

          h1 {
            color: #9C1838 !important;
          }
        }
      `}</style>
    </main>
  );
}