export default function Inicio() {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-4xl font-bold mb-4 text-black">Bienvenido a Fisiopasteur</h1>
        <p className="text-lg text-black">Inicio en proceso...</p>
        </div>
        
        // AGREGUE UNAS ESTADISTICAS RAPIDAS QUE PODEMOS IMPPLEMENTAR EN EL FUTURO 
    
        // {/* Estadísticas rápidas */}
        //       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        //         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        //           {/* Turnos de hoy */}
        //           <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        //             <div className="flex items-center gap-3 sm:gap-4">
        //               <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
        //                 <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
        //               </div>
        //               <div>
        //                 <p className="text-xs sm:text-sm text-gray-600">Turnos de hoy</p>
        //                 <p className="text-xl sm:text-2xl font-bold text-gray-900">{turnosHoy.length}</p>
        //               </div>
        //             </div>
        //           </div>
        
        //           {/* Próximos turnos */}
        //           <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        //             <div className="flex items-center gap-3 sm:gap-4">
        //               <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
        //                 <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
        //               </div>
        //               <div>
        //                 <p className="text-xs sm:text-sm text-gray-600">Próximos 7 días</p>
        //                 <p className="text-xl sm:text-2xl font-bold text-gray-900">{turnosProximos.length}</p>
        //               </div>
        //             </div>
        //           </div>
        
        //           {/* Total especialistas */}
        //           <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        //             <div className="flex items-center gap-3 sm:gap-4">
        //               <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
        //                 <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
        //               </div>
        //               <div>
        //                 <p className="text-xs sm:text-sm text-gray-600">Especialistas</p>
        //                 <p className="text-xl sm:text-2xl font-bold text-gray-900">{especialistas.length}</p>
        //               </div>
        //             </div>
        //           </div>
        //         </div>
    );
    }