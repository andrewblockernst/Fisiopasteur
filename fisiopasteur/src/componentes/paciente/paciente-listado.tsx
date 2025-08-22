import { Tables } from "@/types/database.types";
import Button from "../boton";
import { useState } from "react";
import { DeletePacienteButton } from "./eliminar-boton";
import { EditarPacienteDialog } from "./editar-paciente-dialog";


type Paciente = Tables<'paciente'>;

interface PacientesTableProps {
    pacientes: Paciente[];
    onPacienteUpdated?: () => void;
    onPacienteDeleted?: () => void;
}

export function PacientesTable({pacientes, onPacienteUpdated, onPacienteDeleted}: PacientesTableProps) {
    const[editingPaciente, setEditingPaciente] = useState<Paciente | null>(null);

    const handleEditClose = () => {
        setEditingPaciente(null);
        if(onPacienteUpdated) {
            onPacienteUpdated()
        }
    }

    return (
        <>
        {/* Vista de tabla para desktop */}
        <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Apellido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DNI
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha de Nacimiento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                </th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {pacientes.map((paciente) => (
                <tr key={paciente.id_paciente}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {paciente.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {paciente.apellido}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {paciente.dni}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {paciente.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {paciente.telefono}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {paciente.fecha_nacimiento}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {paciente.activo ? "Activo" : "Inactivo"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Button 
                            variant="secondary" 
                            className="text-xs"
                            onClick={() => setEditingPaciente(paciente)}
                        >
                            Editar
                        </Button>
                        <DeletePacienteButton 
                            id={paciente.id_paciente}
                            nombre={`${paciente.nombre} ${paciente.apellido}`}
                            onDeleted={onPacienteDeleted}
                        />
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
    
        {/* Vista de lista para mobile */}
        <div className="md:hidden space-y-4">
            {pacientes.map((paciente) => (
            <div key={paciente.id_paciente} className="bg-white shadow-md rounded-lg p-4">
                <h3 className="text-lg font-semibold">{paciente.nombre} {paciente.apellido}</h3>
                <p className="text-gray-600">DNI: {paciente.dni}</p>
                <p className="text-gray-600">Email: {paciente.email}</p>
                <p className="text-gray-600">Teléfono: {paciente.telefono}</p>
            </div>
            ))}
        </div>

        {editingPaciente && (
            <EditarPacienteDialog
                isOpen={true}
                onClose={handleEditClose}
                paciente={editingPaciente}
            />
        )}
        </>
    );
}
