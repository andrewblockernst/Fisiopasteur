'use client';

import { useRouter } from 'next/navigation';
import { z } from 'zod';

import { actualizarPerfil, PerfilCompleto } from '@/lib/actions/perfil.action';
import { useToastStore } from '@/stores/toast-store';
import BaseDialog from '@/componentes/dialog/base-dialog';
import { DiscardChangesDialog } from '@/componentes/dialog/discard-changes-dialog';
import {
  Button,
  Input,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/componentes/ui';
import { useModalForm } from '@/hooks/use-modal-form';
import { LIMITES } from '@/lib/validators/common';

const FORM_ID = 'editar-perfil-form';

const perfilSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(LIMITES.nombrePersonaMax, `Máximo ${LIMITES.nombrePersonaMax} caracteres`),
  apellido: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(LIMITES.nombrePersonaMax, `Máximo ${LIMITES.nombrePersonaMax} caracteres`),
  telefono: z.string().trim().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido')
    .or(z.literal('')),
});

type PerfilFormValues = z.infer<typeof perfilSchema>;

interface EditarPerfilDialogProps {
  open: boolean;
  onClose: () => void;
  perfil: PerfilCompleto;
}

export default function EditarPerfilDialog({
  open,
  onClose,
  perfil,
}: EditarPerfilDialogProps) {
  const { addToast } = useToastStore();
  const router = useRouter();

  const form = useModalForm({
    schema: perfilSchema,
    mode: 'edit',
    resetKey: `${perfil.id_usuario}:${open}`,
    onClose,
    defaultValues: {
      nombre: perfil.nombre ?? '',
      apellido: perfil.apellido ?? '',
      telefono: perfil.telefono ?? '',
      color: perfil.color ?? '#9C1838',
    },
  });

  const onSubmit = (values: PerfilFormValues) =>
    form.submit(
      () => {
        const formData = new FormData();
        formData.set('nombre', values.nombre);
        formData.set('apellido', values.apellido);
        formData.set('telefono', values.telefono ?? '');
        formData.set('color', values.color ?? '');
        return actualizarPerfil(formData) as any;
      },
      {
        onSuccess: () => {
          addToast({ variant: 'success', message: 'Perfil actualizado' });
          onClose();
          router.refresh();
        },
        onError: (error) =>
          addToast({ variant: 'error', message: 'Error al actualizar perfil', description: error }),
      },
    );

  return (
    <>
      <BaseDialog
        isOpen={open}
        onClose={form.requestClose}
        title="Editar Perfil"
        size="md"
        showCloseButton
        closeButtonAlert={form.hasUnsavedChanges ? 'Cambios sin guardar' : undefined}
        customIcon={
          <img
            src="/favicon.svg"
            alt="Fisio Pasteur"
            className="h-10 w-10 rounded-full"
          />
        }
        message={
          <Form {...form}>
            <form
              id={FORM_ID}
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-5"
              noValidate
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Juan" autoComplete="given-name" maxLength={LIMITES.nombrePersonaMax} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apellido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Apellido</FormLabel>
                      <FormControl>
                        <Input placeholder="Pérez" autoComplete="family-name" maxLength={LIMITES.nombrePersonaMax} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem className="md:col-span-2">
                  <FormLabel>Email</FormLabel>
                  <Input value={perfil.email} readOnly />
                  <FormDescription>El email no se puede modificar desde aquí.</FormDescription>
                </FormItem>
                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          inputMode="tel"
                          placeholder="549..."
                          autoComplete="tel"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color identificador</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            aria-label="Selector de color"
                            className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background p-0.5"
                            value={field.value || '#9C1838'}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                          <Input
                            placeholder="#9C1838"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="font-mono"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>Se usa para identificarte en el calendario.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        }
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <Button
              type="button"
              onClick={form.requestClose}
              variant="outline"
              fullWidth
              className="sm:flex-1"
              disabled={form.isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              form={FORM_ID}
              variant="primary"
              fullWidth
              className="sm:flex-1"
              {...form.submitButtonProps}
            >
              {form.isSubmitting ? 'Guardando…' : 'Actualizar'}
            </Button>
          </div>
        }
      />
      <DiscardChangesDialog
        isOpen={form.discardConfirm.isOpen}
        onCancel={form.discardConfirm.onCancel}
        onConfirm={form.discardConfirm.onConfirm}
      />
    </>
  );
}
