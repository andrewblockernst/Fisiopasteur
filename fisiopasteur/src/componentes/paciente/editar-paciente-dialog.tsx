'use client';

import { Tables } from "@/types/database.types";
import BaseDialog from "../dialog/base-dialog";
import Image from "next/image";
import { useState } from "react";
import { updatePaciente } from "@/lib/actions/paciente.action";
import Button from "../boton";

type Paciente = Tables<'paciente'>;

interface EditarPacienteDialogProps {
    isOpen: boolean;
    onClose: () => void;
    paciente: Paciente;
}

export function EditarPacienteDialog({ isOpen, onClose, paciente }: EditarPacienteDialogProps) {
    return (
        <BaseDialog
            type="custom"
            size="lg"
            title="Editar Paciente"
            customIcon={
                <Image
                    src="/favicon.svg"
                    alt="Logo Fisiopasteur"
                    width={120}
                    height={40}
                    className="object-contain"
                />
            }
            message={
                <div className="text-left">
                    <div className="text-gray-600 mb-6 text-center">Modifica la información del paciente.</div>
                    <PacienteEditFormWrapper
                        paciente={paciente}
                        onSuccess={onClose}
                    />
                </div>
            }
            isOpen={isOpen}
            onClose={onClose}
            showCloseButton={true}
        />
    )
}

interface PacienteEditFormWrapperProps {
    paciente: Paciente;
    onSuccess: () => void;
}

function PacienteEditFormWrapper({paciente, onSuccess} : PacienteEditFormWrapperProps) {
    return (
        <div className="max-w-4xl">
            <PacienteEditFormForDialog
                paciente={paciente}
                onSuccess={onSuccess}
            />
        </div>
    )
}

interface PacienteEditFormForDialogProps {
    paciente: Paciente;
    onSuccess: () => void;
}

function PacienteEditFormForDialog({paciente, onSuccess}: PacienteEditFormForDialogProps) {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateForm = (formData: FormData): boolean => {
        const newErrors: Record<string, string> = {};

        // Validar campos del formulario y agregar errores a newErrors
        if (!formData.get("nombre")) newErrors.nombre = "El nombre es obligatorio.";
        if(!formData.get("apellido")) newErrors.apellido = "El apellido es obligatorio.";
        if(!formData.get("telefono")) newErrors.telefono = "El teléfono es obligatorio.";

        const email = formData.get("email") as string;
        if (email && !/\S+@\S+\.\S+/.test(email)) {
        newErrors.email = "Email inválido";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (formData: FormData) => {
        if (!validateForm(formData)) {
            return;
        }
    
        try {
            setIsSubmitting(true);
            await updatePaciente(paciente.id_paciente, formData);
            onSuccess();
        } catch (error: any) {
            if (error?.digest?.includes('NEXT_REDIRECT')) {
                onSuccess();
                return;
            }

            console.error("Error:", error);
            alert(error.message);
            setIsSubmitting(false);
        }
    };

    return (
        <form action={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Nombre */}
                <div>
                    <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre *
                    </label>
                    <input
                        type="text"
                        id="nombre"
                        name="nombre"
                        defaultValue={paciente.nombre}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100 ${
                        errors.nombre ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Ingresa el nombre"
                    />
                    {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
                </div>

                {/* Apellido */}
                <div>
                    <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-1">
                        Apellido *
                    </label>
                    <input
                        type="text"
                        id="apellido"
                        name="apellido"
                        defaultValue={paciente.apellido}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100 ${
                        errors.apellido ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Ingresa el apellido"
                    />
                    {errors.apellido && <p className="text-red-500 text-xs mt-1">{errors.apellido}</p>}
                </div>

                {/* Telefono */}
                <div>
                    <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                        Telefono *
                    </label>
                    <input
                        type="text"
                        id="telefono"
                        name="telefono"
                        defaultValue={paciente.telefono}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100 ${
                        errors.telefono ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Ingresa el telefono"
                    />
                    {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>}
                </div>

                {/* Email */}
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                        Email 
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        defaultValue={paciente.email || ''}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100 ${
                        errors.email ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="correo@ejemplo.com"
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                {/* DNI */}
                <div>
                    <label htmlFor="dni" className="block text-sm font-medium text-gray-700 mb-1">
                        DNI 
                    </label>
                    <input
                        type="text"
                        id="dni"
                        name="dni"
                        defaultValue={paciente.dni || ''}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100 ${
                        errors.dni ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Ingresa el DNI"
                    />
                    {errors.dni && <p className="text-red-500 text-xs mt-1">{errors.dni}</p>}
                </div>

                {/* Fecha de Nacimiento */}
                <div>
                    <label htmlFor="fecha_nacimiento" className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Nacimiento
                    </label>
                    <input
                        type="date"
                        id="fecha_nacimiento"
                        name="fecha_nacimiento"
                        defaultValue={paciente.fecha_nacimiento || ''}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100 ${
                        errors.fecha_nacimiento ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Ingresa la fecha de nacimiento"
                    />
                    
                    {errors.fecha_nacimiento && <p className="text-red-500 text-xs mt-1">{errors.fecha_nacimiento}</p>}
                </div>

                {/* Direccion */}
                <div>
                    <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 mb-1">
                        Direccion 
                    </label>
                    <input
                        type="text"
                        id="direccion"
                        name="direccion"
                        defaultValue={paciente.direccion || ''}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100 ${
                        errors.direccion ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Ingresa la direccion"
                    />
                    {errors.direccion && <p className="text-red-500 text-xs mt-1">{errors.direccion}</p>}
                </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3 mt-6">
                <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={onSuccess}
                >
                Cancelar
                </Button>
                <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                >
                {isSubmitting ? "Actualizando..." : "Actualizar Paciente"}
                </Button>
            </div>
        </form>
    );
}