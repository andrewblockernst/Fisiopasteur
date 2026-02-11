// // Ejemplo de cómo refactorizar el modal desktop para usar el mismo hook
// // Este es solo un ejemplo de implementación - no ejecutar directamente

// "use client";

// import { useState, useEffect } from "react";
// import BaseDialog from "@/componentes/dialog/base-dialog";
// import { useTurnoForm } from "@/hooks/useTurnoForm";
// import Loading from "../loading";
// import { formatoDNI, formatoNumeroTelefono } from "@/lib/utils";

// interface NuevoTurnoModalRefactoredProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onTurnoCreated?: () => void;
//   fechaSeleccionada?: Date | null;
// }

// export function NuevoTurnoModalRefactored({
//   isOpen,
//   onClose,
//   onTurnoCreated,
//   fechaSeleccionada = null
// }: NuevoTurnoModalRefactoredProps) {
  
//   // Usar el mismo hook que mobile
//   const {
//     formData,
//     updateFormData,
//     resetForm,
//     especialistas,
//     pacientes,
//     especialidadesDisponibles,
//     boxesDisponibles,
//     horasOcupadas,
//     loading,
//     isSubmitting,
//     cargarDatos,
//     crearNuevoTurno,
//     isHoraDisponible
//   } = useTurnoForm();

//   // Estados específicos del modal desktop
//   const [busquedaPaciente, setBusquedaPaciente] = useState('');
//   const [pacientesFiltrados, setPacientesFiltrados] = useState<any[]>([]);
//   const [mostrarListaPacientes, setMostrarListaPacientes] = useState(false);

//   // Cargar datos al abrir el modal
//   useEffect(() => {
//     if (isOpen && !loading) {
//       cargarDatos();
//     }
//   }, [isOpen, cargarDatos, loading]);

//   // Establecer fecha inicial si se proporciona
//   useEffect(() => {
//     if (fechaSeleccionada) {
//       const fechaString = fechaSeleccionada.toISOString().split('T')[0];
//       updateFormData('fecha', fechaString);
//     }
//   }, [fechaSeleccionada, updateFormData]);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     const result = await crearNuevoTurno();
    
//     if (result.success) {
//       onTurnoCreated?.();
//       onClose();
//       resetForm();
//     }
//   };

//   const handleClose = () => {
//     resetForm();
//     setBusquedaPaciente('');
//     setMostrarListaPacientes(false);
//     onClose();
//   };

//   // Generar horarios disponibles (misma lógica que mobile pero diferente UI)
//   const horariosDisponibles = [];
//   for (let hora = 8; hora <= 20; hora++) {
//     for (let minutos = 0; minutos < 60; minutos += 30) {
//       const timeValue = `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
//       const disponible = isHoraDisponible(timeValue);
      
//       horariosDisponibles.push({
//         value: timeValue,
//         label: new Date(2000, 0, 1, hora, minutos).toLocaleTimeString('es-AR', { 
//           hour: '2-digit', 
//           minute: '2-digit', 
//           hour12: true 
//         }),
//         disponible
//       });
//     }
//   }

//   return (
//     <BaseDialog
//       isOpen={isOpen}
//       onClose={handleClose}
//       title="Nuevo Turno"
//       size="lg"
//       message=""
//     >
//       <form onSubmit={handleSubmit} className="space-y-4">
        
//         {/* Fecha */}
//         <div>
//           <label className="block text-sm font-medium mb-2">Fecha *</label>
//           <input
//             type="date"
//             value={formData.fecha}
//             onChange={(e) => updateFormData('fecha', e.target.value)}
//             className="w-full px-3 py-2 border border-gray-300 rounded-md"
//             required
//           />
//         </div>

//         {/* Paciente */}
//         <div>
//           <label className="block text-sm font-medium mb-2">Paciente *</label>
//           <select
//             value={formData.id_paciente}
//             onChange={(e) => updateFormData('id_paciente', e.target.value)}
//             className="w-full px-3 py-2 border border-gray-300 rounded-md"
//             required
//           >
//             <option value="">Seleccionar paciente</option>
//             {pacientes.map((paciente) => (
//               <option key={paciente.id_paciente} value={paciente.id_paciente}>
//                 {paciente.nombre} {paciente.apellido} - DNI: {paciente.dni}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Especialista */}
//         <div>
//           <label className="block text-sm font-medium mb-2">Especialista *</label>
//           <select
//             value={formData.id_especialista}
//             onChange={(e) => updateFormData('id_especialista', e.target.value)}
//             className="w-full px-3 py-2 border border-gray-300 rounded-md"
//             required
//           >
//             <option value="">Seleccionar especialista</option>
//             {especialistas.map((especialista) => (
//               <option key={especialista.id_usuario} value={especialista.id_usuario}>
//                 {especialista.nombre} {especialista.apellido}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Especialidad */}
//         {especialidadesDisponibles.length > 0 && (
//           <div>
//             <label className="block text-sm font-medium mb-2">Especialidad</label>
//             <select
//               value={formData.id_especialidad}
//               onChange={(e) => updateFormData('id_especialidad', e.target.value)}
//               className="w-full px-3 py-2 border border-gray-300 rounded-md"
//             >
//               <option value="">Seleccionar especialidad</option>
//               {especialidadesDisponibles.map((especialidad) => (
//                 <option key={especialidad.id_especialidad} value={especialidad.id_especialidad}>
//                   {especialidad.nombre}
//                 </option>
//               ))}
//             </select>
//           </div>
//         )}

//         {/* Horario */}
//         <div>
//           <label className="block text-sm font-medium mb-2">Horario *</label>
//           <select
//             value={formData.hora}
//             onChange={(e) => updateFormData('hora', e.target.value)}
//             className="w-full px-3 py-2 border border-gray-300 rounded-md"
//             required
//           >
//             <option value="">Seleccionar horario</option>
//             {horariosDisponibles.map((horario) => (
//               <option 
//                 key={horario.value} 
//                 value={horario.value}
//                 disabled={!horario.disponible}
//                 className={!horario.disponible ? 'text-red-400' : ''}
//               >
//                 {horario.label} {!horario.disponible ? '(Ocupado)' : ''}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Box */}
//         <div>
//           <label className="block text-sm font-medium mb-2">Box</label>
//           <select
//             value={formData.id_box}
//             onChange={(e) => updateFormData('id_box', e.target.value)}
//             className="w-full px-3 py-2 border border-gray-300 rounded-md"
//           >
//             <option value="">Seleccionar box</option>
//             {boxesDisponibles.map((box) => (
//               <option key={box.id_box} value={box.id_box}>
//                 Box {box.numero}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Tipo de Plan */}
//         <div>
//           <label className="block text-sm font-medium mb-2">Tipo de Plan</label>
//           <select
//             value={formData.tipo_plan}
//             onChange={(e) => updateFormData('tipo_plan', e.target.value as 'particular' | 'obra_social')}
//             className="w-full px-3 py-2 border border-gray-300 rounded-md"
//           >
//             <option value="particular">Particular</option>
//             <option value="obra_social">Obra Social</option>
//           </select>
//         </div>

//         {/* Precio */}
//         <div>
//           <label className="block text-sm font-medium mb-2">Precio</label>
//           <input
//             type="number"
//             value={formData.precio}
//             onChange={(e) => updateFormData('precio', e.target.value)}
//             className="w-full px-3 py-2 border border-gray-300 rounded-md"
//             step="0.01"
//             placeholder="0.00"
//           />
//         </div>

//         {/* Observaciones */}
//         <div>
//           <label className="block text-sm font-medium mb-2">Observaciones</label>
//           <textarea
//             value={formData.observaciones}
//             onChange={(e) => updateFormData('observaciones', e.target.value)}
//             className="w-full px-3 py-2 border border-gray-300 rounded-md"
//             rows={3}
//             placeholder="Observaciones adicionales..."
//           />
//         </div>

//         {/* Botones */}
//         <div className="flex gap-3 pt-4">
//           <button
//             type="button"
//             onClick={handleClose}
//             className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
//           >
//             Cancelar
//           </button>
//           <button
//             type="submit"
//             disabled={isSubmitting}
//             className="flex-1 px-4 py-2 bg-[#9C1838] text-white rounded-md hover:bg-[#9C1838]/90 disabled:opacity-50"
//           >
//             {isSubmitting ? 'Creando...' : 'Crear Turno'}
//           </button>
//         </div>
//       </form>

//       {loading && (
//         <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
//           <Loading />
//         </div>
//       )}
//     </BaseDialog>
//   );
// }