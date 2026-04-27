'use client';

import { Tables } from "@/types/database.types";
import BaseDialog from "../dialog/base-dialog";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { updatePaciente } from "@/lib/actions/paciente.action";
import Button from "../boton";
import { ToastItem } from "@/stores/toast-store";
import { getPhoneInputHint, isValidPhoneNumber } from "@/lib/utils/phone.utils";

type Paciente = Tables<'paciente'>;

interface EditarPacienteDialogProps {
    isOpen: boolean;
    onClose: () => void;
    paciente: Paciente;
    handleToast: (toast: Omit<ToastItem, 'id'>) => void;
}

export function EditarPacienteDialog({ isOpen, onClose, paciente, handleToast }: EditarPacienteDialogProps) {
    const onSuccess = () => {
            handleToast({
                variant: "success",
                message: "El paciente se ha actualizado correctamente.",
            });
            onClose();
        };

    const onError = (error: unknown) => {
        handleToast({
            variant: "error",
            message: error instanceof Error ? error.message : "Error al eliminar el paciente.",
        });
    };

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
                        onSuccess={onSuccess}
                        onError={onError}
                        onCancel={onClose}
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
    onError: (error: unknown) => void;
    onCancel: () => void;
}

function PacienteEditFormWrapper({paciente, onSuccess, onError, onCancel} : PacienteEditFormWrapperProps) {
    return (
        <div className="max-w-4xl">
            <PacienteEditFormForDialog
                paciente={paciente}
                onSuccess={onSuccess}
                onError={onError}
                onCancel={onCancel}
            />
        </div>
    )
}

interface PacienteEditFormForDialogProps {
    paciente: Paciente;
    onSuccess: () => void;
    onError: (error: unknown) => void;
    onCancel: () => void;
}

function PacienteEditFormForDialog({paciente, onSuccess, onError, onCancel}: PacienteEditFormForDialogProps) {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [phoneInput, setPhoneInput] = useState(paciente.telefono || '');
    const [hasChanges, setHasChanges] = useState(false);
    const [formValues, setFormValues] = useState({
        nombre: paciente.nombre,
        apellido: paciente.apellido,
        telefono: paciente.telefono,
        email: paciente.email || '',
        dni: paciente.dni || '',
        fecha_nacimiento: paciente.fecha_nacimiento || '',
        direccion: paciente.direccion || '',
        notif_confirmacion: paciente.notif_confirmacion ?? true,
        notif_recordatorios: paciente.notif_recordatorios ?? true,
    });

    const datosOriginales = useMemo(() => ({
        nombre: paciente.nombre.trim().toLowerCase(),
        apellido: paciente.apellido.trim().toLowerCase(),
        telefono: paciente.telefono.trim(),
        email: (paciente.email || '').trim().toLowerCase(),
        dni: (paciente.dni || '').trim(),
        fecha_nacimiento: paciente.fecha_nacimiento ? paciente.fecha_nacimiento.trim() : '',
        direccion: (paciente.direccion || '').trim().toLowerCase(),
        notif_confirmacion: paciente.notif_confirmacion ?? true,
        notif_recordatorios: paciente.notif_recordatorios ?? true,
    }), [paciente]);

    // Detectar cambios en el formulario
    useEffect(() => {
        const cambiosDetectados = Object.entries(formValues).some(([key, value]) => {
            const valorOriginal = (datosOriginales as any)[key];
            
            // Protección: si value es null/undefined, lo convertimos a string vacío
            const valorString = value.toString() || ''; 
            const valorLimpio = valorString.trim();

            // Solo pasamos a minúsculas los campos que definimos así en datosOriginales
            const camposEnMinuscula = ['nombre', 'apellido', 'email', 'direccion'];
            const valorFinal = camposEnMinuscula.includes(key) 
                ? valorLimpio.toLowerCase() 
                : valorLimpio;

            return valorFinal !== valorOriginal;
        });
        setHasChanges(cambiosDetectados);
    }, [formValues, datosOriginales]);

    const validateForm = (formData: FormData): boolean => {
        const newErrors: Record<string, string> = {};

        // Validar campos del formulario y agregar errores a newErrors
        if (!formData.get("nombre")) newErrors.nombre = "El nombre es obligatorio.";
        if(!formData.get("apellido")) newErrors.apellido = "El apellido es obligatorio.";
        
        const telefono = formData.get("telefono") as string;
        if(!telefono) {
            newErrors.telefono = "El teléfono es obligatorio.";
        } else if (!isValidPhoneNumber(telefono)) {
            newErrors.telefono = "El formato del teléfono no es válido. Ej: 1166782051";
        }

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
            const result = await updatePaciente(paciente.id_paciente, formData);
            if (!result.success) {
                onError(new Error(result.error));
                setIsSubmitting(false);
                return;
            }
            onSuccess();
        } catch (error: any) {
            if (error?.digest?.includes('NEXT_REDIRECT')) {
                onSuccess();
                return;
            }

            console.error("Error:", error);
            onError(error);
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
                        // defaultValue={paciente.nombre}
                        value={formValues.nombre}
                        onChange={(e) => setFormValues(prev => ({...prev, nombre: e.target.value}))}
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
                        value={formValues.apellido}
                        onChange={(e) => setFormValues(prev => ({...prev, apellido: e.target.value}))}
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
                        Teléfono *
                    </label>
                    <input
                        type="text"
                        id="telefono"
                        name="telefono"
                        value={phoneInput}
                        onChange={(e) => {
                            setPhoneInput(e.target.value);
                            setFormValues(prev => ({...prev, telefono: e.target.value}))
                        }}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100 ${
                        errors.telefono ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Ej: 1166782051 o +5491166782051"
                    />
                    {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>}
                    {!errors.telefono && phoneInput && (
                        <p className={`text-xs mt-1 ${
                            getPhoneInputHint(phoneInput).startsWith('✓') 
                                ? 'text-green-600' 
                                : 'text-gray-500'
                        }`}>
                            {getPhoneInputHint(phoneInput)}
                        </p>
                    )}
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
                        // defaultValue={paciente.email || ''}
                        value={formValues.email}
                        onChange={(e) => setFormValues(prev => ({ ...prev, email:e.target.value}))}
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
                        // defaultValue={paciente.dni || ''}
                        value={formValues.dni}
                        onChange={(e) => setFormValues(prev => ({ ...prev, dni: e.target.value}))}
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
                        // defaultValue={paciente.fecha_nacimiento || ''}
                        value={formValues.fecha_nacimiento}
                        onChange={(e) => setFormValues(prev => ({ ...prev, fecha_nacimiento: e.target.value}))}
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
                        // defaultValue={paciente.direccion || ''}
                        value={formValues.direccion}
                        onChange={(e) => setFormValues(prev => ({ ...prev, direccion: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-100 ${
                        errors.direccion ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Ingresa la direccion"
                    />
                    {errors.direccion && <p className="text-red-500 text-xs mt-1">{errors.direccion}</p>}
                </div>
            </div>

            {/* Notificaciones WhatsApp */}
            <div className="col-span-2 mt-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Notificaciones WhatsApp</p>
                <div className="space-y-2 rounded-lg border border-gray-200 p-3 bg-gray-50">
                    {/* Hidden inputs para FormData */}
                    <input type="hidden" name="notif_confirmacion" value={formValues.notif_confirmacion ? "true" : "false"} />
                    <input type="hidden" name="notif_recordatorios" value={formValues.notif_recordatorios ? "true" : "false"} />

                    {/* Toggle: Confirmación */}
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-sm text-gray-700">Confirmación al crear turno</span>
                            <p className="text-xs text-gray-500">Mensaje inmediato cuando se agenda un turno</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormValues(prev => ({ ...prev, notif_confirmacion: !prev.notif_confirmacion }))}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                                formValues.notif_confirmacion ? 'bg-[#9C1838]' : 'bg-gray-300'
                            }`}
                            role="switch"
                            aria-checked={formValues.notif_confirmacion}
                        >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                                formValues.notif_confirmacion ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                        </button>
                    </div>

                    {/* Toggle: Recordatorios */}
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-sm text-gray-700">Recordatorios automáticos</span>
                            <p className="text-xs text-gray-500">Avisos previos al turno (1 día antes, 2 horas antes, etc.)</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormValues(prev => ({ ...prev, notif_recordatorios: !prev.notif_recordatorios }))}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                                formValues.notif_recordatorios ? 'bg-[#9C1838]' : 'bg-gray-300'
                            }`}
                            role="switch"
                            aria-checked={formValues.notif_recordatorios}
                        >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                                formValues.notif_recordatorios ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3 mt-6">
                <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={onCancel}
                >
                Cancelar
                </Button>
                <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !hasChanges}
                >
                {isSubmitting ? "Actualizando..." : "Actualizar Paciente"}
                </Button>
            </div>
        </form>
    );
}