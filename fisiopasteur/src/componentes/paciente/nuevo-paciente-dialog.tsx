'use client'

import Image from "next/image";
import BaseDialog from "../dialog/base-dialog";
import { DiscardChangesDialog } from "../dialog/discard-changes-dialog";
import { ToastItem } from "@/stores/toast-store";
import {
    Button,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Input,
    Switch,
} from "@/componentes/ui";
import { createPaciente } from "@/lib/actions/paciente.action";
import { pacienteCreateSchema, type PacienteCreateInput } from "@/lib/schemas/paciente.schema";
import { useModalForm } from "@/hooks/use-modal-form";
import { getPhoneInputHint } from "@/lib/utils/phone.utils";
import { fechaNacimientoMinInput, fechaNacimientoMaxInput, LIMITES } from "@/lib/validators/common";

const FORM_ID = "nuevo-paciente-form";

interface NuevoPacienteDialogProps {
    isOpen: boolean;
    onClose: () => void;
    handleToast: (toast: Omit<ToastItem, 'id'>) => void;
    onPatientCreated?: (paciente?: any) => void;
}

export function NuevoPacienteDialog({ isOpen, onClose, handleToast, onPatientCreated }: NuevoPacienteDialogProps) {
    const form = useModalForm({
        schema: pacienteCreateSchema,
        mode: "create",
        resetKey: isOpen,
        onClose,
        defaultValues: {
            nombre: "",
            apellido: "",
            telefono: "",
            email: "",
            dni: "",
            fecha_nacimiento: "",
            direccion: "",
            notif_confirmacion: true,
            notif_recordatorios: true,
        },
    });

    const onSubmit = (values: PacienteCreateInput) =>
        form.submit(
            () => {
                const fd = new FormData();
                fd.set("nombre", values.nombre);
                fd.set("apellido", values.apellido);
                fd.set("telefono", values.telefono);
                if (values.email) fd.set("email", values.email);
                if (values.dni) fd.set("dni", values.dni);
                if (values.fecha_nacimiento) fd.set("fecha_nacimiento", values.fecha_nacimiento);
                if (values.direccion) fd.set("direccion", values.direccion);
                fd.set("notif_confirmacion", values.notif_confirmacion ? "true" : "false");
                fd.set("notif_recordatorios", values.notif_recordatorios ? "true" : "false");
                return createPaciente(fd);
            },
            {
                onSuccess: (paciente) => {
                    handleToast({ message: "Paciente creado exitosamente", variant: "success" });
                    onPatientCreated?.(paciente);
                    onClose();
                },
                onError: (error) => handleToast({ message: error, variant: "error" }),
            },
        );

    const phoneValue = form.watch("telefono");

    return (
        <>
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
                        <div className="text-muted-foreground mb-6 text-center">
                            Completá la información para crear un nuevo paciente.
                        </div>
                        <Form {...form}>
                            <form id={FORM_ID} onSubmit={form.handleSubmit(onSubmit)} noValidate>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="nombre" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel required>Nombre</FormLabel>
                                            <FormControl><Input placeholder="Ingresa el nombre" maxLength={LIMITES.nombrePersonaMax} {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="apellido" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel required>Apellido</FormLabel>
                                            <FormControl><Input placeholder="Ingresa el apellido" maxLength={LIMITES.nombrePersonaMax} {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="telefono" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel required>Teléfono</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ej: 1166782051 o +5491166782051" inputMode="tel" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            {!form.formState.errors.telefono && phoneValue && (
                                                <p className={`text-xs mt-1 ${getPhoneInputHint(phoneValue).startsWith("✓") ? "text-success" : "text-muted-foreground"}`}>
                                                    {getPhoneInputHint(phoneValue)}
                                                </p>
                                            )}
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl><Input type="email" placeholder="correo@ejemplo.com" maxLength={LIMITES.emailMax} {...field} value={field.value ?? ""} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="dni" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>DNI</FormLabel>
                                            <FormControl><Input inputMode="numeric" maxLength={8} placeholder="Ej: 12345678" {...field} value={field.value ?? ""} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="fecha_nacimiento" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fecha de nacimiento</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    min={fechaNacimientoMinInput()}
                                                    max={fechaNacimientoMaxInput()}
                                                    {...field}
                                                    value={field.value ?? ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="direccion" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Dirección</FormLabel>
                                            <FormControl><Input placeholder="Ingresa la dirección" maxLength={LIMITES.textoCortoMax} {...field} value={field.value ?? ""} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="col-span-2 mt-4">
                                    <p className="text-sm font-medium text-foreground mb-2">Notificaciones WhatsApp</p>
                                    <div className="space-y-3 rounded-lg border border-border p-3 bg-muted/40">
                                        <FormField control={form.control} name="notif_confirmacion" render={({ field }) => (
                                            <FormItem className="flex items-center justify-between gap-3 space-y-0">
                                                <div className="min-w-0 flex-1">
                                                    <FormLabel>Confirmación al crear turno</FormLabel>
                                                    <p className="text-xs text-muted-foreground">Mensaje inmediato cuando se agenda un turno</p>
                                                </div>
                                                <FormControl>
                                                    <Switch checked={!!field.value} onCheckedChange={field.onChange} aria-label="Confirmación al crear turno" />
                                                </FormControl>
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="notif_recordatorios" render={({ field }) => (
                                            <FormItem className="flex items-center justify-between gap-3 space-y-0">
                                                <div className="min-w-0 flex-1">
                                                    <FormLabel>Recordatorios automáticos</FormLabel>
                                                    <p className="text-xs text-muted-foreground">Avisos previos al turno (1 día antes, 2 horas antes, etc.)</p>
                                                </div>
                                                <FormControl>
                                                    <Switch checked={!!field.value} onCheckedChange={field.onChange} aria-label="Recordatorios automáticos" />
                                                </FormControl>
                                            </FormItem>
                                        )} />
                                    </div>
                                </div>
                            </form>
                        </Form>
                    </div>
                }
                footer={
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                        <Button type="button" variant="outline" onClick={form.requestClose} disabled={form.isSubmitting}>
                            Cancelar
                        </Button>
                        <Button form={FORM_ID} variant="primary" {...form.submitButtonProps}>
                            Crear paciente
                        </Button>
                    </div>
                }
                isOpen={isOpen}
                onClose={form.requestClose}
                showCloseButton={true}
            />
            <DiscardChangesDialog
                isOpen={form.discardConfirm.isOpen}
                onCancel={form.discardConfirm.onCancel}
                onConfirm={form.discardConfirm.onConfirm}
            />
        </>
    );
}
