"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import BaseDialog from "@/componentes/dialog/base-dialog";
import { DiscardChangesDialog } from "@/componentes/dialog/discard-changes-dialog";
import type { Tables } from "@/types/database.types";
import { createEspecialista } from "@/lib/actions/especialista.action";
import {
  Badge,
  Button,
  Checkbox,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@/componentes/ui";
import ColorPicker from "@/componentes/color-selector";
import { useToastStore } from "@/stores/toast-store";
import { useModalForm } from "@/hooks/use-modal-form";
import {
  especialistaCreateSchema,
  type EspecialistaCreateInput,
} from "@/lib/schemas/especialista.schema";
import { getPhoneInputHint } from "@/lib/utils/phone.utils";
import { LIMITES } from "@/lib/validators/common";

type Especialidad = Tables<"especialidad">;

const FORM_ID = "nuevo-especialista-form";

interface NuevoEspecialistaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  especialidades: Especialidad[];
}

export function NuevoEspecialistaDialog({
  isOpen,
  onClose,
  especialidades,
}: NuevoEspecialistaDialogProps) {
  const { showServerActionResponse, addToast } = useToastStore();
  const [showPassword, setShowPassword] = useState(false);

  const form = useModalForm({
    schema: especialistaCreateSchema,
    mode: "create",
    resetKey: isOpen,
    onClose,
    defaultValues: {
      nombre: "",
      apellido: "",
      email: "",
      contraseña: "",
      telefono: "",
      color: "#3B82F6",
      especialidades: [] as number[],
    },
  });

  const onSubmit = (values: EspecialistaCreateInput) =>
    form.submit(
      () => {
        const fd = new FormData();
        fd.set("nombre", values.nombre);
        fd.set("apellido", values.apellido);
        fd.set("email", values.email);
        fd.set("contraseña", values.contraseña);
        fd.set("telefono", values.telefono);
        fd.set("color", values.color);
        values.especialidades.forEach((id, i) =>
          fd.append(`especialidades[${i}]`, id.toString()),
        );
        return createEspecialista(fd);
      },
      {
        onSuccess: () => {
          showServerActionResponse({
            success: true,
            message: "Especialista creado",
            description: "El especialista se ha creado exitosamente",
            toastType: "success",
          });
          onClose();
        },
        onError: (error) =>
          addToast({ message: error, variant: "error" }),
      },
    );

  const phoneValue = form.watch("telefono");
  const selected = form.watch("especialidades") ?? [];
  const setSelected = (next: number[]) =>
    form.setValue("especialidades", next, {
      shouldDirty: true,
      shouldValidate: true,
    });

  return (
    <>
      <BaseDialog
        type="custom"
        size="lg"
        title="Nuevo Especialista"
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
              Completá la información para crear un nuevo especialista.
            </div>
            <Form {...form}>
              <form id={FORM_ID} onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Email</FormLabel>
                      <FormControl><Input type="email" placeholder="correo@ejemplo.com" maxLength={LIMITES.emailMax} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contraseña" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Contraseña</FormLabel>
                      <FormControl>
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Mínimo 6 caracteres"
                          maxLength={72}
                          rightIcon={
                            <button
                              type="button"
                              onClick={() => setShowPassword((prev) => !prev)}
                              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                              className="pointer-events-auto"
                            >
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          }
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="telefono" render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: 1166782051 o +5491166782051" inputMode="tel" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                      {!form.formState.errors.telefono && phoneValue && (
                        <p className={`text-xs mt-1 ${getPhoneInputHint(phoneValue).startsWith("✓") ? "text-success" : "text-muted-foreground"}`}>
                          {getPhoneInputHint(phoneValue)}
                        </p>
                      )}
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="color" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color de identificación</FormLabel>
                      <FormControl>
                        <ColorPicker
                          value={field.value}
                          onChange={field.onChange}
                          disabled={form.isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField
                  control={form.control}
                  name="especialidades"
                  render={() => (
                    <FormItem className="mt-4">
                      <FormLabel required>Especialidades</FormLabel>
                      {selected.length > 0 && (
                        <div className="mb-3 p-2 bg-muted/40 rounded-md">
                          <div className="flex flex-wrap gap-1.5">
                            {selected.map((id) => {
                              const esp = especialidades.find((e) => e.id_especialidad === id);
                              if (!esp) return null;
                              return (
                                <Badge key={id} variant="brand" size="sm" className="gap-1 pr-1">
                                  {esp.nombre}
                                  <button
                                    type="button"
                                    onClick={() => setSelected(selected.filter((x) => x !== id))}
                                    aria-label={`Quitar ${esp.nombre}`}
                                    className="rounded-full p-0.5 hover:bg-white/20 transition-colors"
                                  >
                                    ×
                                  </button>
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <div className="border border-input rounded-md max-h-40 overflow-y-auto bg-background">
                        {especialidades.map((esp) => {
                          const isSelected = selected.includes(esp.id_especialidad);
                          return (
                            <label
                              key={esp.id_especialidad}
                              className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/40 border-b border-border last:border-b-0 ${isSelected ? "bg-brand-soft/40 border-l-2 border-l-brand" : ""}`}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() =>
                                  setSelected(
                                    isSelected
                                      ? selected.filter((x) => x !== esp.id_especialidad)
                                      : [...selected, esp.id_especialidad],
                                  )
                                }
                              />
                              <span className={`text-sm ${isSelected ? "font-medium text-brand" : "text-foreground"}`}>
                                {esp.nombre}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              Crear especialista
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
