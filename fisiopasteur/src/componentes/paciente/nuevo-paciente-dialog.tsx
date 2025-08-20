'use client'

import BaseDialog from "../dialog/base-dialog";
import Image from "next/image";

interface NuevoPacienteDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NuevoPacienteDialog({ isOpen, onClose }: NuevoPacienteDialogProps) {
    return (
        <BaseDialog
            type="custom"
            size="lg"
            title="Nuevo Paciente"
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
                    <div className="text-gray-600 mb-6 text-center">Completa la información para crear un nuevo paciente.</div>
                    <PacienteForm
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

interface PacienteFormProps {
    onSuccess: () => void;
}

function PacienteForm({ onSuccess }: PacienteFormProps) {
    return (
        <div className="max-w-4xl">
            <PacienteFormForDialog
                mode="create"
                onSuccess={onSuccess}
            />
        </div>
    );
}

import { createPaciente } from "@/lib/actions/paciente.action";
import Button from "../boton";
import { useState } from "react";

interface PacienteFormForDialogProps {
    mode: "create" | "edit";
    onSuccess: () => void;
}

function PacienteFormForDialog({ mode, onSuccess }: PacienteFormForDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = (formData: FormData): boolean => {
        const newErrors: Record<string, string> = {};

        // Validar campos del formulario y agregar errores a newErrors

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSubmit = async (formData: FormData) => {
        if (!validateForm(formData)) {
            return;
        }

        try {
            setIsSubmitting(true);
            await createPaciente(formData);
            onSuccess();
        } catch (error: any) {
            if (error?.digest?.includes('NEXT_REDIRECT')) {
                onSuccess();
                return;
            }

            console.error("Error:", error);
            alert("Error al crear especialista");
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
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100 ${
                        errors.apellido ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Ingresa el apellido"
                    />
                    {errors.apellido && <p className="text-red-500 text-xs mt-1">{errors.apellido}</p>}
                </div>

                {/* DNI */}
                <div>
                    <label htmlFor="dni" className="block text-sm font-medium text-gray-700 mb-1">
                        DNI *
                    </label>
                    <input
                        type="text"
                        id="dni"
                        name="dni"
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100 ${
                        errors.dni ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Ingresa el DNI"
                    />
                    {errors.dni && <p className="text-red-500 text-xs mt-1">{errors.dni}</p>}
                </div>

            </div>
        </form>
    );
}