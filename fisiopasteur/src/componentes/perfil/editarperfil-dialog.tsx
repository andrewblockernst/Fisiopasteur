'use client';

import { useTransition } from 'react';
import { actualizarPerfil, PerfilCompleto } from '@/lib/actions/perfil.action';
import { useToastStore } from '@/stores/toast-store';
import BaseDialog from '@/componentes/dialog/base-dialog';
import Button from '../boton';

interface EditarPerfilDialogProps {
  open: boolean;
  onClose: () => void;
  perfil: PerfilCompleto;
}

const BRAND = '#9C1838';

export default function EditarPerfilDialog({ open, onClose, perfil }: EditarPerfilDialogProps) {
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToastStore();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await actualizarPerfil(formData);
      addToast({
        variant: result.success ? 'success' : 'error',
        message: result.success ? 'Perfil actualizado' : 'No se pudo actualizar el perfil',
        description: result.message,
      });
      if (result.success) {
        onClose();
        window.location.reload();
      }
    });
  };

  return (
    <BaseDialog
      isOpen={open}
      onClose={onClose}
      title="Editar Perfil"
      size="md"
      showCloseButton
      customColor={BRAND}
      message=""
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Nombre</label>
            <input
              type="text"
              name="nombre"
              defaultValue={perfil.nombre}
              className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[--brand] focus:border-[--brand] transition"
              style={{ ['--brand' as any]: BRAND }}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Apellido</label>
            <input
              type="text"
              name="apellido"
              defaultValue={perfil.apellido}
              className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[--brand] focus:border-[--brand] transition"
              style={{ ['--brand' as any]: BRAND }}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 mb-2">Email</label>
            <input
              type="email"
              value={perfil.email}
              readOnly
              className="w-full px-4 py-3 border border-neutral-200 bg-neutral-50 rounded-xl text-neutral-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Teléfono</label>
            <input
              type="tel"
              name="telefono"
              defaultValue={perfil.telefono || ''}
              placeholder="+54911..."
              className="w-full px-4 py-3 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-[--brand] focus:border-[--brand] transition"
              style={{ ['--brand' as any]: BRAND }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">Color</label>
            <input
              type="color"
              name="color"
              defaultValue={perfil.color || BRAND}
              className="h-12 cursor-pointer"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-6">
          <Button
            type="button"
            onClick={onClose}
            variant="secondary"
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            variant="primary"
            className="flex-1"
          >
            {isPending ? 'Guardando…' : 'Guardar Cambios'}
          </Button>
        </div>
      </form>
    </BaseDialog>
  );
}